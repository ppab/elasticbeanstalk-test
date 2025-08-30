import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [servicesData, setServicesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventLoading, setEventLoading] = useState(false);

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

  const createEvent = async () => {
    try {
      setEventLoading(true);
      
      const event = {
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        value: Math.floor(Math.random() * 100),
        sensorId: 1
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

  useEffect(() => {
    fetchServices();
    
    const interval = setInterval(fetchServices, 5000);
    return () => clearInterval(interval);
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
        <h1>Multi-Service Dashboard</h1>
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
            <div className="event-count">
              Count: {servicesData?.events?.data?.events?.length || 0}
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
            <div className="event-count">
              Count: {servicesData?.transformedEvents?.data?.transformedEvents?.length || 0}
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