// test-warnings.js - Test the time warning system
const fs = require('fs');

// Simulate the current time warning functions (simplified)
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

function isLocationOpen(hours, ukTime) {
  if (hours.parsed_hours) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[ukTime.getDay()];
    const todayHours = hours.parsed_hours[currentDay];
    
    if (!todayHours) return false;
    
    const currentMinutes = ukTime.getHours() * 60 + ukTime.getMinutes();
    const [openHour, openMinute] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMinute] = todayHours.close.split(':').map(Number);
    
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;
    
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }
  return false;
}

function hoursUntilClose(hours, ukTime) {
  if (hours.parsed_hours) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[ukTime.getDay()];
    const todayHours = hours.parsed_hours[currentDay];
    
    if (!todayHours) return null;
    
    const currentMinutes = ukTime.getHours() * 60 + ukTime.getMinutes();
    const [closeHour, closeMinute] = todayHours.close.split(':').map(Number);
    const closeMinutes = closeHour * 60 + closeMinute;
    
    const minutesUntilClose = closeMinutes - currentMinutes;
    return minutesUntilClose > 0 ? minutesUntilClose / 60 : 0;
  }
  return null;
}

// Test the warning system
console.log('🔍 Testing Time Warning System');
console.log('===============================');

const ukTime = getUKTime();
console.log('🕒 Current UK time:', ukTime.toLocaleString('en-GB', { timeZone: 'Europe/London' }));
console.log('📅 Current day:', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][ukTime.getDay()]);

// Load cache
const cache = JSON.parse(fs.readFileSync('opening-hours-cache.json', 'utf-8'));
const locations = Object.values(cache);

console.log('\n📋 Testing each location:');

let shouldWarn = false;
let closedCount = 0;
let closingSoonCount = 0;

locations.forEach((entry, index) => {
  console.log(`\n${index + 1}. ${entry.location_name}:`);
  
  const isOpen = isLocationOpen(entry.opening_hours, ukTime);
  console.log(`   - Currently open: ${isOpen}`);
  
  if (!isOpen) {
    closedCount++;
    shouldWarn = true;
    console.log('   ⚠️ CLOSED - This would trigger a warning');
  } else {
    const hoursLeft = hoursUntilClose(entry.opening_hours, ukTime);
    console.log(`   - Hours until close: ${hoursLeft?.toFixed(2) || 'unknown'}`);
    
    if (hoursLeft !== null && hoursLeft <= 2) {
      closingSoonCount++;
      shouldWarn = true;
      console.log(`   ⏰ CLOSING SOON (${hoursLeft.toFixed(1)}h) - This would trigger a warning`);
    } else {
      console.log('   ✅ Open with plenty of time');
    }
  }
});

console.log('\n🚨 Overall Warning Status:');
console.log('   Should warn:', shouldWarn);
console.log('   Closed locations:', closedCount);
console.log('   Closing soon locations:', closingSoonCount);

if (shouldWarn) {
  console.log('\n✅ The warning system SHOULD be showing warnings right now!');
  console.log('   If not showing on the website, there may be a data loading issue.');
} else {
  console.log('\n✅ No warnings needed - all locations are open with plenty of time.');
}
