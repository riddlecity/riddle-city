// Quick test to see the new compact warning messages
const fetch = require('node-fetch');

async function testWarnings() {
  try {
    // Test the time warnings with the track endpoint
    const response = await fetch('http://localhost:3000/api/locations/1/hours');
    
    if (!response.ok) {
      console.log('Server not running or endpoint unavailable');
      return;
    }
    
    const data = await response.json();
    console.log('Locations data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.log('Test failed:', error.message);
  }
}

testWarnings();
