const { Kafka } = require('kafkajs');
const { createClient } = require('redis');
const logger = require('../logger');

// Kafka client
const kafka = new Kafka({
  clientId: 'api-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
  logLevel: 2 // INFO level
});

// Redis client
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379'
});

redis.on('error', (err) => logger.error('Redis Client Error', { error: err.message }));

async function initializeClients() {
  try {
    // Initialize Redis
    await redis.connect();
    logger.info('Connected to Redis', { url: process.env.REDIS_URL || 'redis://redis:6379' });

    // Initialize Kafka Producer with retry logic
    const producer = kafka.producer({
      retry: {
        initialRetryTime: 5000,
        retries: 8
      }
    });

    let connected = false;
    let retries = 0;
    const maxRetries = 10;
    
    while (!connected && retries < maxRetries) {
      try {
        await producer.connect();
        connected = true;
        logger.info('Connected to Kafka', { broker: process.env.KAFKA_BROKER || 'kafka:9092' });
      } catch (error) {
        retries++;
        logger.warn(`Kafka connection attempt ${retries} failed, retrying in 10s...`, { 
          error: error.message,
          retries: `${retries}/${maxRetries}`
        });
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 10000));
        } else {
          throw error;
        }
      }
    }

    return { redis, kafkaProducer: producer };
  } catch (error) {
    logger.error('Failed to initialize clients', { error: error.message });
    throw error;
  }
}

module.exports = { kafka, redis, initializeClients };