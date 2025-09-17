const fs = require('fs');

// Test parsing for all locations mentioned by user
function testAllLocations() {
  const locations = [
    { file: 'library-debug.html', name: 'Library' },
    { file: '200degrees-debug.html', name: '200 Degrees' },
    { file: 'superbowl-debug.html', name: 'Superbowl' }
  ];
  
  locations.forEach(location => {
    console.log(`\n🔍 Testing ${location.name}...\n`);
    testLocationParsing(location.file, location.name);
  });
}

function testLocationParsing(filename, locationName) {
  try {
    const html = fs.readFileSync(filename, 'utf8');
    
    const specificPatternRegex = /"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\?",\d+,\[[\d,]+\],\[\[\\?"([^"]*?)\\?"/g;
    let specificMatch;
    const matches = [];
    const seenDays = new Set();
    
    while ((specificMatch = specificPatternRegex.exec(html)) !== null) {
      const day = specificMatch[1];
      const timeData = specificMatch[2];
      const dayKey = day.toLowerCase();
      
      if (!seenDays.has(dayKey)) {
        seenDays.add(dayKey);
        matches.push({ day, timeData });
        console.log(`📅 ${day}: "${timeData}"`);
      }
    }
    
    console.log(`✅ Found ${matches.length} unique days for ${locationName}`);
    
    // Check for specific issues mentioned by user
    if (locationName === 'Library') {
      console.log('\n🎯 Library verification:');
      const saturday = matches.find(m => m.day === 'Saturday');
      const sunday = matches.find(m => m.day === 'Sunday');
      console.log(`   Saturday: ${saturday ? saturday.timeData : 'NOT FOUND'} (should be "9:30 am–4 pm")`);
      console.log(`   Sunday: ${sunday ? sunday.timeData : 'NOT FOUND'} (should be "Closed")`);
    }
    
    if (locationName === '200 Degrees') {
      console.log('\n🎯 200 Degrees verification:');
      const sunday = matches.find(m => m.day === 'Sunday');
      console.log(`   Sunday: ${sunday ? sunday.timeData : 'NOT FOUND'} (should be "8:30 am–4:30 pm")`);
    }
    
    if (locationName === 'Superbowl') {
      console.log('\n🎯 Superbowl verification:');
      const friday = matches.find(m => m.day === 'Friday');
      const saturday = matches.find(m => m.day === 'Saturday');
      console.log(`   Friday: ${friday ? friday.timeData : 'NOT FOUND'} (should be "9 am–12 am")`);
      console.log(`   Saturday: ${saturday ? saturday.timeData : 'NOT FOUND'} (should be "9 am–12 am")`);
    }
    
  } catch (error) {
    console.error(`Error reading ${filename}:`, error.message);
  }
}

testAllLocations();