// Manual fix for Central Library hours - close on Sunday
const fs = require('fs');

console.log('🔧 MANUALLY FIXING CENTRAL LIBRARY HOURS\n');

// Load current cache
const cache = JSON.parse(fs.readFileSync('opening-hours-cache.json', 'utf8'));
const libraryUrl = 'https://maps.app.goo.gl/f94mvjKVE9NgMG32A';

if (cache[libraryUrl]) {
  console.log('📋 Before fix:');
  console.log('Sunday hours:', cache[libraryUrl].opening_hours?.parsed_hours?.sunday);
  console.log('Open now:', cache[libraryUrl].opening_hours?.open_now);
  
  // Fix the library hours
  const libraryData = cache[libraryUrl];
  
  // Remove Sunday from periods
  if (libraryData.opening_hours?.periods) {
    libraryData.opening_hours.periods = libraryData.opening_hours.periods.filter(
      period => period.open.day !== 0
    );
  }
  
  // Set Sunday as closed in parsed_hours
  if (libraryData.opening_hours?.parsed_hours) {
    libraryData.opening_hours.parsed_hours.sunday = null;
  }
  
  // Force open_now to false since it's Sunday
  const ukTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/London"}));
  if (ukTime.getDay() === 0) { // Sunday
    libraryData.opening_hours.open_now = false;
  }
  
  // Update last_updated
  libraryData.last_updated = new Date().toISOString();
  
  // Save back to cache
  fs.writeFileSync('opening-hours-cache.json', JSON.stringify(cache, null, 2));
  
  console.log('\n✅ After fix:');
  console.log('Sunday hours:', cache[libraryUrl].opening_hours?.parsed_hours?.sunday);
  console.log('Open now:', cache[libraryUrl].opening_hours?.open_now);
  console.log('\n🎉 Central Library now correctly shows as CLOSED on Sundays!');
} else {
  console.log('❌ Library not found in cache');
}