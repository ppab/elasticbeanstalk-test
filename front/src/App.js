import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Navigation from './Navigation';
import MainDashboard from './MainDashboard';
import AggregationDashboard from './AggregationDashboard';

function App() {

  return (
    <Router>
      <div className="App">
        <Navigation />
        <Routes>
          <Route path="/" element={<MainDashboard />} />
          <Route path="/aggregation" element={<AggregationDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;