const express = require('express');
const { createClient } = require('redis');
const logger = require('./logger');

const app = express();
const port = process.env.PORT || 3002;

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

let redisClient;

async function initRedis() {
  try {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', (err) => logger.error('Redis Client Error', { error: err.message }));
    await redisClient.connect();
    logger.info('Connected to Redis', { url: REDIS_URL });
  } catch (error) {
    logger.error('Failed to connect to Redis', { error: error.message, url: REDIS_URL });
  }
}

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'Service2 running', timestamp: new Date().toISOString() });
});

app.get('/counter', async (req, res) => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      throw new Error('Redis client not connected');
    }

    const count = await redisClient.incr('request_counter');
    
    logger.info('Counter incremented', { count });
    
    res.json({
      service: 'service2',
      requestCount: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to increment counter', { error: error.message });
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
    
    logger.info('Counter reset to 0');
    
    res.json({
      message: 'Counter reset to 0',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to reset counter', { error: error.message });
    res.status(500).json({
      error: 'Failed to reset counter',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/events', async (req, res) => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      throw new Error('Redis client not connected');
    }

    // Get latest 10 events
    const events = await redisClient.lRange('events', 0, 9);
    const parsedEvents = events.map(event => JSON.parse(event));
    
    logger.info('Events retrieved', { count: parsedEvents.length });
    
    res.json({
      service: 'service2',
      events: parsedEvents,
      count: parsedEvents.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get events', { error: error.message });
    res.status(500).json({
      error: 'Failed to get events',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/transformedEvents', async (req, res) => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      throw new Error('Redis client not connected');
    }

    // Get latest 10 transformed events
    const transformedEvents = await redisClient.lRange('transformedEvents', 0, 9);
    const parsedEvents = transformedEvents.map(event => JSON.parse(event));
    
    logger.info('Transformed events retrieved', { count: parsedEvents.length });
    
    res.json({
      service: 'service2',
      transformedEvents: parsedEvents,
      count: parsedEvents.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get transformed events', { error: error.message });
    res.status(500).json({
      error: 'Failed to get transformed events',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

initRedis().then(() => {
  app.listen(port, '0.0.0.0', () => {
    logger.info('Service2 started', {
      port: port,
      redisUrl: REDIS_URL,
      environment: process.env.NODE_ENV || 'development'
    });
  });
});