// Script to check and understand the actual riddle order from Supabase
const fs = require('fs');

console.log('🔍 RIDDLE ORDER ANALYSIS BASED ON USER INFO\n');

console.log('✅ USER CONFIRMED ORDER:');
console.log('According to Supabase database order_index:');
console.log('1. Superbowl (1st riddle)');
console.log('2. Central Library (2nd riddle)'); 
console.log('3. ??? (need to determine)');
console.log('4. ??? (need to determine)');
console.log('5. ??? (need to determine)');
console.log('6. ??? (need to determine)\n');

console.log('❌ CURRENT PROBLEM:');
console.log('The warning system shows "Riddles 4, 5, 6 are closed"');
console.log('But if Superbowl is riddle #1 and Library is riddle #2...');
console.log('Then riddles 4, 5, 6 should be different locations!\n');

// Check current time and location status
function getUKTime() {
  return new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/London"}));
}

const cache = JSON.parse(fs.readFileSync('opening-hours-cache.json', 'utf8'));
const ukTime = getUKTime();
const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const currentDay = dayNames[ukTime.getDay()];
const currentMinutes = ukTime.getHours() * 60 + ukTime.getMinutes();

console.log('📊 CURRENT STATUS (', ukTime.toLocaleString('en-GB'), '):\n');

// Map locations by name to Google URLs from cache
const locationUrls = {};
Object.entries(cache).forEach(([url, data]) => {
  locationUrls[data.location_name] = url;
});

// Check each location
const locations = ['Superbowl', 'Central Library', 'Falco Lounge', '200 Degrees', 'Red Robot', 'Spiral City'];

locations.forEach((locationName, index) => {
  const url = Object.keys(cache).find(url => 
    cache[url].location_name.toLowerCase().includes(locationName.toLowerCase()) ||
    locationName.toLowerCase().includes(cache[url].location_name.toLowerCase())
  );
  
  if (!url) {
    console.log(`❓ ${locationName}: Not found in cache`);
    return;
  }
  
  const data = cache[url];
  const hours = data.opening_hours?.parsed_hours;
  
  if (!hours) {
    console.log(`❓ ${locationName}: No hours data`);
    return;
  }
  
  const todayHours = hours[currentDay];
  if (!todayHours) {
    console.log(`❌ ${locationName}: CLOSED TODAY (${currentDay})`);
    return;
  }
  
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
  
  console.log(`${status}: ${locationName} (${todayHours.open} - ${todayHours.close})`);
});

console.log('\n💡 ANALYSIS:');
console.log('If the user says "Riddles 4, 5, 6 are closed", and we see:');
console.log('- Superbowl: OPEN (should be riddle #1)');
console.log('- Central Library: OPEN (should be riddle #2)');
console.log('- Some other locations: CLOSED');
console.log('');
console.log('Then the closed locations must be riddles 4, 5, and 6!');
console.log('This means the riddle IDs (barnsley_r1, barnsley_r2) != display order');

console.log('\n🔧 POTENTIAL FIXES:');
console.log('1. Update getRiddleNumber() to use actual order_index from database');
console.log('2. Or create a mapping from riddle_id to display position');
console.log('3. Or query the database to get correct riddle positions');

console.log('\n⚠️  NEXT STEPS:');
console.log('Need to either:');
console.log('- Query Supabase directly to see actual order_index values');
console.log('- Create an API endpoint to get riddle order');
console.log('- Or update the warning system to use the correct mapping');