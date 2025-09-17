// test-improved-scraping.js
// Test the improved scraping with all locations

const fs = require('fs');

// Import the improved scraping function
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
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log(`📄 Page fetched (${html.length} chars)`);

    // Parse opening hours from HTML using the improved method
    return parseGoogleMapsHTML(html, locationName);
  } catch (error) {
    console.error('❌ Error scraping Google Maps hours for', locationName, ':', error);
    return null;
  }
}

// Helper function to convert 12-hour AM/PM time to 24-hour format
function convertAMPMToHours(timeStr) {
  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!match) return null;
  
  let hours = parseInt(match[1]);
  const ampm = match[3].toLowerCase();
  
  // Convert to 24-hour format
  if (ampm === 'am') {
    if (hours === 12) hours = 0; // 12 AM = 0 hours
  } else { // pm
    if (hours !== 12) hours += 12; // 12 PM stays 12, others add 12
  }
  
  return hours;
}

// Parse opening hours from Google Maps HTML with improved method
function parseGoogleMapsHTML(html, locationName) {
  try {
    console.log('🔍 Parsing Google Maps HTML for:', locationName);
    
    // Method 1: Look for AM/PM format opening hours (most complete data)
    // Pattern: "Day",["time–time"] or "Day",["time-time"]
    const ampmRegex = /"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)"\s*,\s*\[\s*"(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[–-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))"/gi;
    const ampmMatches = [...html.matchAll(ampmRegex)];
    
    if (ampmMatches.length > 0) {
      console.log(`🔍 Found ${ampmMatches.length} AM/PM format matches`);
      
      const extractedHours = {};
      const seenDays = new Set();
      
      ampmMatches.forEach((match) => {
        const [, day, openTime, closeTime] = match;
        console.log(`   📅 ${day}: ${openTime} - ${closeTime}`);
        
        const dayKey = day.toLowerCase();
        
        // Only use the first occurrence of each day
        if (!seenDays.has(dayKey)) {
          seenDays.add(dayKey);
          
          const openHour = convertAMPMToHours(openTime);
          const closeHour = convertAMPMToHours(closeTime);
          
          if (openHour !== null && closeHour !== null) {
            extractedHours[dayKey] = {
              open: String(openHour).padStart(2, '0') + ':00',
              close: String(closeHour).padStart(2, '0') + ':00'
            };
          }
        }
      });
      
      if (Object.keys(extractedHours).length >= 3) {
        console.log('✅ Extracted hours from AM/PM format for:', locationName);
        return {
          open_now: false,
          opening_hours: {
            parsed_hours: extractedHours
          }
        };
      }
    }
    
    // Method 2: Fallback to 24-hour numeric format
    const hoursRegex = /\[\\\"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\\",\d+,\[[^\]]+\],\[\[\\\"[^\\\"]*\\\",\[\[(\d+)\],\[(\d+)\]\]\]\]/gi;
    const matches = [...html.matchAll(hoursRegex)];
    
    if (matches.length > 0) {
      console.log(`🔍 Found ${matches.length} numeric format matches (fallback)`);
      const extractedHours = {};
      const seenDays = new Set();
      
      matches.forEach(match => {
        const [, day, openHour, closeHour] = match;
        if (day && openHour && closeHour) {
          const dayKey = day.toLowerCase();
          
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
      
      if (Object.keys(extractedHours).length >= 3) {
        console.log('✅ Extracted hours from numeric format for:', locationName);
        return {
          open_now: false,
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

async function testImprovedScraping() {
  console.log('🧪 Testing improved scraping on all locations...');
  
  try {
    const cache = JSON.parse(fs.readFileSync('opening-hours-cache.json', 'utf-8'));
    const locations = Object.entries(cache);
    
    console.log(`📍 Found ${locations.length} locations to test\n`);
    
    for (let i = 0; i < locations.length; i++) {
      const [url, data] = locations[i];
      const locationName = data.location_name;
      
      console.log(`\n${i + 1}/${locations.length} Testing: ${locationName}`);
      console.log(`🔗 URL: ${url}`);
      
      try {
        const result = await scrapeGoogleMapsHours(url, locationName);
        
        if (result && result.opening_hours && result.opening_hours.parsed_hours) {
          console.log(`✅ Success! Extracted ${Object.keys(result.opening_hours.parsed_hours).length} days:`);
          Object.entries(result.opening_hours.parsed_hours).forEach(([day, hours]) => {
            console.log(`   ${day}: ${hours.open} - ${hours.close}`);
          });
        } else {
          console.log(`❌ No hours extracted for ${locationName}`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`❌ Error testing ${locationName}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Improved scraping test completed!');
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

testImprovedScraping();
