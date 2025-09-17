// test-single-location.js
// Test refreshing a single location's opening hours

import { getCachedOpeningHours } from './lib/openingHoursCache.js';

async function testSingleLocation() {
  console.log('🔄 Testing single location cache refresh...');
  
  try {
    const testUrl = 'https://maps.app.goo.gl/HwhzfBt35q4WvzWJ8';
    const locationName = 'Falco Lounge';
    
    console.log('📍 Testing:', locationName);
    console.log('🔗 URL:', testUrl);
    
    // Force refresh (will trigger web scraping)
    console.log('🔄 Forcing cache refresh with web scraping...');
    const hours = await getCachedOpeningHours(testUrl, locationName, true);
    
    if (hours) {
      console.log('✅ Successfully got opening hours!');
      console.log('📊 Hours data:', JSON.stringify(hours, null, 2));
    } else {
      console.log('❌ No hours data returned');
    }
    
  } catch (error) {
    console.error('❌ Error testing single location:', error);
  }
}

testSingleLocation();
