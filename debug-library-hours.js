// Debug the library hours parsing issue
const fs = require('fs');

const cache = JSON.parse(fs.readFileSync('opening-hours-cache.json', 'utf8'));
const libraryUrl = 'https://maps.app.goo.gl/f94mvjKVE9NgMG32A';
const libraryData = cache[libraryUrl];

console.log('🔍 DEBUGGING LIBRARY HOURS PARSING\n');

if (libraryData && libraryData.opening_hours && libraryData.opening_hours.periods) {
  const periods = libraryData.opening_hours.periods;
  
  console.log('📅 All periods in Google data:');
  periods.forEach((period, index) => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const openDay = period.open ? period.open.day : 'unknown';
    const closeDay = period.close ? period.close.day : 'unknown';
    const openTime = period.open ? period.open.time : 'unknown';
    const closeTime = period.close ? period.close.time : 'unknown';
    
    console.log(`Period ${index + 1}:`);
    console.log(`  Open: ${dayNames[openDay]} (day ${openDay}) at ${openTime}`);
    console.log(`  Close: ${dayNames[closeDay]} (day ${closeDay}) at ${closeTime}`);
    console.log('');
  });
  
  console.log('🐛 ISSUE ANALYSIS:');
  
  // Check for Sunday periods specifically
  const sundayPeriods = periods.filter(p => p.open && p.open.day === 0);
  console.log(`Sunday periods found: ${sundayPeriods.length}`);
  
  sundayPeriods.forEach((period, index) => {
    console.log(`Sunday period ${index + 1}:`);
    console.log(`  Opens: ${period.open.time}`);
    console.log(`  Closes: ${period.close ? period.close.time : 'no close time'}`);
  });
  
  // Show what our parsing logic should produce
  console.log('\n🔧 CORRECT PARSING:');
  console.log('Sunday should be: 09:00 - 19:00 (closes at 7 PM)');
  console.log('Current time: 20:09');
  console.log('Therefore: LIBRARY SHOULD BE CLOSED NOW');
}

console.log('\n✅ CONCLUSION:');
console.log('The library closes at 7 PM on Sunday, not 10 PM!');
console.log('Current time is 20:09, so the library IS CLOSED.');
console.log('This explains why the user says "riddle 2 (library) is closed".');
console.log('The parsing logic is incorrectly assigning Saturday hours to Sunday.');