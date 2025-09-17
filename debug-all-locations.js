// debug-all-locations.js
// Debug all locations to see what opening hours data is available

const fs = require('fs');

async function debugLocation(url, locationName) {
  console.log(`\n🔍 Debugging ${locationName}...`);
  console.log(`📍 URL: ${url}`);
  
  try {
    // Follow redirect
    const resolveResponse = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow'
    });
    
    const fullUrl = resolveResponse.url;
    console.log(`✅ Resolved to: ${fullUrl.substring(0, 80)}...`);
    
    // Fetch the page
    const pageResponse = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = await pageResponse.text();
    console.log(`📄 Page fetched (${html.length} chars)`);
    
    // Test our current regex pattern
    const hoursRegex = /\[\\\"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\\",\d+,\[[^\]]+\],\[\[\\\"[^\\\"]*\\\",\[\[(\d+)\],\[(\d+)\]\]\]\]/gi;
    const matches = [...html.matchAll(hoursRegex)];
    
    console.log(`🔍 Current regex pattern found ${matches.length} matches:`);
    
    if (matches.length > 0) {
      const extractedHours = {};
      const seenDays = new Set();
      
      matches.forEach((match, i) => {
        const [, day, openHour, closeHour] = match;
        console.log(`   ${i+1}. ${day}: ${openHour}:00 - ${closeHour}:00`);
        
        if (day && openHour && closeHour) {
          const dayKey = day.toLowerCase();
          
          if (!seenDays.has(dayKey)) {
            seenDays.add(dayKey);
            extractedHours[dayKey] = {
              open: String(openHour).padStart(2, '0') + ':00',
              close: String(closeHour).padStart(2, '0') + ':00'
            };
          }
        }
      });
      
      console.log(`📅 Unique days extracted: ${Object.keys(extractedHours).length}`);
      Object.entries(extractedHours).forEach(([day, hours]) => {
        console.log(`   ${day}: ${hours.open} - ${hours.close}`);
      });
    }
    
    // Test a broader pattern to catch midnight hours (24 = 0)
    console.log(`\n🔍 Testing broader pattern for midnight hours...`);
    const midnightRegex = /\[\\\"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\\",\d+,\[[^\]]+\],\[\[\\\"[^\\\"]*\\\",\[\[(\d+)\],\[(\d+|0)\]\]\]\]/gi;
    const midnightMatches = [...html.matchAll(midnightRegex)];
    
    console.log(`Found ${midnightMatches.length} matches (including midnight):`);
    midnightMatches.forEach((match, i) => {
      const [, day, openHour, closeHour] = match;
      const displayClose = closeHour === '0' ? '24' : closeHour;
      console.log(`   ${i+1}. ${day}: ${openHour}:00 - ${displayClose}:00`);
    });
    
    // Look for any day-time patterns
    console.log(`\n🔍 Searching for any day references with numbers...`);
    const daySearchRegex = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[^}]*?(\d{1,2})[^}]*?(\d{1,2})/gi;
    const dayMatches = [...html.matchAll(daySearchRegex)];
    
    console.log(`Found ${dayMatches.length} day+number patterns:`);
    dayMatches.slice(0, 10).forEach((match, i) => {
      console.log(`   ${i+1}. ${match[1]}: "${match[0].substring(0, 50).replace(/\s+/g, ' ')}..."`);
    });
    
    // Save HTML for manual inspection
    const filename = `${locationName.toLowerCase()}-debug.html`;
    fs.writeFileSync(filename, html);
    console.log(`💾 HTML saved to ${filename}`);
    
  } catch (error) {
    console.error(`❌ Error debugging ${locationName}:`, error.message);
  }
}

async function debugAllLocations() {
  console.log('🔍 Debugging all locations for opening hours extraction...');
  
  try {
    const cache = JSON.parse(fs.readFileSync('opening-hours-cache.json', 'utf-8'));
    const locations = Object.entries(cache);
    
    // Test each location
    for (let i = 0; i < locations.length; i++) {
      const [url, data] = locations[i];
      const locationName = data.location_name;
      
      await debugLocation(url, locationName);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🎉 Debugging completed!');
    
  } catch (error) {
    console.error('❌ Error in debugging:', error);
  }
}

debugAllLocations();
