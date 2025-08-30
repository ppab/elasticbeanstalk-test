import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './App.css';

function Navigation() {
  const location = useLocation();

  return (
    <nav className="app-navigation">
      <div className="nav-container">
        <h1 className="nav-title">Sensor Monitoring System</h1>
        <div className="nav-tabs">
          <Link 
            to="/"
            className={`nav-tab ${location.pathname === '/' ? 'active' : ''}`}
          >
            Main Dashboard
          </Link>
          <Link 
            to="/aggregation"
            className={`nav-tab ${location.pathname === '/aggregation' ? 'active' : ''}`}
          >
            Aggregation Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
