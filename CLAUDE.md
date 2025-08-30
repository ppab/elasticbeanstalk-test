# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a containerized Flask web application designed for deployment on AWS Elastic Beanstalk using Docker Compose. The application consists of two services: a Flask web server and an Nginx reverse proxy.

## Architecture

```
├── web/                    # Flask application service
│   ├── app.py             # Main Flask application
│   └── Dockerfile         # Web service container definition
├── proxy/                 # Nginx reverse proxy service  
│   ├── nginx.conf         # Nginx configuration with EB health monitoring
│   └── Dockerfile         # Proxy service container definition
└── docker-compose.yml     # Multi-container application definition
```

### Service Architecture
- **Web Service**: Python 3.12 Flask app running on port 5000 (internal)
- **Nginx Proxy**: Reverse proxy exposing port 80, routing traffic to Flask app
- **Volume Mapping**: Nginx logs mounted to `/var/log/nginx` for monitoring

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
docker-compose build web
docker-compose build nginx-proxy

# Run specific service
docker-compose up web
docker-compose up nginx-proxy
```

### Flask Development
The Flask app uses development server by default. To modify the Flask application:
- Edit `web/app.py` for application logic
- Flask dependencies are installed via `pip install` in the Dockerfile
- Current dependency: Flask==3.1.1

## Key Configuration Details

### Nginx Configuration (`proxy/nginx.conf`)
- Health monitoring configured for Elastic Beanstalk with custom log format
- Logs written to timestamped files: `/var/log/nginx/healthd/application.log.$year-$month-$day-$hour`
- Upstream server configured as `web:5000` (Docker Compose service name)
- WebSocket upgrade support included

### Docker Images
- Web service: `public.ecr.aws/docker/library/python:3.12`
- Proxy service: `public.ecr.aws/nginx/nginx:alpine`

### Port Configuration
- External access: Port 80 (nginx-proxy)
- Internal Flask: Port 5000 (exposed, not published)
- Service communication via Docker Compose network

## Deployment Notes

This application is structured for AWS Elastic Beanstalk deployment:
- Uses Docker Compose format compatible with EB
- Nginx health monitoring logs are Elastic Beanstalk compatible
- Volume mapping preserves logs for EB health checks
- Uses AWS ECR public images for better compatibility