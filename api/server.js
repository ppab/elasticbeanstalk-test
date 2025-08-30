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

// Sensor CRUD endpoints
app.get('/api/sensors', async (req, res) => {
	try {
		const sensorsJson = await redisClient.get('sensors');
		const sensors = sensorsJson ? JSON.parse(sensorsJson) : [];
		
		logger.info('Fetched sensors', { count: sensors.length });
		res.json({
			success: true,
			sensors: sensors,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		logger.error('Failed to fetch sensors', { error: error.message, stack: error.stack });
		res.status(500).json({
			error: 'Failed to fetch sensors',
			message: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

app.post('/api/sensors', async (req, res) => {
	try {
		const { sensorName, sensorType, heartBeat, on } = req.body;

		if (!sensorName || !sensorType || heartBeat === undefined || on === undefined) {
			return res.status(400).json({
				error: 'Missing required fields',
				required: ['sensorName', 'sensorType', 'heartBeat', 'on'],
				received: req.body
			});
		}

		// Get existing sensors
		const sensorsJson = await redisClient.get('sensors');
		const sensors = sensorsJson ? JSON.parse(sensorsJson) : [];
		
		// Generate new sensor ID
		const sensorId = sensors.length > 0 ? Math.max(...sensors.map(s => s.sensorId)) + 1 : 1;
		
		const newSensor = {
			sensorId,
			sensorName,
			sensorType,
			heartBeat,
			on,
			createdAt: new Date().toISOString()
		};

		// Add to sensors list
		sensors.push(newSensor);
		
		// Save to Redis
		await redisClient.set('sensors', JSON.stringify(sensors));

		logger.info('Created new sensor', { sensor: newSensor });

		res.json({
			success: true,
			sensor: newSensor,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		logger.error('Failed to create sensor', { error: error.message, stack: error.stack });
		res.status(500).json({
			error: 'Failed to create sensor',
			message: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

app.put('/api/sensors/:sensorId', async (req, res) => {
	try {
		const sensorId = parseInt(req.params.sensorId);
		const { sensorName, sensorType, heartBeat, on } = req.body;

		if (!sensorName || !sensorType || heartBeat === undefined || on === undefined) {
			return res.status(400).json({
				error: 'Missing required fields',
				required: ['sensorName', 'sensorType', 'heartBeat', 'on'],
				received: req.body
			});
		}

		// Get existing sensors
		const sensorsJson = await redisClient.get('sensors');
		const sensors = sensorsJson ? JSON.parse(sensorsJson) : [];
		
		// Find and update sensor
		const sensorIndex = sensors.findIndex(s => s.sensorId === sensorId);
		if (sensorIndex === -1) {
			return res.status(404).json({
				error: 'Sensor not found',
				sensorId: sensorId,
				timestamp: new Date().toISOString()
			});
		}

		const updatedSensor = {
			...sensors[sensorIndex],
			sensorName,
			sensorType,
			heartBeat,
			on,
			updatedAt: new Date().toISOString()
		};

		sensors[sensorIndex] = updatedSensor;
		
		// Save to Redis
		await redisClient.set('sensors', JSON.stringify(sensors));

		logger.info('Updated sensor', { sensor: updatedSensor });

		res.json({
			success: true,
			sensor: updatedSensor,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		logger.error('Failed to update sensor', { error: error.message, stack: error.stack });
		res.status(500).json({
			error: 'Failed to update sensor',
			message: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

app.delete('/api/sensors/:sensorId', async (req, res) => {
	try {
		const sensorId = parseInt(req.params.sensorId);

		// Get existing sensors
		const sensorsJson = await redisClient.get('sensors');
		const sensors = sensorsJson ? JSON.parse(sensorsJson) : [];
		
		// Find and remove sensor
		const sensorIndex = sensors.findIndex(s => s.sensorId === sensorId);
		if (sensorIndex === -1) {
			return res.status(404).json({
				error: 'Sensor not found',
				sensorId: sensorId,
				timestamp: new Date().toISOString()
			});
		}

		const deletedSensor = sensors[sensorIndex];
		sensors.splice(sensorIndex, 1);
		
		// Save to Redis
		await redisClient.set('sensors', JSON.stringify(sensors));

		logger.info('Deleted sensor', { sensor: deletedSensor });

		res.json({
			success: true,
			sensor: deletedSensor,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		logger.error('Failed to delete sensor', { error: error.message, stack: error.stack });
		res.status(500).json({
			error: 'Failed to delete sensor',
			message: error.message,
			timestamp: new Date().toISOString()
		});
	}
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

		// Validate sensor exists and get sensor info
		const sensorsJson = await redisClient.get('sensors');
		const sensors = sensorsJson ? JSON.parse(sensorsJson) : [];
		const sensor = sensors.find(s => s.sensorId === parseInt(sensorId));
		
		if (!sensor) {
			return res.status(404).json({
				error: 'Sensor not found',
				sensorId: sensorId,
				timestamp: new Date().toISOString()
			});
		}

		// Enhanced event schema with sensor metadata
		const event = {
			id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			date,
			value,
			sensorId: parseInt(sensorId),
			sensorName: sensor.sensorName,
			sensorType: sensor.sensorType,
			ingestedAt: new Date().toISOString(),
			metadata: {
				sensorHeartbeat: sensor.heartBeat,
				sensorStatus: sensor.on ? 'active' : 'inactive',
				eventSource: 'manual' // or 'automatic' for heartbeat-generated events
			}
		};

		logger.info('Ingesting event', { 
			eventId: event.id,
			sensorId: event.sensorId,
			sensorName: event.sensorName,
			value: event.value
		});

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

		logger.info('Event ingested successfully', { 
			eventId: event.id,
			sensorId: event.sensorId,
			timestamp: new Date().toISOString()
		});

		res.json({
			success: true,
			eventId: event.id,
			sensorId: event.sensorId,
			sensorName: event.sensorName,
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

// Automatic sensor event generation endpoint
app.post('/api/sensors/:sensorId/event', async (req, res) => {
	try {
		const sensorId = parseInt(req.params.sensorId);
		const { value } = req.body;

		// Validate sensor exists and is active
		const sensorsJson = await redisClient.get('sensors');
		const sensors = sensorsJson ? JSON.parse(sensorsJson) : [];
		const sensor = sensors.find(s => s.sensorId === sensorId);
		
		if (!sensor) {
			return res.status(404).json({
				error: 'Sensor not found',
				sensorId: sensorId,
				timestamp: new Date().toISOString()
			});
		}

		if (!sensor.on) {
			return res.status(400).json({
				error: 'Sensor is not active',
				sensorId: sensorId,
				sensorName: sensor.sensorName,
				timestamp: new Date().toISOString()
			});
		}

		// Generate automatic event
		const event = {
			id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			date: new Date().toISOString().replace('T', ' ').substring(0, 19),
			value: value !== undefined ? value : Math.floor(Math.random() * 100),
			sensorId: sensorId,
			sensorName: sensor.sensorName,
			sensorType: sensor.sensorType,
			ingestedAt: new Date().toISOString(),
			metadata: {
				sensorHeartbeat: sensor.heartBeat,
				sensorStatus: 'active',
				eventSource: 'automatic'
			}
		};

		logger.info('Generating automatic sensor event', { 
			eventId: event.id,
			sensorId: event.sensorId,
			sensorName: event.sensorName,
			value: event.value
		});

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

		logger.info('Automatic event generated successfully', { 
			eventId: event.id,
			sensorId: event.sensorId,
			timestamp: new Date().toISOString()
		});

		res.json({
			success: true,
			eventId: event.id,
			sensorId: event.sensorId,
			sensorName: event.sensorName,
			value: event.value,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		logger.error('Failed to generate automatic event', { error: error.message, stack: error.stack });
		res.status(500).json({
			error: 'Failed to generate automatic event',
			message: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

// Bulk delete endpoints
app.delete('/api/events', async (req, res) => {
	try {
		// Delete all raw events
		await redisClient.del('events');
		
		logger.info('All raw events deleted');
		
		res.json({
			success: true,
			message: 'All raw events deleted successfully',
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		logger.error('Failed to delete raw events', { error: error.message, stack: error.stack });
		res.status(500).json({
			error: 'Failed to delete raw events',
			message: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

app.delete('/api/transformed-events', async (req, res) => {
	try {
		// Delete all transformed events
		await redisClient.del('transformedEvents');
		
		logger.info('All transformed events deleted');
		
		res.json({
			success: true,
			message: 'All transformed events deleted successfully',
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		logger.error('Failed to delete transformed events', { error: error.message, stack: error.stack });
		res.status(500).json({
			error: 'Failed to delete transformed events',
			message: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

// Aggregation endpoints
app.get('/api/aggregations/sensor-summary', async (req, res) => {
	try {
		const { timeInterval = '1h', limit = 100 } = req.query;
		
		// Get all events from Redis
		const eventsJson = await redisClient.lRange('events', 0, limit - 1);
		const events = eventsJson.map(event => JSON.parse(event));
		
		// Group by sensor name and time interval
		const aggregations = aggregateEventsBySensorAndTime(events, timeInterval);
		
		logger.info('Sensor summary aggregation generated', { 
			sensorCount: Object.keys(aggregations).length,
			timeInterval: timeInterval
		});
		
		res.json({
			success: true,
			aggregations: aggregations,
			timeInterval: timeInterval,
			totalSensors: Object.keys(aggregations).length,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		logger.error('Failed to generate sensor summary', { error: error.message, stack: error.stack });
		res.status(500).json({
			error: 'Failed to generate sensor summary',
			message: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

app.get('/api/aggregations/time-series', async (req, res) => {
	try {
		const { timeInterval = '1h', sensorName, limit = 100 } = req.query;
		
		// Get all events from Redis
		const eventsJson = await redisClient.lRange('events', 0, limit - 1);
		let events = eventsJson.map(event => JSON.parse(event));
		
		// Filter by sensor name if provided
		if (sensorName) {
			events = events.filter(event => event.sensorName === sensorName);
		}
		
		// Group by time interval
		const timeSeries = aggregateEventsByTime(events, timeInterval);
		
		logger.info('Time series aggregation generated', { 
			timeIntervals: Object.keys(timeSeries).length,
			timeInterval: timeInterval,
			sensorFilter: sensorName || 'all'
		});
		
		res.json({
			success: true,
			timeSeries: timeSeries,
			timeInterval: timeInterval,
			sensorFilter: sensorName || 'all',
			totalIntervals: Object.keys(timeSeries).length,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		logger.error('Failed to generate time series', { error: error.message, stack: error.stack });
		res.status(500).json({
			error: 'Failed to generate time series',
			message: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

app.get('/api/aggregations/sensor-details', async (req, res) => {
	try {
		const { sensorName, timeInterval = '1h', limit = 100 } = req.query;
		
		if (!sensorName) {
			return res.status(400).json({
				error: 'Missing required parameter: sensorName',
				timestamp: new Date().toISOString()
			});
		}
		
		// Get all events from Redis
		const eventsJson = await redisClient.lRange('events', 0, limit - 1);
		const events = eventsJson.map(event => JSON.parse(event));
		
		// Filter by sensor name
		const sensorEvents = events.filter(event => event.sensorName === sensorName);
		
		if (sensorEvents.length === 0) {
			return res.status(404).json({
				error: 'No events found for sensor',
				sensorName: sensorName,
				timestamp: new Date().toISOString()
			});
		}
		
		// Calculate detailed statistics
		const details = calculateSensorDetails(sensorEvents, timeInterval);
		
		logger.info('Sensor details generated', { 
			sensorName: sensorName,
			eventCount: sensorEvents.length,
			timeInterval: timeInterval
		});
		
		res.json({
			success: true,
			sensorName: sensorName,
			details: details,
			timeInterval: timeInterval,
			totalEvents: sensorEvents.length,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		logger.error('Failed to generate sensor details', { error: error.message, stack: error.stack });
		res.status(500).json({
			error: 'Failed to generate sensor details',
			message: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

// Helper functions for aggregations
function aggregateEventsBySensorAndTime(events, timeInterval) {
	const aggregations = {};
	
	events.forEach(event => {
		const sensorName = event.sensorName;
		const timeKey = getTimeKey(event.date, timeInterval);
		
		if (!aggregations[sensorName]) {
			aggregations[sensorName] = {};
		}
		
		if (!aggregations[sensorName][timeKey]) {
			aggregations[sensorName][timeKey] = {
				sum: 0,
				count: 0,
				average: 0,
				min: Infinity,
				max: -Infinity,
				events: []
			};
		}
		
		const value = parseFloat(event.value) || 0;
		const bucket = aggregations[sensorName][timeKey];
		
		bucket.sum += value;
		bucket.count += 1;
		bucket.min = Math.min(bucket.min, value);
		bucket.max = Math.max(bucket.max, value);
		bucket.events.push({
			id: event.id,
			date: event.date,
			value: value,
			sensorId: event.sensorId
		});
	});
	
	// Calculate averages
	Object.keys(aggregations).forEach(sensorName => {
		Object.keys(aggregations[sensorName]).forEach(timeKey => {
			const bucket = aggregations[sensorName][timeKey];
			bucket.average = bucket.count > 0 ? bucket.sum / bucket.count : 0;
		});
	});
	
	return aggregations;
}

function aggregateEventsByTime(events, timeInterval) {
	const timeSeries = {};
	
	events.forEach(event => {
		const timeKey = getTimeKey(event.date, timeInterval);
		
		if (!timeSeries[timeKey]) {
			timeSeries[timeKey] = {
				sum: 0,
				count: 0,
				average: 0,
				sensors: new Set(),
				events: []
			};
		}
		
		const value = parseFloat(event.value) || 0;
		const bucket = timeSeries[timeKey];
		
		bucket.sum += value;
		bucket.count += 1;
		bucket.sensors.add(event.sensorName);
		bucket.events.push({
			id: event.id,
			date: event.date,
			value: value,
			sensorName: event.sensorName,
			sensorId: event.sensorId
		});
	});
	
	// Calculate averages and convert sensors Set to Array
	Object.keys(timeSeries).forEach(timeKey => {
		const bucket = timeSeries[timeKey];
		bucket.average = bucket.count > 0 ? bucket.sum / bucket.count : 0;
		bucket.sensors = Array.from(bucket.sensors);
		bucket.sensorCount = bucket.sensors.length;
	});
	
	return timeSeries;
}

function calculateSensorDetails(events, timeInterval) {
	const timeBuckets = {};
	
	events.forEach(event => {
		const timeKey = getTimeKey(event.date, timeInterval);
		
		if (!timeBuckets[timeKey]) {
			timeBuckets[timeKey] = {
				sum: 0,
				count: 0,
				average: 0,
				min: Infinity,
				max: -Infinity,
				events: []
			};
		}
		
		const value = parseFloat(event.value) || 0;
		const bucket = timeBuckets[timeKey];
		
		bucket.sum += value;
		bucket.count += 1;
		bucket.min = Math.min(bucket.min, value);
		bucket.max = Math.max(bucket.max, value);
		bucket.events.push({
			id: event.id,
			date: event.date,
			value: value
		});
	});
	
	// Calculate averages
	Object.keys(timeBuckets).forEach(timeKey => {
		const bucket = timeBuckets[timeKey];
		bucket.average = bucket.count > 0 ? bucket.sum / bucket.count : 0;
	});
	
	// Calculate overall statistics
	const allValues = events.map(e => parseFloat(e.value) || 0);
	const totalSum = allValues.reduce((sum, val) => sum + val, 0);
	const totalCount = allValues.length;
	const totalAverage = totalCount > 0 ? totalSum / totalCount : 0;
	const totalMin = Math.min(...allValues);
	const totalMax = Math.max(...allValues);
	
	return {
		overall: {
			totalSum: totalSum,
			totalCount: totalCount,
			totalAverage: totalAverage,
			totalMin: totalMin,
			totalMax: totalMax
		},
		timeBuckets: timeBuckets
	};
}

function getTimeKey(dateString, interval) {
	const date = new Date(dateString);
	
	switch (interval) {
		case '1m':
			return date.toISOString().substring(0, 16); // YYYY-MM-DDTHH:MM
		case '5m':
			const minutes = Math.floor(date.getMinutes() / 5) * 5;
			return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
		case '15m':
			const minutes15 = Math.floor(date.getMinutes() / 15) * 15;
			return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(minutes15).padStart(2, '0')}`;
		case '30m':
			const minutes30 = Math.floor(date.getMinutes() / 30) * 30;
			return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(minutes30).padStart(2, '0')}`;
		case '1h':
			return date.toISOString().substring(0, 13) + ':00'; // YYYY-MM-DDTHH:00
		case '6h':
			const hour6 = Math.floor(date.getHours() / 6) * 6;
			return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(hour6).padStart(2, '0')}:00`;
		case '12h':
			const hour12 = Math.floor(date.getHours() / 12) * 12;
			return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(hour12).padStart(2, '0')}:00`;
		case '1d':
			return date.toISOString().substring(0, 10); // YYYY-MM-DD
		case '1w':
			const weekStart = new Date(date);
			weekStart.setDate(date.getDate() - date.getDay());
			return weekStart.toISOString().substring(0, 10);
		case '1M':
			return date.toISOString().substring(0, 7); // YYYY-MM
		default:
			return date.toISOString().substring(0, 13) + ':00'; // Default to 1h
	}
}

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
