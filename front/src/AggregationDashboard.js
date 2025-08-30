import React, { useState, useEffect } from 'react';
import './AggregationDashboard.css';

function AggregationDashboard() {
  const [aggregationData, setAggregationData] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState(null);
  const [selectedSensor, setSelectedSensor] = useState('');
  const [timeInterval, setTimeInterval] = useState('1h');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [sensors, setSensors] = useState([]);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:80';

  const timeIntervals = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '30m', label: '30 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '6h', label: '6 Hours' },
    { value: '12h', label: '12 Hours' },
    { value: '1d', label: '1 Day' },
    { value: '1w', label: '1 Week' },
    { value: '1M', label: '1 Month' }
  ];

  const fetchSensors = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sensors`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSensors(data.sensors || []);
    } catch (err) {
      console.error('Failed to fetch sensors:', err);
    }
  };

  const fetchAggregationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/aggregations/sensor-summary?timeInterval=${timeInterval}&limit=1000`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setAggregationData(data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch aggregation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSeriesData = async () => {
    try {
      const params = new URLSearchParams({
        timeInterval: timeInterval,
        limit: '1000'
      });
      
      if (selectedSensor) {
        params.append('sensorName', selectedSensor);
      }
      
      const response = await fetch(`${API_URL}/api/aggregations/time-series?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setTimeSeriesData(data);
    } catch (err) {
      console.error('Failed to fetch time series data:', err);
    }
  };

  useEffect(() => {
    fetchSensors();
  }, []);

  useEffect(() => {
    fetchAggregationData();
    fetchTimeSeriesData();
  }, [timeInterval, selectedSensor]);

  // Add manual refresh functionality
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchAggregationData(), fetchTimeSeriesData()]);
    } finally {
      setRefreshing(false);
    }
  };

  const formatNumber = (num) => {
    return typeof num === 'number' ? num.toFixed(2) : '0.00';
  };

  const formatTimeKey = (timeKey) => {
    if (timeKey.includes('T')) {
      return new Date(timeKey).toLocaleString();
    }
    return timeKey;
  };

  const getSensorTypeColor = (sensorType) => {
    const colors = {
      gas: '#ff6b6b',
      electricity: '#4ecdc4',
      liquid: '#45b7d1',
      other: '#96ceb4'
    };
    return colors[sensorType] || '#96ceb4';
  };

  if (loading) {
    return (
      <div className="aggregation-dashboard">
        <div className="loading">Loading aggregation data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aggregation-dashboard">
        <div className="error">
          <p>Error: {error}</p>
          <button onClick={fetchAggregationData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="aggregation-dashboard">
      <header className="dashboard-header">
        <h1>Sensor Data Aggregation Dashboard</h1>
        <div className="controls">
          <div className="control-group">
            <label>Time Interval:</label>
            <select 
              value={timeInterval} 
              onChange={(e) => setTimeInterval(e.target.value)}
            >
              {timeIntervals.map(interval => (
                <option key={interval.value} value={interval.value}>
                  {interval.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="control-group">
            <label>Filter by Sensor:</label>
            <select 
              value={selectedSensor} 
              onChange={(e) => setSelectedSensor(e.target.value)}
            >
              <option value="">All Sensors</option>
              {sensors.map(sensor => (
                <option key={sensor.sensorId} value={sensor.sensorName}>
                  {sensor.sensorName}
                </option>
              ))}
            </select>
          </div>
          
          <button onClick={handleRefresh} className="refresh-btn" disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Sensor Summary Section */}
        <section className="sensor-summary-section">
          <h2>Sensor Summary by {timeIntervals.find(t => t.value === timeInterval)?.label}</h2>
          
          {aggregationData?.aggregations && Object.keys(aggregationData.aggregations).length > 0 ? (
            <div className="sensor-summary-grid">
              {Object.entries(aggregationData.aggregations).map(([sensorName, timeData]) => {
                const sensor = sensors.find(s => s.sensorName === sensorName);
                const timeKeys = Object.keys(timeData).sort().reverse();
                const latestData = timeData[timeKeys[0]];
                
                return (
                  <div key={sensorName} className="sensor-summary-card">
                    <div className="sensor-header">
                      <h3>{sensorName}</h3>
                      {sensor && (
                        <span 
                          className="sensor-type-badge"
                          style={{ backgroundColor: getSensorTypeColor(sensor.sensorType) }}
                        >
                          {sensor.sensorType}
                        </span>
                      )}
                    </div>
                    
                    <div className="summary-stats">
                      <div className="stat-item">
                        <span className="stat-label">Total Sum:</span>
                        <span className="stat-value">{formatNumber(latestData?.sum || 0)}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Event Count:</span>
                        <span className="stat-value">{latestData?.count || 0}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Average:</span>
                        <span className="stat-value">{formatNumber(latestData?.average || 0)}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Min/Max:</span>
                        <span className="stat-value">
                          {formatNumber(latestData?.min || 0)} / {formatNumber(latestData?.max || 0)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="time-buckets">
                      <h4>Time Buckets ({timeKeys.length})</h4>
                      <div className="time-buckets-list">
                        {timeKeys.slice(0, 5).map(timeKey => (
                          <div key={timeKey} className="time-bucket">
                            <span className="time-label">{formatTimeKey(timeKey)}</span>
                            <span className="time-sum">{formatNumber(timeData[timeKey].sum)}</span>
                            <span className="time-count">({timeData[timeKey].count})</span>
                          </div>
                        ))}
                        {timeKeys.length > 5 && (
                          <div className="more-buckets">
                            ... and {timeKeys.length - 5} more time buckets
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-data">No aggregation data available</div>
          )}
        </section>

        {/* Time Series Section */}
        <section className="time-series-section">
          <h2>Time Series Analysis</h2>
          
          {timeSeriesData?.timeSeries && Object.keys(timeSeriesData.timeSeries).length > 0 ? (
            <div className="time-series-chart">
              <div className="chart-header">
                <h3>Value Sum Over Time</h3>
                <span className="sensor-filter">
                  {selectedSensor ? `Filtered by: ${selectedSensor}` : 'All Sensors'}
                </span>
              </div>
              
              <div className="chart-container">
                {Object.entries(timeSeriesData.timeSeries)
                  .sort(([a], [b]) => new Date(a) - new Date(b))
                  .map(([timeKey, data]) => (
                    <div key={timeKey} className="time-series-point">
                      <div className="point-label">{formatTimeKey(timeKey)}</div>
                      <div className="point-bar" style={{ height: `${Math.min((data.sum / 100) * 100, 200)}px` }}>
                        <div className="bar-tooltip">
                          <div>Sum: {formatNumber(data.sum)}</div>
                          <div>Count: {data.count}</div>
                          <div>Average: {formatNumber(data.average)}</div>
                          <div>Sensors: {data.sensorCount}</div>
                        </div>
                      </div>
                      <div className="point-value">{formatNumber(data.sum)}</div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="no-data">No time series data available</div>
          )}
        </section>

        {/* Summary Statistics */}
        <section className="summary-stats-section">
          <h2>Summary Statistics</h2>
          
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Sensors</h3>
              <div className="stat-number">{aggregationData?.totalSensors || 0}</div>
            </div>
            
            <div className="stat-card">
              <h3>Time Intervals</h3>
              <div className="stat-number">{timeSeriesData?.totalIntervals || 0}</div>
            </div>
            
            <div className="stat-card">
              <h3>Current Interval</h3>
              <div className="stat-text">{timeIntervals.find(t => t.value === timeInterval)?.label}</div>
            </div>
            
            <div className="stat-card">
              <h3>Last Updated</h3>
              <div className="stat-text">
                {aggregationData?.timestamp ? new Date(aggregationData.timestamp).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AggregationDashboard;
