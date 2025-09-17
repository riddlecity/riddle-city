const fs = require('fs');

// Test parsing with seenDays logic like the main function
function testLibraryParsingWithSeenDays() {
  console.log('🔍 Testing Library Parsing with seenDays Logic...\n');
  
  try {
    const html = fs.readFileSync('library-debug.html', 'utf8');
    
    const specificPatternRegex = /"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\?",\d+,\[[\d,]+\],\[\[\\?"([^"]*?)\\?"/g;
    let specificMatch;
    const nestedMatches = [];
    const seenDays = new Set();
    
    console.log('Processing matches with seenDays logic...\n');
    
    while ((specificMatch = specificPatternRegex.exec(html)) !== null) {
      const day = specificMatch[1];
      const timeData = specificMatch[2];
      const dayKey = day.toLowerCase();
      
      // Only use the first occurrence of each day
      if (!seenDays.has(dayKey)) {
        seenDays.add(dayKey);
        
        console.log(`📅 FIRST ${day}: "${timeData}"`);
        
        if (timeData === 'Closed' || timeData.toLowerCase().includes('closed')) {
          nestedMatches.push({ day, hours: 'Closed' });
        } else {
          nestedMatches.push({ day, hours: timeData });
        }
      } else {
        console.log(`⏭️  SKIP ${day}: "${timeData}" (already seen)`);
      }
    }
    
    console.log(`\n✅ Final unique matches: ${nestedMatches.length}\n`);
    
    // Show final results
    nestedMatches.forEach(match => {
      console.log(`📋 ${match.day}: ${match.hours}`);
    });
    
  } catch (error) {
    console.error('Error reading library HTML file:', error.message);
  }
}

testLibraryParsingWithSeenDays();