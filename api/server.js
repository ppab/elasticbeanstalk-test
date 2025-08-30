const express = require('express');
const cors = require('cors');
const axios = require('axios');
const logger = require('./logger');
const { initializeClients } = require('./utils/clients');

const app = express();
const port = process.env.PORT || 3001;

const FLASK_URL = process.env.FLASK_URL || 'http://web:5000';
const SERVICE2_URL = process.env.SERVICE2_URL || 'http://service2:3002';

let kafkaProducer;
let redisClient;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
	logger.info(`${req.method} ${req.path}`, {
		ip: req.ip,
		userAgent: req.get('user-agent')
	});
	next();
});

app.get('/api/health', (req, res) => {
	res.json({ status: 'API service running', timestamp: new Date().toISOString() });
});

app.post('/api/ingest', async (req, res) => {
	try {
		const { date, value, sensorId } = req.body;

		if (!date || value === undefined || !sensorId) {
			return res.status(400).json({
				error: 'Missing required fields',
				required: ['date', 'value', 'sensorId'],
				received: req.body
			});
		}

		const event = {
			id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			date,
			value,
			sensorId,
			ingestedAt: new Date().toISOString()
		};

		logger.info('Ingesting event', { event });

		// Save to Redis
		await redisClient.lPush('events', JSON.stringify(event));

		// Send to Kafka
		await kafkaProducer.send({
			topic: 'sensor-events',
			messages: [{
				key: event.id,
				value: JSON.stringify(event)
			}]
		});

		logger.info('Event ingested successfully', { eventId: event.id });

		res.json({
			success: true,
			eventId: event.id,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		logger.error('Failed to ingest event', { error: error.message, stack: error.stack });
		res.status(500).json({
			error: 'Failed to ingest event',
			message: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

app.get('/api/services', async (req, res) => {
	try {
		logger.info('Fetching services data', { flask: FLASK_URL, service2: SERVICE2_URL });

		const responses = await Promise.allSettled([
			axios.get(`${FLASK_URL}/`),
			axios.get(`${SERVICE2_URL}/counter`),
			axios.get(`${SERVICE2_URL}/events`),
			axios.get(`${SERVICE2_URL}/transformedEvents`)
		]);

		const flaskResponse = responses[0];
		const service2Response = responses[1];
		const eventsResponse = responses[2];
		const transformedEventsResponse = responses[3];

		if (flaskResponse.status === 'rejected') {
			logger.error('Flask service error', { error: flaskResponse.reason.message });
		}
		if (service2Response.status === 'rejected') {
			logger.error('Service2 error', { error: service2Response.reason.message });
		}
		if (eventsResponse.status === 'rejected') {
			logger.error('Events fetch error', { error: eventsResponse.reason.message });
		}
		if (transformedEventsResponse.status === 'rejected') {
			logger.error('Transformed events fetch error', { error: transformedEventsResponse.reason.message });
		}

		const result = {
			timestamp: new Date().toISOString(),
			services: {
				flask: {
					status: flaskResponse.status === 'fulfilled' ? 'success' : 'error',
					data: flaskResponse.status === 'fulfilled' ? flaskResponse.value.data : flaskResponse.reason.message
				},
				service2: {
					status: service2Response.status === 'fulfilled' ? 'success' : 'error',
					data: service2Response.status === 'fulfilled' ? service2Response.value.data : service2Response.reason.message
				}
			},
			events: {
				status: eventsResponse.status === 'fulfilled' ? 'success' : 'error',
				data: eventsResponse.status === 'fulfilled' ? eventsResponse.value.data : { events: [] }
			},
			transformedEvents: {
				status: transformedEventsResponse.status === 'fulfilled' ? 'success' : 'error',
				data: transformedEventsResponse.status === 'fulfilled' ? transformedEventsResponse.value.data : { transformedEvents: [] }
			}
		};

		logger.info('Services data fetched successfully', {
			flaskStatus: result.services.flask.status,
			service2Status: result.services.service2.status,
			eventsCount: result.events.data.events?.length || 0,
			transformedEventsCount: result.transformedEvents.data.transformedEvents?.length || 0
		});

		res.json(result);
	} catch (error) {
		logger.error('Failed to fetch services data', { error: error.message, stack: error.stack });
		res.status(500).json({
			error: 'Failed to fetch services data',
			message: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

async function startServer() {
	try {
		// Initialize clients
		const clients = await initializeClients();
		kafkaProducer = clients.kafkaProducer;
		redisClient = clients.redis;

		app.listen(port, '0.0.0.0', () => {
			logger.info('API service started', {
				port: port,
				flaskUrl: FLASK_URL,
				service2Url: SERVICE2_URL,
				environment: process.env.NODE_ENV || 'development'
			});
		});
	} catch (error) {
		logger.error('Failed to start API service', { error: error.message });
		process.exit(1);
	}
}

startServer();
