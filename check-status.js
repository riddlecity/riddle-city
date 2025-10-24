// Quick test to check current UK time and location statuses using REAL riddle data
const fs = require('fs');

// Get UK time
function getUKTime() {
  return new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/London"}));
}

// Read the cache file
const cache = JSON.parse(fs.readFileSync('opening-hours-cache.json', 'utf8'));

const ukTime = getUKTime();
console.log('🕒 Current UK time:', ukTime.toLocaleString('en-GB', { timeZone: 'Europe/London' }));
console.log('📅 Day of week:', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][ukTime.getDay()]);
console.log('⏰ Current time:', `${ukTime.getHours().toString().padStart(2, '0')}:${ukTime.getMinutes().toString().padStart(2, '0')}`);

console.log('\n📍 ACTUAL Riddle Status Check (using cache URLs):');

// Map cache URLs to riddle info - these are the ACTUAL riddles in order
const riddleMapping = {
  'https://maps.app.goo.gl/HwhzfBt35q4WvzWJ8': { name: 'Falco Lounge', riddle: '??' },
  'https://maps.app.goo.gl/2ckBtY19XnQWj6ea7': { name: 'Spiral City', riddle: '??' },
  'https://maps.app.goo.gl/77Xiczt1k2RNPLfF9': { name: 'Red Robot', riddle: '??' },
  'https://maps.app.goo.gl/NvpzkEAzq6JCD5o49': { name: 'Superbowl', riddle: '??' },
  'https://maps.app.goo.gl/tAHPcM7uvTzod6ZV6': { name: '200 Degrees', riddle: '??' },
  'https://maps.app.goo.gl/f94mvjKVE9NgMG32A': { name: 'Central Library', riddle: '??' }
};

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const currentDay = dayNames[ukTime.getDay()];

console.log('❗ Note: Without database access, riddle numbers are unknown');
console.log('❗ Only checking which locations are open/closed at current time\n');

Object.entries(cache).forEach(([url, data]) => {
  const riddle = riddleMapping[url];
  if (!riddle) {
    console.log(`❓ Unknown location: ${data.location_name} (${url})`);
    return;
  }

  const hours = data.opening_hours?.parsed_hours;
  if (!hours) {
    console.log(`❓ Riddle ${riddle.riddle} (${data.location_name}): No hours data`);
    return;
  }

  const todayHours = hours[currentDay];
  if (!todayHours) {
    console.log(`❌ CLOSED TODAY: ${data.location_name} (${url})`);
    return;
  }

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
  const status = isOpen ? '✅ OPEN' : '❌ CLOSED';
  
  console.log(`${status}: ${data.location_name} (${todayHours.open} - ${todayHours.close})`);
  console.log(`     URL: ${url}`);
});

console.log('\n🔍 Summary: The warning shows "Riddles 4, 5, 6 is now closed"');
console.log('🔍 But based on time calculations:');
console.log('🔍 - Superbowl should be OPEN until 23:00 (current: 19:52)');  
console.log('🔍 - Central Library should be OPEN until 22:00 (current: 19:52)');
console.log('🔍 - This suggests the riddle order mapping is wrong or time calc has a bug');