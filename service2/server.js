const express = require('express');
const { createClient } = require('redis');

const app = express();
const port = process.env.PORT || 3002;

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

let redisClient;

async function initRedis() {
  try {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
}

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'Service2 running', timestamp: new Date().toISOString() });
});

app.get('/counter', async (req, res) => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      throw new Error('Redis client not connected');
    }

    const count = await redisClient.incr('request_counter');
    
    res.json({
      service: 'service2',
      requestCount: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Redis error:', error);
    res.status(500).json({
      error: 'Failed to increment counter',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/counter/reset', async (req, res) => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      throw new Error('Redis client not connected');
    }

    await redisClient.del('request_counter');
    
    res.json({
      message: 'Counter reset to 0',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Redis error:', error);
    res.status(500).json({
      error: 'Failed to reset counter',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

initRedis().then(() => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Service2 listening on port ${port}`);
    console.log(`Redis URL: ${REDIS_URL}`);
  });
});