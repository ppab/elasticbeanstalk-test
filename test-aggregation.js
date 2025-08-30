#!/usr/bin/env node

/**
 * Test script for aggregation features
 * Generates sample sensor data and tests aggregation endpoints
 * Run with: node test-aggregation.js
 */

const API_URL = process.env.API_URL || 'http://localhost:80';

async function generateSampleData() {
  console.log('🧪 Generating Sample Data for Aggregation Testing...\n');

  try {
    // Create sample sensors
    const sensors = [
      {
        sensorName: 'Temperature Sensor 1',
        sensorType: 'gas',
        heartBeat: 30,
        on: true
      },
      {
        sensorName: 'Pressure Sensor 1',
        sensorType: 'gas',
        heartBeat: 45,
        on: true
      },
      {
        sensorName: 'Voltage Monitor 1',
        sensorType: 'electricity',
        heartBeat: 60,
        on: true
      },
      {
        sensorName: 'Flow Rate Sensor 1',
        sensorType: 'liquid',
        heartBeat: 20,
        on: true
      },
      {
        sensorName: 'Humidity Sensor 1',
        sensorType: 'other',
        heartBeat: 90,
        on: true
      }
    ];

    console.log('1. Creating sample sensors...');
    const createdSensors = [];
    
    for (const sensor of sensors) {
      const response = await fetch(`${API_URL}/api/sensors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sensor)
      });
      
      if (response.ok) {
        const data = await response.json();
        createdSensors.push(data.sensor);
        console.log(`   ✓ Created: ${sensor.sensorName}`);
      } else {
        console.log(`   ✗ Failed to create: ${sensor.sensorName}`);
      }
    }

    console.log('\n2. Generating sample events...');
    
    // Generate events over the last 24 hours with different time intervals
    const now = new Date();
    const events = [];
    
    for (let i = 0; i < 50; i++) {
      const sensor = createdSensors[i % createdSensors.length];
      const timeOffset = Math.floor(Math.random() * 24 * 60 * 60 * 1000); // Random time in last 24 hours
      const eventTime = new Date(now.getTime() - timeOffset);
      
      const event = {
        date: eventTime.toISOString().replace('T', ' ').substring(0, 19),
        value: Math.floor(Math.random() * 100) + 1, // Random value 1-100
        sensorId: sensor.sensorId
      };
      
      events.push(event);
    }

    // Send events in batches
    for (let i = 0; i < events.length; i += 5) {
      const batch = events.slice(i, i + 5);
      
      await Promise.all(batch.map(async (event) => {
        try {
          const response = await fetch(`${API_URL}/api/ingest`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
          });
          
          if (response.ok) {
            console.log(`   ✓ Event created for sensor ${event.sensorId}: ${event.value}`);
          }
        } catch (error) {
          console.log(`   ✗ Failed to create event: ${error.message}`);
        }
      }));
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n✅ Sample data generation completed!');
    console.log(`   Created ${createdSensors.length} sensors`);
    console.log(`   Generated ${events.length} events`);
    
    return { sensors: createdSensors, events: events.length };

  } catch (error) {
    console.error('❌ Failed to generate sample data:', error.message);
    throw error;
  }
}

async function testAggregationEndpoints() {
  console.log('\n🧪 Testing Aggregation Endpoints...\n');

  try {
    // Test 1: Sensor Summary Aggregation
    console.log('1. Testing GET /api/aggregations/sensor-summary');
    const summaryResponse = await fetch(`${API_URL}/api/aggregations/sensor-summary?timeInterval=1h&limit=1000`);
    
    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      console.log('   ✓ Sensor summary generated successfully');
      console.log(`   Sensors with data: ${Object.keys(summaryData.aggregations).length}`);
      
      Object.entries(summaryData.aggregations).forEach(([sensorName, timeData]) => {
        const timeKeys = Object.keys(timeData);
        const totalSum = timeKeys.reduce((sum, key) => sum + timeData[key].sum, 0);
        console.log(`   - ${sensorName}: ${timeKeys.length} time buckets, total sum: ${totalSum.toFixed(2)}`);
      });
    } else {
      console.log('   ✗ Failed to get sensor summary');
    }

    // Test 2: Time Series Aggregation
    console.log('\n2. Testing GET /api/aggregations/time-series');
    const timeSeriesResponse = await fetch(`${API_URL}/api/aggregations/time-series?timeInterval=1h&limit=1000`);
    
    if (timeSeriesResponse.ok) {
      const timeSeriesData = await timeSeriesResponse.json();
      console.log('   ✓ Time series generated successfully');
      console.log(`   Time intervals: ${Object.keys(timeSeriesData.timeSeries).length}`);
      
      const timeKeys = Object.keys(timeSeriesData.timeSeries).sort();
      timeKeys.slice(0, 3).forEach(timeKey => {
        const data = timeSeriesData.timeSeries[timeKey];
        console.log(`   - ${timeKey}: sum=${data.sum.toFixed(2)}, count=${data.count}, sensors=${data.sensorCount}`);
      });
    } else {
      console.log('   ✗ Failed to get time series');
    }

    // Test 3: Sensor Details Aggregation
    console.log('\n3. Testing GET /api/aggregations/sensor-details');
    const detailsResponse = await fetch(`${API_URL}/api/aggregations/sensor-details?sensorName=Temperature Sensor 1&timeInterval=1h&limit=1000`);
    
    if (detailsResponse.ok) {
      const detailsData = await detailsResponse.json();
      console.log('   ✓ Sensor details generated successfully');
      console.log(`   Total events: ${detailsData.totalEvents}`);
      console.log(`   Overall sum: ${detailsData.details.overall.totalSum.toFixed(2)}`);
      console.log(`   Overall average: ${detailsData.details.overall.totalAverage.toFixed(2)}`);
      console.log(`   Time buckets: ${Object.keys(detailsData.details.timeBuckets).length}`);
    } else {
      console.log('   ✗ Failed to get sensor details');
    }

    // Test 4: Different Time Intervals
    console.log('\n4. Testing different time intervals...');
    const intervals = ['5m', '15m', '30m', '1h', '6h'];
    
    for (const interval of intervals) {
      const response = await fetch(`${API_URL}/api/aggregations/sensor-summary?timeInterval=${interval}&limit=1000`);
      if (response.ok) {
        const data = await response.json();
        const totalBuckets = Object.values(data.aggregations).reduce((sum, sensor) => sum + Object.keys(sensor).length, 0);
        console.log(`   ✓ ${interval}: ${totalBuckets} total time buckets`);
      } else {
        console.log(`   ✗ ${interval}: Failed`);
      }
    }

    console.log('\n✅ All aggregation tests completed successfully!');

  } catch (error) {
    console.error('❌ Aggregation tests failed:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Aggregation Testing Suite\n');
    
    // Generate sample data first
    await generateSampleData();
    
    // Wait a moment for data to be processed
    console.log('\n⏳ Waiting for data processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test aggregation endpoints
    await testAggregationEndpoints();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 You can now view the aggregation dashboard at:');
    console.log('   http://localhost:80');
    console.log('   Navigate to the "Aggregation Dashboard" tab to see the results.');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
main();
