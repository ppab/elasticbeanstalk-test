const { Kafka } = require('kafkajs');
const { createClient } = require('redis');
const logger = require('./logger');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const TRANSFORM_DELAY = parseInt(process.env.TRANSFORM_DELAY) || 10000;

let redisClient;
let kafkaConsumer;

// Initialize Kafka
const kafka = new Kafka({
	clientId: 'service3-transformer',
	brokers: [KAFKA_BROKER],
	logLevel: 2 // INFO level
});

async function initializeClients() {
	try {
		// Initialize Redis
		redisClient = createClient({ url: REDIS_URL });
		redisClient.on('error', (err) => logger.error('Redis Client Error', { error: err.message }));
		await redisClient.connect();
		logger.info('Connected to Redis', { url: REDIS_URL });

		// Initialize Kafka Consumer with retry logic
		kafkaConsumer = kafka.consumer({
			groupId: 'service3-transformers',
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
				await kafkaConsumer.connect();
				await kafkaConsumer.subscribe({ topic: 'sensor-events' });
				connected = true;
				logger.info('Connected to Kafka and subscribed to sensor-events', { broker: KAFKA_BROKER });
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

	} catch (error) {
		logger.error('Failed to initialize clients', { error: error.message });
		throw error;
	}
}

async function transformEvent(event) {
	return new Promise((resolve) => {
		logger.info(`Starting transformation for event ${event.id}, waiting ${TRANSFORM_DELAY}ms`);

		setTimeout(() => {
			const transformedEvent = {
				...event,
				transformed: true,
				transformedAt: new Date().toISOString()
			};

			logger.info(`Transformation completed for event ${event.id}`);
			resolve(transformedEvent);
		}, TRANSFORM_DELAY);
	});
}

async function processMessage(message) {
	try {
		const event = JSON.parse(message.value.toString());
		logger.info('Processing event', { eventId: event.id });

		// Transform the event (with configurable delay)
		const transformedEvent = await transformEvent(event);

		// Save transformed event to Redis
		await redisClient.lPush('transformedEvents', JSON.stringify(transformedEvent));

		logger.info('Event transformed and saved', {
			eventId: transformedEvent.id,
			transformedAt: transformedEvent.transformedAt
		});

	} catch (error) {
		logger.error('Failed to process message', {
			error: error.message,
			message: message.value.toString()
		});
	}
}

async function startConsumer() {
	try {
		await kafkaConsumer.run({
			eachMessage: async ({ topic, partition, message }) => {
				logger.debug('Received message', {
					topic,
					partition,
					offset: message.offset,
					key: message.key?.toString()
				});

				await processMessage(message);
			},
		});

		logger.info('Kafka consumer started successfully');
	} catch (error) {
		logger.error('Failed to start consumer', { error: error.message });
		throw error;
	}
}

async function shutdown() {
	logger.info('Shutting down service3...');

	try {
		if (kafkaConsumer) {
			await kafkaConsumer.disconnect();
			logger.info('Kafka consumer disconnected');
		}

		if (redisClient) {
			await redisClient.quit();
			logger.info('Redis client disconnected');
		}
	} catch (error) {
		logger.error('Error during shutdown', { error: error.message });
	}

	process.exit(0);
}

// Handle graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function start() {
	try {
		logger.info('Starting Service3 transformer', {
			kafkaBroker: KAFKA_BROKER,
			redisUrl: REDIS_URL,
			transformDelay: TRANSFORM_DELAY
		});

		await initializeClients();
		await startConsumer();

	} catch (error) {
		logger.error('Failed to start Service3', { error: error.message });
		process.exit(1);
	}
}

start();
