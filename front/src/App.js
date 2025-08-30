import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [servicesData, setServicesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        </div>
      </main>
    </div>
  );
}

export default App;