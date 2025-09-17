// analyze-superbowl-hours.js
// Analyze the Superbowl HTML to understand the data structure

const fs = require('fs');

function analyzeSuperbowlHours() {
  console.log('🔍 Analyzing Superbowl opening hours data structure...');
  
  const html = fs.readFileSync('superbowl-debug.html', 'utf-8');
  
  // Look for different patterns that might contain opening hours
  console.log('\n1. Looking for "Friday" with times...');
  const fridayMatches = html.match(/Friday[^}]*?(\d{1,2})[^}]*?([apm]{2})[^}]*?(\d{1,2})[^}]*?([apm]{2})/gi);
  if (fridayMatches) {
    console.log(`   Found ${fridayMatches.length} Friday patterns:`);
    fridayMatches.slice(0, 5).forEach((match, i) => {
      console.log(`   ${i+1}. "${match.substring(0, 100)}..."`);
    });
  }
  
  // Look for hours in array format
  console.log('\n2. Looking for hours arrays...');
  const hoursArrays = html.match(/\["(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)"[^\]]*\]/gi);
  if (hoursArrays) {
    console.log(`   Found ${hoursArrays.length} day arrays:`);
    hoursArrays.forEach((match, i) => {
      console.log(`   ${i+1}. ${match.substring(0, 80)}...`);
    });
  }
  
  // Look specifically for opening hours structures
  console.log('\n3. Looking for opening hours data structures...');
  const openingHoursRegex = /"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)"[^}]*?"(\d{1,2}[^"]*[ap]m)[^}]*?"(\d{1,2}[^"]*[ap]m)/gi;
  const openingMatches = [...html.matchAll(openingHoursRegex)];
  if (openingMatches.length > 0) {
    console.log(`   Found ${openingMatches.length} opening hours structures:`);
    openingMatches.forEach((match, i) => {
      console.log(`   ${i+1}. ${match[1]}: "${match[2]}" - "${match[3]}"`);
    });
  }
  
  // Look for the specific format we saw in the debug output
  console.log('\n4. Looking for "am–" patterns...');
  const amPatterns = html.match(/"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)"[^"]*"(\d{1,2}\s*am–\d{1,2}[^"]*)/gi);
  if (amPatterns) {
    console.log(`   Found ${amPatterns.length} am– patterns:`);
    amPatterns.forEach((match, i) => {
      console.log(`   ${i+1}. ${match.substring(0, 60)}...`);
    });
  }
  
  // Look for the specific Superbowl Friday pattern we know exists
  console.log('\n5. Looking for Friday 9 am–12 pattern...');
  const fridaySpecific = html.match(/Friday[^}]*?9[^}]*?am[^}]*?12[^}]*?am/gi);
  if (fridaySpecific) {
    console.log(`   Found ${fridaySpecific.length} Friday 9am-12am patterns:`);
    fridaySpecific.forEach((match, i) => {
      console.log(`   ${i+1}. "${match}"`);
    });
  }
  
  // Let's try to find any mention of midnight/12 am
  console.log('\n6. Looking for midnight/12 am patterns...');
  const midnightPatterns = html.match(/12[^}]*?am/gi);
  if (midnightPatterns) {
    console.log(`   Found ${midnightPatterns.length} midnight patterns:`);
    midnightPatterns.slice(0, 10).forEach((match, i) => {
      console.log(`   ${i+1}. "${match}"`);
    });
  }
}

analyzeSuperbowlHours();
