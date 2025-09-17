// test-parsing-offline.js
// Test the improved parsing using saved HTML files

const fs = require('fs');

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
    console.log(`\n🔍 Parsing Google Maps HTML for: ${locationName}`);
    
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
        console.log(`✅ Extracted ${Object.keys(extractedHours).length} days from AM/PM format`);
        return extractedHours;
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
        console.log(`✅ Extracted ${Object.keys(extractedHours).length} days from numeric format`);
        return extractedHours;
      }
    }
    
    console.log('⚠️ No opening hours found in HTML');
    return null;
    
  } catch (error) {
    console.error('🔍 Error parsing Google Maps HTML:', error);
    return null;
  }
}

function testOfflineParsing() {
  console.log('🧪 Testing improved parsing on saved HTML files...');
  
  const testFiles = [
    { name: 'Superbowl', file: 'superbowl-debug.html' },
    { name: 'Spiral City', file: 'spiral_city-debug.html' },
    { name: '200 Degrees', file: '200degrees-debug.html' },
    { name: 'Red Robot', file: 'redrobot-debug.html' },
    { name: 'Library', file: 'library-debug.html' },
    { name: 'Falco Lounge', file: 'falco_lounge-debug.html' }
  ];
  
  testFiles.forEach(({ name, file }) => {
    try {
      if (fs.existsSync(file)) {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`Testing: ${name}`);
        console.log(`${'='.repeat(50)}`);
        
        const html = fs.readFileSync(file, 'utf-8');
        const result = parseGoogleMapsHTML(html, name);
        
        if (result) {
          console.log(`\n📊 Final extracted hours for ${name}:`);
          Object.entries(result).forEach(([day, hours]) => {
            console.log(`   ${day.padEnd(10)}: ${hours.open} - ${hours.close}`);
          });
        } else {
          console.log(`\n❌ No hours extracted for ${name}`);
        }
      } else {
        console.log(`\n⚠️ File not found: ${file}`);
      }
    } catch (error) {
      console.log(`\n❌ Error testing ${name}: ${error.message}`);
    }
  });
  
  console.log(`\n${'='.repeat(50)}`);
  console.log('🎉 Offline parsing test completed!');
  console.log(`${'='.repeat(50)}`);
}

testOfflineParsing();
