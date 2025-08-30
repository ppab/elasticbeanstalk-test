# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-service event processing application designed for AWS Elastic Beanstalk deployment using Docker Compose. The application demonstrates a complete event-driven microservices architecture with Kafka messaging, Redis storage, and real-time web interface.

## Architecture

```
├── web/                    # Flask application service
│   ├── app.py             # Simple Flask web server
│   └── Dockerfile         # Web service container definition
├── api/                   # Express API service (main orchestrator)
│   ├── server.js          # API endpoints and business logic
│   ├── utils/clients.js   # Kafka/Redis client initialization
│   ├── logger.js          # Winston logging configuration
│   └── Dockerfile         # API service container definition
├── service2/              # Express service for data retrieval
│   ├── server.js          # Redis data access endpoints
│   ├── logger.js          # Winston logging configuration
│   └── Dockerfile         # Service2 container definition
├── service3/              # Kafka consumer and event transformer
│   ├── server.js          # Event transformation worker
│   ├── logger.js          # Winston logging configuration
│   └── Dockerfile         # Service3 container definition
├── front/                 # React frontend application
│   ├── src/App.js         # Main React component with dashboard
│   ├── src/App.css        # Application styling
│   ├── public/            # Static assets
│   └── Dockerfile         # Frontend container definition
├── proxy/                 # Nginx reverse proxy service  
│   ├── nginx.conf         # Nginx routing and load balancing
│   └── Dockerfile         # Proxy service container definition
└── docker-compose.yml     # Multi-container application definition
```

### Service Architecture
- **Web Service**: Python 3.12 Flask app on port 5000 (legacy endpoint)
- **API Service**: Node.js Express app on port 3001 (main API layer)
- **Service2**: Node.js Express app on port 3002 (data access layer)
- **Service3**: Node.js Kafka consumer (event transformation worker)
- **Frontend**: React SPA served via Nginx on port 80
- **Nginx Proxy**: Routes traffic and serves React frontend on port 80
- **Kafka**: Apache Kafka 3.7.0 in KRaft mode for event streaming
- **Redis**: Data persistence and caching layer

## Development Commands

### Local Development
```bash
# Build and run the entire application stack
docker-compose up --build

# Run in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Testing Aggregation Features
```bash
# Generate sample data and test aggregation endpoints
node test-aggregation.js

# Test sensor API endpoints
node test-sensors.js
```

### Development Mode with Hot Reloading
```bash
# Run with development overrides for hot reloading
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Run specific services in development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up front api

# View logs for specific service
docker-compose logs -f front
```

### Individual Service Management
```bash
# Build specific service
docker-compose build api
docker-compose build service2
docker-compose build service3
docker-compose build front

