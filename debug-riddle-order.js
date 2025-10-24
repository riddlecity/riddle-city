// Debug script to understand the riddle ordering issue
const fs = require('fs');

console.log('🔍 RIDDLE ORDERING DEBUG ANALYSIS\n');

console.log('❌ CURRENT PROBLEM:');
console.log('User warning shows: "Access to Riddles 4, 5, 6 is now closed"');
console.log('But according to our time check at 20:03 UK time:');
console.log('- ✅ Superbowl: OPEN until 23:00');
console.log('- ✅ Central Library: OPEN until 22:00'); 
console.log('- ❌ 200 Degrees: CLOSED (16:30)');
console.log('- ❌ Spiral City: CLOSED (Sunday)');
console.log('- ❌ Red Robot: CLOSED (Sunday)\n');

console.log('🧩 THE CORE ISSUE:');
console.log('The warning system extracts riddle numbers using getRiddleNumber():');
console.log('- "barnsley_r1" → "1"');
console.log('- "barnsley_r2" → "2"'); 
console.log('- "barnsley_r3" → "3"');
console.log('- "barnsley_r4" → "4"');
console.log('- "barnsley_r5" → "5"');
console.log('- "barnsley_r6" → "6"\n');

console.log('🎯 BUT THE ASSUMPTIONS ARE WRONG:');
console.log('The getRiddleNumber() function assumes:');
console.log('- barnsley_r4 = Riddle 4');
console.log('- barnsley_r5 = Riddle 5'); 
console.log('- barnsley_r6 = Riddle 6\n');

console.log('🔄 HOWEVER, THE DATABASE USES order_index:');
console.log('The API uses .order("order_index") to sort riddles properly.');
console.log('This means riddle IDs like "barnsley_r4" might not be the 4th riddle!\n');

console.log('📊 ACTUAL LOCATION STATUS (20:03 Sunday):');
const cache = JSON.parse(fs.readFileSync('opening-hours-cache.json', 'utf8'));

const locationStatus = {
  'Falco Lounge': '✅ OPEN (09:00-22:00)',
  'Spiral City': '❌ CLOSED (Sunday)', 
  'Red Robot': '❌ CLOSED (Sunday)',
  'Superbowl': '✅ OPEN (09:00-23:00)',
  '200 Degrees': '❌ CLOSED (08:30-16:30)',
  'Central Library': '✅ OPEN (09:00-22:00)'
};

Object.entries(locationStatus).forEach(([name, status]) => {
  console.log(`- ${status}: ${name}`);
});

console.log('\n💡 SOLUTION NEEDED:');
console.log('1. Need to determine actual riddle order from database order_index');
console.log('2. Map riddle IDs to their correct position (1st, 2nd, 3rd, etc.)');
console.log('3. Update warning system to show correct riddle numbers');
console.log('4. Or verify if the warning itself is using wrong riddle data\n');

console.log('🎲 LIKELY SCENARIO:');
console.log('If "Riddles 4, 5, 6 are closed", and the closed locations are:');
console.log('- Spiral City, Red Robot, 200 Degrees');
console.log('Then these might be the actual 4th, 5th, and 6th riddles by order_index!');
console.log('The riddle IDs (barnsley_r1, barnsley_r2, etc.) may not match display order.');