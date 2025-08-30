import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [servicesData, setServicesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [sensors, setSensors] = useState([]);
  const [showCreateSensor, setShowCreateSensor] = useState(false);
  const [sensorLoading, setSensorLoading] = useState(false);
  const [newSensor, setNewSensor] = useState({
    sensorName: '',
    sensorType: 'gas',
    heartBeat: 30,
    on: false
  });
  const [sensorIntervals, setSensorIntervals] = useState({});

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:80';

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/services`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setServicesData(data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch services:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSensors = async () => {
    try {
      setSensorLoading(true);
      const response = await fetch(`${API_URL}/api/sensors`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setSensors(data.sensors || []);
      
      // Start intervals for active sensors
      data.sensors?.forEach(sensor => {
        if (sensor.on) {
          startSensorInterval(sensor);
        }
      });
    } catch (err) {
      console.error('Failed to fetch sensors:', err);
      setError(`Failed to fetch sensors: ${err.message}`);
    } finally {
      setSensorLoading(false);
    }
  };

  const createEvent = async (sensorId = 1) => {
    try {
      setEventLoading(true);
      
      const event = {
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        value: Math.floor(Math.random() * 100),
        sensorId: sensorId
      };

      const response = await fetch(`${API_URL}/api/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Event created:', result);
      
      // Refresh services data to see the new event
      fetchServices();
    } catch (err) {
      console.error('Failed to create event:', err);
      setError(`Failed to create event: ${err.message}`);
    } finally {
      setEventLoading(false);
    }
  };

  const createSensor = async () => {
    try {
      setSensorLoading(true);
      
      const response = await fetch(`${API_URL}/api/sensors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSensor)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Sensor created:', result);
      
      // Refresh sensors list
      await fetchSensors();
      
      setNewSensor({
        sensorName: '',
        sensorType: 'gas',
        heartBeat: 30,
        on: false
      });
      setShowCreateSensor(false);
    } catch (err) {
      console.error('Failed to create sensor:', err);
      setError(`Failed to create sensor: ${err.message}`);
    } finally {
      setSensorLoading(false);
    }
  };

  const toggleSensor = async (sensorId) => {
    try {
      const sensor = sensors.find(s => s.sensorId === sensorId);
      if (!sensor) return;

      const updatedSensor = { ...sensor, on: !sensor.on };
      
      const response = await fetch(`${API_URL}/api/sensors/${sensorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedSensor)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Sensor updated:', result);
      
      // Update local state
      setSensors(prevSensors => 
        prevSensors.map(s => 
          s.sensorId === sensorId ? updatedSensor : s
        )
      );
      
      // Handle interval
      if (updatedSensor.on) {
        startSensorInterval(updatedSensor);
      } else {
        stopSensorInterval(sensorId);
      }
    } catch (err) {
      console.error('Failed to toggle sensor:', err);
      setError(`Failed to toggle sensor: ${err.message}`);
    }
  };

  const deleteSensor = async (sensorId) => {
    try {
      const response = await fetch(`${API_URL}/api/sensors/${sensorId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Sensor deleted:', result);
      
      // Stop interval and remove from local state
      stopSensorInterval(sensorId);
      setSensors(prevSensors => prevSensors.filter(s => s.sensorId !== sensorId));
    } catch (err) {
      console.error('Failed to delete sensor:', err);
      setError(`Failed to delete sensor: ${err.message}`);
    }
  };

  const deleteAllRawEvents = async () => {
    if (!window.confirm('Are you sure you want to delete all raw events? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/events`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('All raw events deleted:', result);
      
      // Refresh services data to see the updated events
      fetchServices();
    } catch (err) {
      console.error('Failed to delete raw events:', err);
      setError(`Failed to delete raw events: ${err.message}`);
    }
  };

  const deleteAllTransformedEvents = async () => {
    if (!window.confirm('Are you sure you want to delete all transformed events? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/transformed-events`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('All transformed events deleted:', result);
      
      // Refresh services data to see the updated events
      fetchServices();
    } catch (err) {
      console.error('Failed to delete transformed events:', err);
      setError(`Failed to delete transformed events: ${err.message}`);
    }
  };

  const startSensorInterval = (sensor) => {
    if (sensorIntervals[sensor.sensorId]) {
      clearInterval(sensorIntervals[sensor.sensorId]);
    }
    
    const interval = setInterval(async () => {
      try {
        // Use the new automatic event endpoint for sensor heartbeat events
        const response = await fetch(`${API_URL}/api/sensors/${sensor.sensorId}/event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({}) // Empty body, value will be generated automatically
        });

        if (!response.ok) {
          console.error(`Failed to generate automatic event for sensor ${sensor.sensorId}:`, response.status);
          return;
        }

        const result = await response.json();
        console.log(`Automatic event generated for sensor ${sensor.sensorName}:`, result);
        
        // Refresh services data to see the new event
        fetchServices();
      } catch (err) {
        console.error(`Failed to generate automatic event for sensor ${sensor.sensorId}:`, err);
      }
    }, sensor.heartBeat * 1000);
    
    setSensorIntervals(prev => ({
      ...prev,
      [sensor.sensorId]: interval
    }));
  };

  const stopSensorInterval = (sensorId) => {
    if (sensorIntervals[sensorId]) {
      clearInterval(sensorIntervals[sensorId]);
      setSensorIntervals(prev => {
        const newIntervals = { ...prev };
        delete newIntervals[sensorId];
        return newIntervals;
      });
    }
  };

  useEffect(() => {
    fetchServices();
    fetchSensors();
    
    const interval = setInterval(fetchServices, 5000);
    return () => {
      clearInterval(interval);
      // Clean up all sensor intervals
      Object.values(sensorIntervals).forEach(interval => clearInterval(interval));
    };
  }, []);

  if (loading) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Multi-Service Dashboard</h1>
          <div className="loading">Loading services data...</div>
        </header>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Multi-Service Dashboard</h1>
          <div className="error">
            <p>Error: {error}</p>
            <button onClick={fetchServices}>Retry</button>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Multi-Service Dashboard -SENSORS</h1>
        <div className="refresh-info">
          <p>Last updated: {servicesData?.timestamp}</p>
          <button onClick={fetchServices}>Refresh Now</button>
          <button 
            onClick={createEvent} 
            disabled={eventLoading}
            className="create-event-btn"
          >
            {eventLoading ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </header>
      
      <main className="App-main">
        {/* Sensors Section */}
        <section className="sensors-section">
          <div className="section-header">
            <h2>Sensors</h2>
            <button 
              onClick={() => setShowCreateSensor(true)}
              className="create-sensor-btn"
              disabled={sensorLoading}
            >
              {sensorLoading ? 'Loading...' : 'Create Sensor'}
            </button>
          </div>
          
          {/* Create Sensor Form */}
          {showCreateSensor && (
            <div className="create-sensor-form">
              <h3>Create New Sensor</h3>
              <div className="form-group">
                <label>Sensor Name:</label>
                <input
                  type="text"
                  value={newSensor.sensorName}
                  onChange={(e) => setNewSensor({...newSensor, sensorName: e.target.value})}
                  placeholder="Enter sensor name"
                />
              </div>
              <div className="form-group">
                <label>Type:</label>
                <select
                  value={newSensor.sensorType}
                  onChange={(e) => setNewSensor({...newSensor, sensorType: e.target.value})}
                >
                  <option value="gas">Gas</option>
                  <option value="electricity">Electricity</option>
                  <option value="liquid">Liquid</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Heartbeat (seconds):</label>
                <input
                  type="number"
                  min="1"
                  value={newSensor.heartBeat}
                  onChange={(e) => setNewSensor({...newSensor, heartBeat: parseInt(e.target.value)})}
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={newSensor.on}
                    onChange={(e) => setNewSensor({...newSensor, on: e.target.checked})}
                  />
                  Start sensor immediately
                </label>
              </div>
              <div className="form-actions">
                <button onClick={createSensor} disabled={!newSensor.sensorName.trim() || sensorLoading}>
                  {sensorLoading ? 'Creating...' : 'Create'}
                </button>
                <button onClick={() => setShowCreateSensor(false)} disabled={sensorLoading}>Cancel</button>
              </div>
            </div>
          )}
          
          {/* Sensors Table */}
          <div className="sensors-table">
            {sensorLoading && sensors.length === 0 ? (
              <div className="loading-sensors">Loading sensors...</div>
            ) : sensors.length === 0 ? (
              <div className="no-sensors">No sensors found. Create your first sensor to get started!</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Heartbeat (s)</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sensors.map((sensor) => (
                    <tr key={sensor.sensorId}>
                      <td>{sensor.sensorId}</td>
                      <td>{sensor.sensorName}</td>
                      <td>{sensor.sensorType}</td>
                      <td>{sensor.heartBeat}</td>
                      <td>
                        <span className={`sensor-status ${sensor.on ? 'on' : 'off'}`}>
                          {sensor.on ? 'ON' : 'OFF'}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => toggleSensor(sensor.sensorId)}
                          className={`toggle-btn ${sensor.on ? 'stop' : 'start'}`}
                          disabled={sensorLoading}
                        >
                          {sensor.on ? 'Stop' : 'Start'}
                        </button>
                        <button 
                          onClick={() => deleteSensor(sensor.sensorId)}
                          className="delete-btn"
                          disabled={sensorLoading}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <div className="services-grid">
          <div className="service-card">
            <h2>Flask Service</h2>
            <div className={`status ${servicesData?.services?.flask?.status}`}>
              Status: {servicesData?.services?.flask?.status}
            </div>
            <div className="service-data">
              <pre>{JSON.stringify(servicesData?.services?.flask?.data, null, 2)}</pre>
            </div>
          </div>
          
          <div className="service-card">
            <h2>Service2 (Redis Counter)</h2>
            <div className={`status ${servicesData?.services?.service2?.status}`}>
              Status: {servicesData?.services?.service2?.status}
            </div>
            <div className="service-data">
              <pre>{JSON.stringify(servicesData?.services?.service2?.data, null, 2)}</pre>
            </div>
          </div>

          <div className="service-card">
            <h2>Raw Events</h2>
            <div className={`status ${servicesData?.events?.status}`}>
              Status: {servicesData?.events?.status}
            </div>
            <div className="event-header-actions">
              <div className="event-count">
                Count: {servicesData?.events?.data?.events?.length || 0}
              </div>
              <button 
                onClick={deleteAllRawEvents}
                className="delete-all-btn"
                disabled={!servicesData?.events?.data?.events?.length}
              >
                Delete All
              </button>
            </div>
            <div className="service-data events-list">
              {servicesData?.events?.data?.events?.length > 0 ? (
                <div className="events-scroll">
                  {servicesData.events.data.events.map((event, index) => (
                    <div key={index} className="event-item">
                      <div className="event-header">
                        <span className="event-id">{event.id}</span>
                        <span className="event-date">{event.date}</span>
                      </div>
                      <div className="event-details">
                        Value: {event.value} | Sensor: {event.sensorId}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-events">No events yet</div>
              )}
            </div>
          </div>

          <div className="service-card">
            <h2>Transformed Events</h2>
            <div className={`status ${servicesData?.transformedEvents?.status}`}>
              Status: {servicesData?.transformedEvents?.status}
            </div>
            <div className="event-header-actions">
              <div className="event-count">
                Count: {servicesData?.transformedEvents?.data?.transformedEvents?.length || 0}
              </div>
              <button 
                onClick={deleteAllTransformedEvents}
                className="delete-all-btn"
                disabled={!servicesData?.transformedEvents?.data?.transformedEvents?.length}
              >
                Delete All
              </button>
            </div>
            <div className="service-data events-list">
              {servicesData?.transformedEvents?.data?.transformedEvents?.length > 0 ? (
                <div className="events-scroll">
                  {servicesData.transformedEvents.data.transformedEvents.map((event, index) => (
                    <div key={index} className="event-item transformed">
                      <div className="event-header">
                        <span className="event-id">{event.id}</span>
                        <span className="event-date">{event.date}</span>
                      </div>
                      <div className="event-details">
                        Value: {event.value} | Sensor: {event.sensorId}
                        <div className="transform-info">
                          ✓ Transformed at {new Date(event.transformedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-events">No transformed events yet</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;