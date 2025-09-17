// improved-parsing.js
// Create an improved parsing function that handles the AM/PM text format

const fs = require('fs');

// Function to convert 12-hour AM/PM time to 24-hour format
function convertToHours(timeStr) {
  // Handle formats like "9 am", "12 am", "11:30 pm", etc.
  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!match) return null;
  
  let hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const ampm = match[3].toLowerCase();
  
  // Convert to 24-hour format
  if (ampm === 'am') {
    if (hours === 12) hours = 0; // 12 AM = 0 hours
  } else { // pm
    if (hours !== 12) hours += 12; // 12 PM stays 12, others add 12
  }
  
  return hours;
}

function improvedParseGoogleMapsHTML(html, locationName) {
  try {
    console.log(`🔍 Improved parsing for ${locationName}...`);
    
    // Method 1: Look for the AM/PM format opening hours
    // Pattern: "Day",["time–time"
    const ampmRegex = /"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)"\s*,\s*\[\s*"(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*–\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))"/gi;
    const ampmMatches = [...html.matchAll(ampmRegex)];
    
    if (ampmMatches.length > 0) {
      console.log(`📅 Found ${ampmMatches.length} AM/PM format matches:`);
      
      const extractedHours = {};
      const seenDays = new Set();
      
      ampmMatches.forEach((match, i) => {
        const [, day, openTime, closeTime] = match;
        console.log(`   ${i+1}. ${day}: ${openTime} - ${closeTime}`);
        
        const dayKey = day.toLowerCase();
        
        // Only use the first occurrence of each day
        if (!seenDays.has(dayKey)) {
          seenDays.add(dayKey);
          
          const openHour = convertToHours(openTime);
          const closeHour = convertToHours(closeTime);
          
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
        return {
          opening_hours: {
            parsed_hours: extractedHours
          }
        };
      }
    }
    
    // Method 2: Fall back to the original 24-hour format
    const hoursRegex = /\[\\\"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\\",\d+,\[[^\]]+\],\[\[\\\"[^\\\"]*\\\",\[\[(\d+)\],\[(\d+)\]\]\]\]/gi;
    const matches = [...html.matchAll(hoursRegex)];
    
    if (matches.length > 0) {
      console.log(`📅 Found ${matches.length} 24-hour format matches (fallback)`);
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
          }
        }
      });
      
      if (Object.keys(extractedHours).length >= 3) {
        console.log(`✅ Extracted ${Object.keys(extractedHours).length} days from 24-hour format`);
        return {
          opening_hours: {
            parsed_hours: extractedHours
          }
        };
      }
    }
    
    console.log(`⚠️ No suitable opening hours found for ${locationName}`);
    return null;
    
  } catch (error) {
    console.error(`❌ Error in improved parsing for ${locationName}:`, error);
    return null;
  }
}

// Test the improved parsing on Superbowl
async function testImprovedParsing() {
  console.log('🧪 Testing improved parsing on Superbowl...');
  
  const html = fs.readFileSync('superbowl-debug.html', 'utf-8');
  const result = improvedParseGoogleMapsHTML(html, 'Superbowl');
  
  if (result) {
    console.log('\n📊 Final result:');
    Object.entries(result.opening_hours.parsed_hours).forEach(([day, hours]) => {
      console.log(`   ${day}: ${hours.open} - ${hours.close}`);
    });
  } else {
    console.log('\n❌ No hours extracted');
  }
}

testImprovedParsing();
