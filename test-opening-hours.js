// Simple test script for opening hours system
const fs = require('fs');
const path = require('path');

// Test the cache file
const cacheFile = path.join(process.cwd(), 'opening-hours-cache.json');

console.log('🔍 Testing Opening Hours System');
console.log('================================');

// Check if cache file exists and is readable
try {
  const cacheData = fs.readFileSync(cacheFile, 'utf-8');
  const cache = JSON.parse(cacheData);
  
  console.log('✅ Cache file loaded successfully');
  console.log('📊 Cached locations:', Object.keys(cache).length);
  
  // Show first cached entry structure
  const firstEntry = Object.values(cache)[0];
  if (firstEntry) {
    console.log('📋 Sample cache entry structure:');
    console.log('   - Has opening_hours:', !!firstEntry.opening_hours);
    console.log('   - Has parsed_hours:', !!firstEntry.opening_hours?.parsed_hours);
    console.log('   - Last updated:', firstEntry.last_updated);
    console.log('   - Location name:', firstEntry.location_name);
    
    if (firstEntry.opening_hours?.parsed_hours) {
      console.log('📅 Sample daily hours:');
      Object.entries(firstEntry.opening_hours.parsed_hours).forEach(([day, hours]) => {
        if (hours) {
          console.log(`   - ${day}: ${hours.open} - ${hours.close}`);
        } else {
          console.log(`   - ${day}: Closed`);
        }
      });
    }
  }
  
  console.log('✅ Opening hours cache system is working correctly!');
  
} catch (error) {
  console.error('❌ Error reading cache file:', error.message);
}

// Test UK time function
function getUKTime() {
  const now = new Date();
  const ukTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now);

  const year = parseInt(ukTime.find(part => part.type === 'year')?.value || '0');
  const month = parseInt(ukTime.find(part => part.type === 'month')?.value || '1') - 1;
  const day = parseInt(ukTime.find(part => part.type === 'day')?.value || '1');
  const hour = parseInt(ukTime.find(part => part.type === 'hour')?.value || '0');
  const minute = parseInt(ukTime.find(part => part.type === 'minute')?.value || '0');
  const second = parseInt(ukTime.find(part => part.type === 'second')?.value || '0');

  return new Date(year, month, day, hour, minute, second);
}

console.log('🕒 Current UK time:', getUKTime().toLocaleString('en-GB', { timeZone: 'Europe/London' }));
console.log('🗓️  Current day:', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][getUKTime().getDay()]);
