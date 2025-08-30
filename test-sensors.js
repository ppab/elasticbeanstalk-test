#!/usr/bin/env node

/**
 * Test script for sensor API endpoints
 * Run with: node test-sensors.js
 */

const API_URL = process.env.API_URL || 'http://localhost:80';

async function testSensorAPI() {
  console.log('🧪 Testing Sensor API Endpoints...\n');

  try {
    // Test 1: Get sensors (should be empty initially)
    console.log('1. Testing GET /api/sensors (initial state)');
    const getResponse = await fetch(`${API_URL}/api/sensors`);
    const getData = await getResponse.json();
    console.log('   Status:', getResponse.status);
    console.log('   Response:', JSON.stringify(getData, null, 2));
    console.log('');

    // Test 2: Create a sensor
    console.log('2. Testing POST /api/sensors (create sensor)');
    const newSensor = {
      sensorName: 'Test Temperature Sensor',
      sensorType: 'gas',
      heartBeat: 15,
      on: false
    };
    
    const createResponse = await fetch(`${API_URL}/api/sensors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newSensor)
    });
    const createData = await createResponse.json();
    console.log('   Status:', createResponse.status);
    console.log('   Response:', JSON.stringify(createData, null, 2));
    console.log('');

    // Test 3: Get sensors again (should have one sensor)
    console.log('3. Testing GET /api/sensors (after creation)');
    const getResponse2 = await fetch(`${API_URL}/api/sensors`);
    const getData2 = await getResponse2.json();
    console.log('   Status:', getResponse2.status);
    console.log('   Response:', JSON.stringify(getData2, null, 2));
    console.log('');

    // Test 4: Update the sensor
    console.log('4. Testing PUT /api/sensors/:id (update sensor)');
    const sensorId = createData.sensor.sensorId;
    const updatedSensor = {
      sensorName: 'Updated Temperature Sensor',
      sensorType: 'electricity',
      heartBeat: 30,
      on: true
    };
    
    const updateResponse = await fetch(`${API_URL}/api/sensors/${sensorId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedSensor)
    });
    const updateData = await updateResponse.json();
    console.log('   Status:', updateResponse.status);
    console.log('   Response:', JSON.stringify(updateData, null, 2));
    console.log('');

    // Test 5: Get sensors again (should show updated sensor)
    console.log('5. Testing GET /api/sensors (after update)');
    const getResponse3 = await fetch(`${API_URL}/api/sensors`);
    const getData3 = await getResponse3.json();
    console.log('   Status:', getResponse3.status);
    console.log('   Response:', JSON.stringify(getData3, null, 2));
    console.log('');

    // Test 6: Delete the sensor
    console.log('6. Testing DELETE /api/sensors/:id (delete sensor)');
    const deleteResponse = await fetch(`${API_URL}/api/sensors/${sensorId}`, {
      method: 'DELETE'
    });
    const deleteData = await deleteResponse.json();
    console.log('   Status:', deleteResponse.status);
    console.log('   Response:', JSON.stringify(deleteData, null, 2));
    console.log('');

    // Test 7: Get sensors again (should be empty)
    console.log('7. Testing GET /api/sensors (after deletion)');
    const getResponse4 = await fetch(`${API_URL}/api/sensors`);
    const getData4 = await getResponse4.json();
    console.log('   Status:', getResponse4.status);
    console.log('   Response:', JSON.stringify(getData4, null, 2));
    console.log('');

    console.log('✅ All sensor API tests completed successfully!');

    // Test 8: Test automatic event generation
    console.log('\n8. Testing automatic event generation');
    const eventResponse = await fetch(`${API_URL}/api/sensors/${sensorId}/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    const eventData = await eventResponse.json();
    console.log('   Status:', eventResponse.status);
    console.log('   Response:', JSON.stringify(eventData, null, 2));
    console.log('');

    // Test 9: Test manual event ingestion with new schema
    console.log('9. Testing manual event ingestion (new schema)');
    const manualEvent = {
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      value: 99,
      sensorId: sensorId
    };
    
    const ingestResponse = await fetch(`${API_URL}/api/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(manualEvent)
    });
    const ingestData = await ingestResponse.json();
    console.log('   Status:', ingestResponse.status);
    console.log('   Response:', JSON.stringify(ingestData, null, 2));
    console.log('');

    console.log('✅ All sensor and event API tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
testSensorAPI();
