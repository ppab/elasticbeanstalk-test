# Sensor Data Aggregation Dashboard

This document describes the new aggregation features added to the sensor monitoring system.

## Overview

The aggregation dashboard provides powerful data analysis capabilities for sensor data, allowing you to:

- **Group data by sensor name** and calculate sums, averages, and statistics
- **Group data by time intervals** (1 minute to 1 month)
- **Visualize trends** with interactive charts
- **Filter data** by specific sensors or time ranges

## Features

### 1. Sensor Summary Aggregation
- Groups events by sensor name and time interval
- Calculates sum, count, average, min, and max values
- Shows time buckets for each sensor
- Color-coded by sensor type

### 2. Time Series Analysis
- Visualizes data trends over time
- Interactive bar chart with tooltips
- Filterable by sensor name
- Shows sum, count, average, and sensor count per time interval

### 3. Flexible Time Intervals
- **1m, 5m, 15m, 30m** - For detailed analysis
- **1h, 6h, 12h** - For hourly trends
- **1d, 1w, 1M** - For long-term analysis

### 4. Real-time Updates
- Automatic refresh of aggregation data
- Responsive design for all screen sizes
- Modern UI with smooth animations

## API Endpoints

### Sensor Summary
```
GET /api/aggregations/sensor-summary?timeInterval=1h&limit=1000
```

**Response:**
```json
{
  "success": true,
  "aggregations": {
    "Temperature Sensor 1": {
      "2024-01-01T10:00": {
        "sum": 245.5,
        "count": 3,
        "average": 81.83,
        "min": 45,
        "max": 98,
        "events": [...]
      }
    }
  },
  "timeInterval": "1h",
  "totalSensors": 1
}
```

### Time Series
```
GET /api/aggregations/time-series?timeInterval=1h&sensorName=Temperature Sensor 1&limit=1000
```

**Response:**
```json
{
  "success": true,
  "timeSeries": {
    "2024-01-01T10:00": {
      "sum": 245.5,
      "count": 3,
      "average": 81.83,
      "sensors": ["Temperature Sensor 1"],
      "sensorCount": 1,
      "events": [...]
    }
  },
  "timeInterval": "1h",
  "sensorFilter": "Temperature Sensor 1"
}
```

### Sensor Details
```
GET /api/aggregations/sensor-details?sensorName=Temperature Sensor 1&timeInterval=1h&limit=1000
```

**Response:**
```json
{
  "success": true,
  "sensorName": "Temperature Sensor 1",
  "details": {
    "overall": {
      "totalSum": 245.5,
      "totalCount": 3,
      "totalAverage": 81.83,
      "totalMin": 45,
      "totalMax": 98
    },
    "timeBuckets": {
      "2024-01-01T10:00": {
        "sum": 245.5,
        "count": 3,
        "average": 81.83,
        "min": 45,
        "max": 98,
        "events": [...]
      }
    }
  }
}
```

## Usage

### 1. Access the Dashboard
1. Start the application: `docker-compose up --build`
2. Open http://localhost:80
3. Click on "Aggregation Dashboard" tab

### 2. Generate Sample Data
```bash
node test-aggregation.js
```

This script will:
- Create 5 sample sensors of different types
- Generate 50 events over the last 24 hours
- Test all aggregation endpoints

### 3. Customize Views
- **Time Interval**: Select from 1 minute to 1 month
- **Sensor Filter**: Choose specific sensors or view all
- **Refresh**: Click "Refresh Data" to update aggregations

## Data Flow

```
Events → Redis → Aggregation API → React Dashboard
   ↓
Time Grouping + Sensor Grouping
   ↓
Sum, Count, Average, Min, Max Calculations
   ↓
Interactive Charts & Cards
```

## Technical Implementation

### Backend (Node.js/Express)
- **Aggregation Functions**: Real-time calculation of statistics
- **Time Bucketing**: Flexible time interval grouping
- **Memory Efficient**: Processes data in chunks
- **Error Handling**: Graceful fallbacks for missing data

### Frontend (React)
- **Responsive Design**: Works on desktop and mobile
- **Real-time Updates**: Automatic data refresh
- **Interactive Charts**: Hover tooltips and animations
- **Modern UI**: Glassmorphism design with gradients

### Performance
- **Lazy Loading**: Data loaded on demand
- **Caching**: Redis-based data storage
- **Optimized Queries**: Efficient data retrieval
- **Scalable**: Handles large datasets

## Configuration

### Environment Variables
- `TRANSFORM_DELAY`: Event transformation delay (default: 30000ms)
- `KAFKA_BROKER`: Kafka broker URL
- `REDIS_URL`: Redis connection string

### Time Interval Options
- `1m`: 1 minute
- `5m`: 5 minutes
- `15m`: 15 minutes
- `30m`: 30 minutes
- `1h`: 1 hour
- `6h`: 6 hours
- `12h`: 12 hours
- `1d`: 1 day
- `1w`: 1 week
- `1M`: 1 month

## Troubleshooting

### No Data Showing
1. Check if sensors exist: `GET /api/sensors`
2. Check if events exist: `GET /api/services`
3. Verify time interval selection
4. Check browser console for errors

### Performance Issues
1. Reduce `limit` parameter in API calls
2. Use larger time intervals for big datasets
3. Check Redis memory usage
4. Monitor API response times

### API Errors
1. Check service logs: `docker-compose logs api`
2. Verify Redis connection
3. Check event data format
4. Ensure sensors exist before creating events

## Future Enhancements

- **Export Features**: CSV/JSON data export
- **Advanced Charts**: Line charts, heatmaps
- **Custom Aggregations**: User-defined calculations
- **Real-time Streaming**: WebSocket updates
- **Machine Learning**: Anomaly detection
- **Alerts**: Threshold-based notifications
