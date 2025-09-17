// find-exact-structure.js
// Find the exact structure of the opening hours data

const fs = require('fs');

function findExactStructure() {
  console.log('🔍 Finding exact opening hours structure...');
  
  const html = fs.readFileSync('superbowl-debug.html', 'utf-8');
  
  // Look for the opening hours array structure - look for patterns with days and times
  console.log('\n1. Looking for array structures with days...');
  const dayArrayPattern = html.match(/\[\["(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)"[^\]]*\]/gi);
  if (dayArrayPattern) {
    console.log(`Found ${dayArrayPattern.length} day array patterns:`);
    dayArrayPattern.forEach((match, i) => {
      console.log(`${i+1}. ${match.substring(0, 200)}...`);
    });
  }
  
  // Look for the specific Friday pattern we saw
  console.log('\n2. Looking for Friday opening hours...');
  const fridayPattern = html.match(/\[\["Friday"[^\]]*\]/gi);
  if (fridayPattern) {
    console.log(`Found ${fridayPattern.length} Friday patterns:`);
    fridayPattern.forEach((match, i) => {
      console.log(`${i+1}. ${match}`);
    });
  }
  
  // Extract the larger array structure that contains all days
  console.log('\n3. Looking for the complete opening hours array...');
  const completePattern = html.match(/\[\[\["(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)"[^\]]*\][^\]]*\]/gi);
  if (completePattern) {
    console.log(`Found ${completePattern.length} complete patterns:`);
    completePattern.forEach((match, i) => {
      console.log(`${i+1}. ${match.substring(0, 300)}...`);
    });
  }
  
  // Look for the entire opening hours structure - might be a larger array
  console.log('\n4. Looking for multi-day array structure...');
  const multiDayPattern = html.match(/\[\[\["Tuesday"[^}]{0,1000}\[\["Saturday"/gi);
  if (multiDayPattern) {
    console.log(`Found ${multiDayPattern.length} multi-day patterns:`);
    multiDayPattern.forEach((match, i) => {
      // Show just the beginning and end
      console.log(`${i+1}. ${match.substring(0, 200)}...${match.substring(match.length-200)}`);
    });
  }
}

findExactStructure();
