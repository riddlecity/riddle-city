// find-exact-pattern.js
// Find the exact pattern in the HTML

const fs = require('fs');

function findExactPattern() {
  console.log('🔍 Finding exact AM/PM pattern in Superbowl HTML...');
  
  const html = fs.readFileSync('superbowl-debug.html', 'utf-8');
  
  // Search for Friday specifically
  console.log('\n1. Searching for "Friday" occurrences...');
  const fridayMatches = html.match(/Friday[^}]{0,100}/gi);
  if (fridayMatches) {
    console.log(`   Found ${fridayMatches.length} Friday occurrences:`);
    fridayMatches.slice(0, 5).forEach((match, i) => {
      console.log(`   ${i+1}. "${match}..."`);
    });
  }
  
  // Search for the 9 am–12 am pattern specifically
  console.log('\n2. Searching for "9 am–12 am" pattern...');
  const timeMatches = html.match(/9\s*am[^}]*12\s*am/gi);
  if (timeMatches) {
    console.log(`   Found ${timeMatches.length} time matches:`);
    timeMatches.forEach((match, i) => {
      console.log(`   ${i+1}. "${match}"`);
    });
  }
  
  // Search for any AM/PM times
  console.log('\n3. Searching for any AM/PM times...');
  const ampmTimes = html.match(/\d{1,2}\s*(?:am|pm)/gi);
  if (ampmTimes) {
    console.log(`   Found ${ampmTimes.length} AM/PM times:`);
    const unique = [...new Set(ampmTimes)];
    console.log(`   Unique times: ${unique.slice(0, 10).join(', ')}`);
  }
  
  // Look for the specific pattern we know exists: ["9 am–12 am"
  console.log('\n4. Searching for ["9 am–12 am" pattern...');
  const bracketPattern = html.match(/\["9\s*am[^"]*12\s*am"[^\]]*\]/gi);
  if (bracketPattern) {
    console.log(`   Found ${bracketPattern.length} bracket patterns:`);
    bracketPattern.forEach((match, i) => {
      console.log(`   ${i+1}. "${match}"`);
    });
  }
  
  // Look for day + bracket + time pattern
  console.log('\n5. Searching for Day + bracket + time pattern...');
  const dayBracketPattern = html.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)"[^[]*\[[^"]*"[^"]*(?:am|pm)[^"]*"/gi);
  if (dayBracketPattern) {
    console.log(`   Found ${dayBracketPattern.length} day+bracket patterns:`);
    dayBracketPattern.forEach((match, i) => {
      console.log(`   ${i+1}. "${match}"`);
    });
  }
}

findExactPattern();
