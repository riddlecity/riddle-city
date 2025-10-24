// Quick check of Central Library specifically
const fs = require('fs');

function getUKTime() {
  return new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/London"}));
}

const cache = JSON.parse(fs.readFileSync('opening-hours-cache.json', 'utf8'));
const ukTime = getUKTime();

console.log('🕒 Current UK time:', ukTime.toLocaleString('en-GB'));
console.log('📅 Day:', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][ukTime.getDay()]);
console.log('⏰ Time:', `${ukTime.getHours().toString().padStart(2, '0')}:${ukTime.getMinutes().toString().padStart(2, '0')}\n`);

// Find Central Library in cache
const libraryUrl = 'https://maps.app.goo.gl/f94mvjKVE9NgMG32A';
const libraryData = cache[libraryUrl];

if (libraryData) {
  console.log('📚 CENTRAL LIBRARY DETAILED CHECK:');
  console.log('Location name:', libraryData.location_name);
  console.log('Google URL:', libraryUrl);
  
  if (libraryData.opening_hours) {
    console.log('\n📋 Cached hours data:');
    console.log(JSON.stringify(libraryData.opening_hours, null, 2));
    
    if (libraryData.opening_hours.parsed_hours) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = dayNames[ukTime.getDay()];
      
      console.log(`\n📅 Today (${currentDay}) hours:`, libraryData.opening_hours.parsed_hours[currentDay]);
      
      const todayHours = libraryData.opening_hours.parsed_hours[currentDay];
      if (todayHours) {
        const currentMinutes = ukTime.getHours() * 60 + ukTime.getMinutes();
        const [openHour, openMinute] = todayHours.open.split(':').map(Number);
        const [closeHour, closeMinute] = todayHours.close.split(':').map(Number);
        
        const openMinutes = openHour * 60 + openMinute;
        let closeMinutes = closeHour * 60 + closeMinute;
        
        // Handle midnight closures
        if (closeHour === 0 || (closeHour === 0 && closeMinute > 0)) {
          closeMinutes += 24 * 60;
        }
        
        const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
        
        console.log('\n🔍 Time calculation:');
        console.log('Current minutes:', currentMinutes);
        console.log('Open minutes:', openMinutes);
        console.log('Close minutes:', closeMinutes);
        console.log('Is open?', isOpen);
      }
    }
  } else {
    console.log('❌ No opening hours data in cache');
  }
} else {
  console.log('❌ Central Library not found in cache');
}

console.log('\n🤔 USER SAYS LIBRARY (RIDDLE 2) IS CLOSED');
console.log('Possible reasons:');
console.log('1. Cache is outdated');
console.log('2. Special closure today not in regular hours');
console.log('3. Google Places shows different status');
console.log('4. Library has Sunday closure that\'s not reflected properly');