# Run specific services
docker-compose up api service2 redis  # Backend only
docker-compose up front nginx-proxy   # Frontend only
```

### Event Processing Flow
1. **Event Creation**: React frontend sends events to `POST /api/ingest`
2. **Event Ingestion**: API service saves to Redis and publishes to Kafka
3. **Event Transformation**: Service3 consumes from Kafka, transforms (30s delay), saves to Redis
4. **Data Display**: Frontend fetches both raw and transformed events via API service

### Sensor Management Flow
1. **Sensor Creation**: React frontend creates sensors via `POST /api/sensors`
2. **Sensor Storage**: API service persists sensor configurations in Redis
3. **Automatic Events**: Active sensors generate events at specified heartbeat intervals
4. **Sensor Control**: Users can start/stop sensors and modify configurations

### Environment Configuration
- **TRANSFORM_DELAY**: Event transformation delay in ms (default: 30000)
- **KAFKA_BROKER**: Kafka broker URL (default: kafka:9092)
- **REDIS_URL**: Redis connection string (default: redis://redis:6379)

## API Endpoints

### API Service (`api:3001`)
- `GET /api/health` - Service health check
- `POST /api/ingest` - Ingest sensor events (requires: date, value, sensorId)
- `GET /api/services` - Fetch all services data including events
- `DELETE /api/events` - Delete all raw events
- `DELETE /api/transformed-events` - Delete all transformed events

### Sensor Management Endpoints (`api:3001`)
- `GET /api/sensors` - Fetch all sensor configurations
- `POST /api/sensors` - Create new sensor (requires: sensorName, sensorType, heartBeat, on)
- `PUT /api/sensors/:sensorId` - Update sensor configuration
- `DELETE /api/sensors/:sensorId` - Delete sensor
- `POST /api/sensors/:sensorId/event` - Generate automatic event for active sensor

### Aggregation Endpoints (`api:3001`)
- `GET /api/aggregations/sensor-summary` - Get sensor data aggregated by sensor name and time interval
  - Query params: `timeInterval` (1m, 5m, 15m, 30m, 1h, 6h, 12h, 1d, 1w, 1M), `limit` (default: 100)
- `GET /api/aggregations/time-series` - Get time series data aggregated by time interval
  - Query params: `timeInterval`, `sensorName` (optional filter), `limit`
- `GET /api/aggregations/sensor-details` - Get detailed statistics for a specific sensor
  - Query params: `sensorName` (required), `timeInterval`, `limit`

### Service2 (`service2:3002`)
- `GET /health` - Service health check  
- `GET /counter` - Increment and return request counter
- `GET /counter/reset` - Reset request counter to 0
- `GET /events` - Fetch latest 10 raw events from Redis
- `GET /transformedEvents` - Fetch latest 10 transformed events from Redis

### Frontend Routes (Nginx Proxy)
- `/` - React dashboard (displays all services, events, and sensors)
- `/aggregation` - Aggregation dashboard (SPA routing)
- `/api/*` - Proxied to API service
- `/flask/*` - Proxied to Flask service
- **SPA Routing**: All client-side routes fallback to index.html

### Frontend Views
- **Main Dashboard**: Original view with services, events, and sensor management
- **Aggregation Dashboard**: New view with sensor data aggregation by time intervals
  - Sensor summary cards with sum, count, average, min/max values
  - Time series chart showing value sums over time
  - Filterable by sensor name and time interval
  - Responsive design with modern UI

## Sensor Configuration

### Sensor Object Structure
```json
{
  "sensorId": 1,
  "sensorName": "Temperature Sensor",
  "sensorType": "gas|electricity|liquid|other",
  "heartBeat": 30,
  "on": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Sensor Types
- **gas**: Gas sensors (temperature, pressure, flow)
- **electricity**: Electrical sensors (voltage, current, power)
- **liquid**: Liquid sensors (flow, level, temperature)
- **other**: Miscellaneous sensors

### Event Schema

#### Manual Event (via `/api/ingest`)
```json
{
  "id": "event_1234567890_abc123",
  "date": "2024-01-01 12:00:00",
  "value": 75,
  "sensorId": 1,
  "sensorName": "Temperature Sensor",
  "sensorType": "gas",
  "ingestedAt": "2024-01-01T12:00:00.000Z",
  "metadata": {
    "sensorHeartbeat": 30,
    "sensorStatus": "active",
    "eventSource": "manual"
  }
}
```

#### Automatic Event (via `/api/sensors/:id/event`)
```json
{
  "id": "event_1234567890_def456",
  "date": "2024-01-01 12:00:00",
  "value": 82,
  "sensorId": 1,
  "sensorName": "Temperature Sensor",
  "sensorType": "gas",
  "ingestedAt": "2024-01-01T12:00:00.000Z",
  "metadata": {
    "sensorHeartbeat": 30,
    "sensorStatus": "active",
    "eventSource": "automatic"
  }
}
```

### Automatic Event Generation
- When a sensor is turned ON, it automatically generates events at the specified heartbeat interval
- Events include random values between 0-100 and the sensor ID
- Events are sent to the standard ingestion pipeline (Redis + Kafka)
- Automatic events are marked with `eventSource: "automatic"` in metadata

## Key Configuration Details

### Nginx Configuration (`proxy/nginx.conf`)
- Routes `/` to React frontend (`front:80`)
- Routes `/api/` to API service (`api:3001`) 
- Routes `/flask/` to Flask service (`web:5000`)
- **SPA Routing Support**: Handles React Router client-side routing
- Static asset caching with proper headers
- Health monitoring for Elastic Beanstalk with timestamped logs
- WebSocket upgrade support for real-time features
- **Development Mode**: Enhanced configuration for hot reloading

### Kafka Configuration (KRaft Mode)
- Single-node Kafka cluster without Zookeeper dependency
- Topic: `sensor-events` for event streaming
- Consumer group: `service3-transformers`
- Persistent storage via named volume `kafka_data`

### Redis Storage
- **Events**: Stored as JSON strings in Redis list `events`
- **Transformed Events**: Stored as JSON strings in Redis list `transformedEvents`
- **Sensors**: Stored as JSON array in Redis key `sensors`
- **Service Counters**: Various service state data

### Docker Images & Dependencies
- **Node.js services**: `public.ecr.aws/docker/library/node:18-alpine` with pnpm
- **React frontend**: Multi-stage build with Nginx serving static files
- **Flask service**: `public.ecr.aws/docker/library/python:3.12`
- **Kafka**: `apache/kafka:3.7.0` (KRaft mode)
- **Redis**: `public.ecr.aws/docker/library/redis:7-alpine`

### Port Configuration
- **External access**: Port 80 (nginx-proxy)
- **API service**: Port 3001 (internal)
- **Service2**: Port 3002 (internal)
- **Flask service**: Port 5000 (internal)
- **Frontend**: Port 80 (internal, served via nginx)
- **Kafka**: Port 9092 (internal)
- **Redis**: Port 6379 (internal)

## Logging & Monitoring

All Node.js services use Winston for structured logging:
- Console output with colors for development
- JSON format with timestamps and metadata
- Service identification in log metadata
- Request logging middleware for HTTP endpoints
- Error tracking with stack traces

## Deployment Notes

This application is structured for AWS Elastic Beanstalk deployment:
- Multi-service Docker Compose architecture
- Health monitoring compatible with EB health checks
- Persistent data volumes for Kafka and Redis
- Environment variable configuration for service URLs
- ECR public images for better AWS compatibility
- Nginx access logs formatted for EB monitoring