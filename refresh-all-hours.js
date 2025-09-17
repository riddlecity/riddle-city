// refresh-all-hours.js
// Actually update the cache with the new web scraping data

const fs = require('fs');

// Import the actual scraping function
async function scrapeGoogleMapsHours(url, locationName) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    if (response.redirected) {
      console.log('📡 Following redirect...');
      console.log('  ✅ Resolved to:', response.url.substring(0, 80) + '...');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log(`📄 Fetching page content...`);
    console.log(`  ✅ Page fetched (${html.length} chars)`);

    // Parse opening hours from HTML using the corrected method
    return parseGoogleMapsHTML(html, locationName);
  } catch (error) {
    console.error('❌ Error scraping Google Maps hours for', locationName, ':', error);
    return null;
  }
}

// Parse opening hours from Google Maps HTML
function parseGoogleMapsHTML(html, locationName) {
  try {
    console.log('🔍 Parsing Google Maps HTML for:', locationName);
    
    // Method 1: Look for the opening hours in the JavaScript data structure
    // This is where Google embeds the structured opening hours data
    // The data is JSON-encoded with escaped quotes
    const hoursRegex = /\[\\\"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\\",\d+,\[[^\]]+\],\[\[\\\"[^\\\"]*\\\",\[\[(\d+)\],\[(\d+)\]\]\]\]/gi;
    const matches = [...html.matchAll(hoursRegex)];
    
    if (matches.length > 0) {
      console.log(`🔍 Found ${matches.length} structured opening hours matches`);
      const extractedHours = {};
      
      // Track which days we've seen to avoid duplicates
      const seenDays = new Set();
      
      matches.forEach(match => {
        const [, day, openHour, closeHour] = match;
        if (day && openHour && closeHour) {
          const dayKey = day.toLowerCase();
          
          // Only use the first occurrence of each day to avoid mixing data from different venues
          if (!seenDays.has(dayKey)) {
            seenDays.add(dayKey);
            extractedHours[dayKey] = {
              open: String(openHour).padStart(2, '0') + ':00',
              close: String(closeHour).padStart(2, '0') + ':00'
            };
            console.log(`   📅 ${dayKey}: ${openHour}:00 - ${closeHour}:00`);
          }
        }
      });
      
      // Only return if we have a reasonable number of days (at least 3)
      if (Object.keys(extractedHours).length >= 3) {
        console.log('✅ Extracted hours from JavaScript data structure for:', locationName);
        return {
          open_now: false, // We'll calculate this separately
          opening_hours: {
            parsed_hours: extractedHours
          }
        };
      }
    }
    
    console.log('⚠️ No opening hours found in HTML for:', locationName);
    return null;
    
  } catch (error) {
    console.error('🔍 Error parsing Google Maps HTML for', locationName, ':', error);
    return null;
  }
}

async function refreshAllHours() {
  console.log('🔄 Refreshing ALL Opening Hours in Cache...');
  
  try {
    // Read current cache to get the URLs
    const cache = JSON.parse(fs.readFileSync('opening-hours-cache.json', 'utf-8'));
    const locations = Object.entries(cache);
    
    console.log(`📍 Found ${locations.length} locations to refresh`);
    
    const updatedCache = {};
    let successCount = 0;
    
    for (let i = 0; i < locations.length; i++) {
      const [url, data] = locations[i];
      const locationName = data.location_name;
      
      console.log(`\n${i + 1}/${locations.length} Processing: ${locationName}`);
      
      try {
        const result = await scrapeGoogleMapsHours(url, locationName);
        
        if (result && result.opening_hours && result.opening_hours.parsed_hours) {
          console.log(`  ✅ Successfully extracted opening hours for ${locationName}`);
          
          // Update the cache entry with new data
          updatedCache[url] = {
            ...data, // Keep existing data like location_name, etc.
            last_refreshed: new Date().toISOString(),
            opening_hours: result.opening_hours,
            open_now: false // We'll calculate this separately when needed
          };
          
          successCount++;
          
          // Show the extracted hours
          console.log('  📅 Updated hours:');
          Object.entries(result.opening_hours.parsed_hours).forEach(([day, hours]) => {
            console.log(`     ${day}: ${hours.open} - ${hours.close}`);
          });
        } else {
          console.log(`  ⚠️  No opening hours found for ${locationName} - keeping existing data`);
          updatedCache[url] = data; // Keep existing data
        }
        
        // Small delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`  ❌ Error processing ${locationName}: ${error.message}`);
        updatedCache[url] = data; // Keep existing data on error
      }
    }
    
    // Write the updated cache back to file
    fs.writeFileSync('opening-hours-cache.json', JSON.stringify(updatedCache, null, 2));
    
    console.log(`\n🎉 Cache refresh completed!`);
    console.log(`✅ Successfully updated ${successCount} out of ${locations.length} locations`);
    console.log(`📄 Cache file updated with latest opening hours`);
    console.log(`\nYour cache is now up to date with today's opening hours!`);
    
  } catch (error) {
    console.error('❌ Error refreshing cache:', error.message);
  }
}

refreshAllHours();
