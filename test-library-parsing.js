const fs = require('fs');

// Simple test to see what patterns we can extract from library HTML
function testLibraryParsing() {
  console.log('🔍 Testing Library Parsing Logic...\n');
  
  try {
    const html = fs.readFileSync('library-debug.html', 'utf8');
    
    // Test the more specific pattern
    const specificPatternRegex = /"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\?",\d+,\[[\d,]+\],\[\[\\?"([^"]*?)\\?"/g;
    let specificMatch;
    const matches = [];
    
    console.log('Searching for specific pattern matches...\n');
    
    while ((specificMatch = specificPatternRegex.exec(html)) !== null) {
      const day = specificMatch[1];
      const timeData = specificMatch[2];
      
      console.log(`📅 Found: ${day} -> "${timeData}"`);
      matches.push({ day, timeData });
    }
    
    console.log(`\n✅ Total matches found: ${matches.length}`);
    
    // Look for Saturday and Sunday specifically
    console.log('\n🔍 Looking for Saturday and Sunday specifically...');
    
    const saturdayPattern = /"Saturday\\?",\d+,\[[^\]]+\],\[\[\\?"([^"]*?)\\?"/g;
    const sundayPattern = /"Sunday\\?",\d+,\[[^\]]+\],\[\[\\?"([^"]*?)\\?"/g;
    
    const satMatch = saturdayPattern.exec(html);
    const sunMatch = sundayPattern.exec(html);
    
    if (satMatch) {
      console.log(`📅 Saturday: "${satMatch[1]}"`);
    }
    
    if (sunMatch) {
      console.log(`📅 Sunday: "${sunMatch[1]}"`);
    }
    
    // Also search for the exact patterns we found earlier
    console.log('\n🔍 Searching for exact patterns from PowerShell search...');
    
    if (html.includes('9:30 am–4 pm')) {
      console.log('✅ Found "9:30 am–4 pm" in HTML');
    } else {
      console.log('❌ Could not find "9:30 am–4 pm" in HTML');
    }
    
    if (html.includes('Closed')) {
      console.log('✅ Found "Closed" in HTML');
      // Count how many times
      const closedMatches = html.match(/Closed/g);
      console.log(`   Found ${closedMatches ? closedMatches.length : 0} occurrences of "Closed"`);
    } else {
      console.log('❌ Could not find "Closed" in HTML');
    }
    
  } catch (error) {
    console.error('Error reading library HTML file:', error.message);
  }
}

testLibraryParsing();