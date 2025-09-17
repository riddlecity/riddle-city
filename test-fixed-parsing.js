// test-fixed-parsing.js
// Test the fixed parsing function with the actual HTML files

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

// Fixed parsing function
function parseGoogleMapsHTML(html, locationName) {
  try {
    console.log(`🔍 Testing fixed parsing for ${locationName}...`);
    
    // Method 1: Look for AM/PM format opening hours (most complete data)
    // Pattern: ["Day",["time–time"]] - this captures the escaped JSON format in Google Maps
    const ampmRegex = /\[\\?"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\?"\s*,\s*\[\\?"(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[–-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\\?"/gi;
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
        return {
          open_now: false,
          parsed_hours: extractedHours,
          weekday_text: generateWeekdayText(extractedHours)
        };
      }
    }
    
    // Method 2: Fallback to 24-hour numeric format (existing logic)
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
        return {
          open_now: false,
          parsed_hours: extractedHours,
          weekday_text: generateWeekdayText(extractedHours)
        };
      }
    }
    
    console.log(`⚠️ No suitable opening hours found for ${locationName}`);
    return null;
    
  } catch (error) {
    console.error(`❌ Error in parsing for ${locationName}:`, error);
    return null;
  }
}

// Test locations that had issues
async function testFixedParsing() {
  console.log('🧪 Testing fixed parsing on problem locations...\n');
  
  const testLocations = [
    { file: 'superbowl-debug.html', name: 'Superbowl' },
    { file: 'spiral_city-debug.html', name: 'Spiral City' },
    { file: '200degrees-debug.html', name: '200 Degrees' },
    { file: 'library-debug.html', name: 'Library' }
  ];
  
  for (const location of testLocations) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Testing: ${location.name}`);
    console.log(`${'='.repeat(50)}`);
    
    try {
      const html = fs.readFileSync(location.file, 'utf-8');
      const result = parseGoogleMapsHTML(html, location.name);
      
      if (result && result.parsed_hours) {
        console.log(`\n📊 Final extracted hours for ${location.name}:`);
        Object.entries(result.parsed_hours).forEach(([day, hours]) => {
          console.log(`   ${day}: ${hours.open} - ${hours.close}`);
        });
        
        console.log(`\n📝 Weekday text:`);
        if (result.weekday_text) {
          result.weekday_text.forEach(text => {
            console.log(`   ${text}`);
          });
        }
      } else {
        console.log(`\n❌ No hours extracted for ${location.name}`);
      }
    } catch (error) {
      console.log(`\n❌ Error reading file for ${location.name}: ${error.message}`);
    }
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log('Testing completed!');
  console.log(`${'='.repeat(50)}`);
}

testFixedParsing();