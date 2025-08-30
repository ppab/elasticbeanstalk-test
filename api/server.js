const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001;

const FLASK_URL = process.env.FLASK_URL || 'http://web:5000';
const SERVICE2_URL = process.env.SERVICE2_URL || 'http://service2:3002';

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
	res.json({ status: 'API service running', timestamp: new Date().toISOString() });
});

app.get('/api/services', async (req, res) => {
	try {
		const responses = await Promise.allSettled([
			axios.get(`${FLASK_URL}/`),
			axios.get(`${SERVICE2_URL}/counter`)
		]);

		const flaskResponse = responses[0];
		const service2Response = responses[1];

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
			}
		};

		res.json(result);
	} catch (error) {
		res.status(500).json({
			error: 'Failed to fetch services data',
			message: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

app.listen(port, '0.0.0.0', () => {
	console.log(`API service listening on port ${port}`);
	console.log(`Flask URL: ${FLASK_URL}`);
	console.log(`Service2 URL: ${SERVICE2_URL}`);
});
