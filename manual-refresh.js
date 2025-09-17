// manual-refresh.js
// Manually trigger cache refresh using the same logic as the API

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
      
      matches.forEach(match => {
        const [, day, openHour, closeHour] = match;
        if (day && openHour && closeHour) {
          const dayKey = day.toLowerCase();
          extractedHours[dayKey] = {
            open: String(openHour).padStart(2, '0') + ':00',
            close: String(closeHour).padStart(2, '0') + ':00'
          };
          console.log(`   📅 ${dayKey}: ${openHour}:00 - ${closeHour}:00`);
        }
      });
      
      if (Object.keys(extractedHours).length > 0) {
        console.log('✅ Extracted hours from JavaScript data structure for:', locationName);
        return {
          open_now: false, // We'll calculate this separately
          parsed_hours: extractedHours,
          weekday_text: generateWeekdayText(extractedHours)
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

// Helper function to generate weekday text
function generateWeekdayText(hours) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const weekdayText = [];
  
  days.forEach((day, index) => {
    if (hours[day]) {
      const openTime = convertTo12Hour(hours[day].open);
      const closeTime = convertTo12Hour(hours[day].close);
      weekdayText.push(`${dayNames[index]}: ${openTime} – ${closeTime}`);
    } else {
      weekdayText.push(`${dayNames[index]}: Closed`);
    }
  });
  
  return weekdayText;
}

// Helper function to convert 24-hour time to 12-hour format
function convertTo12Hour(time24) {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minutes} ${period}`;
}

async function manualRefresh() {
  console.log('🔄 Manual Opening Hours Refresh Starting...');
  
  try {
    // Read current cache to get the URLs
    const cache = JSON.parse(fs.readFileSync('opening-hours-cache.json', 'utf-8'));
    const locations = Object.entries(cache);
    
    console.log(`📍 Found ${locations.length} locations to refresh`);
    
    for (let i = 0; i < locations.length; i++) {
      const [url, data] = locations[i];
      const locationName = data.location_name;
      
      console.log(`\n${i + 1}/${locations.length} Processing: ${locationName}`);
      
      try {
        const result = await scrapeGoogleMapsHours(url, locationName);
        
        if (result) {
          console.log(`  ✅ Successfully extracted opening hours for ${locationName}`);
          
          // Show the extracted hours
          if (result.parsed_hours) {
            console.log('  📅 Extracted hours:');
            Object.entries(result.parsed_hours).forEach(([day, hours]) => {
              console.log(`     ${day}: ${hours.open} - ${hours.close}`);
            });
          }
        } else {
          console.log(`  ⚠️  No opening hours found for ${locationName}`);
        }
        
        // Small delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`  ❌ Error processing ${locationName}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Manual refresh test completed!');
    console.log('\nNote: This was just a test - to actually update the cache,');
    console.log('you would run the full API endpoint that includes the parsing and saving logic.');
    
  } catch (error) {
    console.error('❌ Error in manual refresh:', error.message);
  }
}

manualRefresh();
