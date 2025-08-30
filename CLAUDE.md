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

### Environment Configuration
- **TRANSFORM_DELAY**: Event transformation delay in ms (default: 30000)
- **KAFKA_BROKER**: Kafka broker URL (default: kafka:9092)
- **REDIS_URL**: Redis connection string (default: redis://redis:6379)

## API Endpoints

### API Service (`api:3001`)
- `GET /api/health` - Service health check
- `POST /api/ingest` - Ingest sensor events (requires: date, value, sensorId)
- `GET /api/services` - Fetch all services data including events

### Service2 (`service2:3002`)
- `GET /health` - Service health check  
- `GET /counter` - Increment and return request counter
- `GET /counter/reset` - Reset request counter to 0
- `GET /events` - Fetch latest 10 raw events from Redis
- `GET /transformedEvents` - Fetch latest 10 transformed events from Redis

### Frontend Routes (Nginx Proxy)
- `/` - React dashboard (displays all services and events)
- `/api/*` - Proxied to API service
- `/flask/*` - Proxied to Flask service

## Key Configuration Details

### Nginx Configuration (`proxy/nginx.conf`)
- Routes `/` to React frontend (`front:80`)
- Routes `/api/` to API service (`api:3001`) 
- Routes `/flask/` to Flask service (`web:5000`)
- Health monitoring for Elastic Beanstalk with timestamped logs
- WebSocket upgrade support for real-time features

### Kafka Configuration (KRaft Mode)
- Single-node Kafka cluster without Zookeeper dependency
- Topic: `sensor-events` for event streaming
- Consumer group: `service3-transformers`
- Persistent storage via named volume `kafka_data`

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