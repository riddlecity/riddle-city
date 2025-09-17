// debug-superbowl.js
// Debug the specific Superbowl location to see why we're missing Friday/Saturday midnight hours

const fs = require('fs');

async function debugSuperbowl() {
  try {
    console.log('🔍 Debugging Superbowl opening hours extraction...');
    
    const superbowlUrl = "https://maps.app.goo.gl/DmKGBtCq3KnQaLiX8";
    
    // Follow redirect to get full URL
    console.log('📡 Following redirect...');
    const resolveResponse = await fetch(superbowlUrl, {
      method: 'HEAD',
      redirect: 'follow'
    });
    
    const fullUrl = resolveResponse.url;
    console.log('✅ Full URL:', fullUrl);
    
    // Fetch the page
    console.log('📄 Fetching page...');
    const pageResponse = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = await pageResponse.text();
    console.log(`✅ Page fetched (${html.length} chars)`);
    
    // Save HTML for inspection
    fs.writeFileSync('superbowl-debug.html', html);
    console.log('💾 HTML saved to superbowl-debug.html');
    
    // Test multiple regex patterns
    console.log('\n🔍 Testing different regex patterns...');
    
    // Pattern 1: Current pattern with escaped quotes
    const pattern1 = /\[\\\"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\\",\d+,\[[^\]]+\],\[\[\\\"[^\\\"]*\\\",\[\[(\d+)\],\[(\d+)\]\]\]\]/gi;
    const matches1 = [...html.matchAll(pattern1)];
    console.log(`\nPattern 1 (Escaped quotes): Found ${matches1.length} matches`);
    matches1.forEach((match, i) => {
      console.log(`  ${i+1}. ${match[1]}: ${match[2]}:00 - ${match[3]}:00`);
    });
    
    // Pattern 2: Look for hours in different format
    const pattern2 = /\["(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)",\d+,\[[^\]]+\],\[\[\"[^\"]*\",\[\[(\d+)\],\[(\d+)\]\]\]\]/gi;
    const matches2 = [...html.matchAll(pattern2)];
    console.log(`\nPattern 2 (Regular quotes): Found ${matches2.length} matches`);
    matches2.forEach((match, i) => {
      console.log(`  ${i+1}. ${match[1]}: ${match[2]}:00 - ${match[3]}:00`);
    });
    
    // Pattern 3: Look for any time references
    const timePattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[^,]*,\d+[^,]*,\[[^\]]+\][^,]*,\[\[[^,]*,\[\[(\d+)\],\[(\d+)\]\]\]/gi;
    const timeMatches = [...html.matchAll(timePattern)];
    console.log(`\nPattern 3 (Time references): Found ${timeMatches.length} matches`);
    timeMatches.forEach((match, i) => {
      console.log(`  ${i+1}. ${match[1]}: ${match[2]}:00 - ${match[3]}:00`);
    });
    
    // Pattern 4: Look for 24 hour format (midnight = 0)
    const midnightPattern = /\[\\\"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\\",\d+,\[[^\]]+\],\[\[\\\"[^\\\"]*\\\",\[\[(\d+)\],\[(\d+|0)\]\]\]\]/gi;
    const midnightMatches = [...html.matchAll(midnightPattern)];
    console.log(`\nPattern 4 (Including midnight): Found ${midnightMatches.length} matches`);
    midnightMatches.forEach((match, i) => {
      const closeHour = match[3] === '0' ? '24' : match[3]; // Convert 0 to 24 for midnight
      console.log(`  ${i+1}. ${match[1]}: ${match[2]}:00 - ${closeHour}:00`);
    });
    
    // Look for any mentions of specific days with times
    console.log('\n🔍 Searching for day-specific patterns...');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    days.forEach(day => {
      const dayRegex = new RegExp(`${day}[^}]*?([0-9]{1,2})[^}]*?([0-9]{1,2})`, 'gi');
      const dayMatches = [...html.matchAll(dayRegex)];
      if (dayMatches.length > 0) {
        console.log(`  ${day}: Found ${dayMatches.length} potential time matches`);
        dayMatches.slice(0, 3).forEach((match, i) => {
          console.log(`    ${i+1}. "${match[0].substring(0, 50)}..."`);
        });
      }
    });
    
    // Look for JSON-LD structured data
    console.log('\n🔍 Looking for JSON-LD structured data...');
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/gs);
    if (jsonLdMatches) {
      console.log(`Found ${jsonLdMatches.length} JSON-LD scripts`);
      jsonLdMatches.forEach((match, i) => {
        try {
          const jsonContent = match.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, '');
          const data = JSON.parse(jsonContent);
          if (data.openingHours || data.openingHoursSpecification) {
            console.log(`  JSON-LD ${i+1}: Contains opening hours data`);
            console.log('    ', JSON.stringify(data.openingHours || data.openingHoursSpecification, null, 2));
          }
        } catch (e) {
          console.log(`  JSON-LD ${i+1}: Parse error`);
        }
      });
    } else {
      console.log('No JSON-LD scripts found');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugSuperbowl();
