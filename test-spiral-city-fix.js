const fs = require('fs');

// Helper function to convert AM/PM time to 24-hour format - IMPROVED
function convertAMPMToHours(timeStr) {
  if (!timeStr) return null;
  
  // Clean up the time string
  const cleanTime = timeStr.trim().toLowerCase();
  
  // Handle midnight special case
  if (cleanTime.includes('12') && cleanTime.includes('am')) {
    const match = cleanTime.match(/12(?::(\d{2}))?/);
    if (match) {
      const minutes = match[1] ? parseInt(match[1]) : 0;
      return 0 + (minutes / 60); // 12 AM = 0 hours
    }
  }
  
  // Handle noon special case  
  if (cleanTime.includes('12') && cleanTime.includes('pm')) {
    const match = cleanTime.match(/12(?::(\d{2}))?/);
    if (match) {
      const minutes = match[1] ? parseInt(match[1]) : 0;
      return 12 + (minutes / 60); // 12 PM = 12 hours
    }
  }
  
  // Regular AM/PM parsing
  const match = cleanTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (match) {
    let hour = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const period = match[3];
    
    if (period === 'pm' && hour !== 12) {
      hour += 12;
    } else if (period === 'am' && hour === 12) {
      hour = 0;
    }
    
    return hour + (minutes / 60);
  }
  
  // NEW: Handle times without explicit AM/PM (assume context from other time)
  const numericMatch = cleanTime.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (numericMatch) {
    const hour = parseInt(numericMatch[1]);
    const minutes = numericMatch[2] ? parseInt(numericMatch[2]) : 0;
    
    // If it's 12, assume it's noon (12 PM) since most businesses are open during day
    if (hour === 12) {
      return 12 + (minutes / 60);
    }
    // If it's a small number (1-11), could be PM for business hours
    else if (hour >= 1 && hour <= 11) {
      return hour + (minutes / 60); // Return as-is, will need context to determine AM/PM
    }
  }
  
  return null;
}

// Generate weekday text from hours object
function generateWeekdayText(extractedHours) {
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const weekdayText = [];
  
  dayOrder.forEach(day => {
    if (extractedHours[day]) {
      if (extractedHours[day].closed) {
        weekdayText.push(`${day.charAt(0).toUpperCase() + day.slice(1)}: Closed`);
      } else {
        const openTime = extractedHours[day].open;
        const closeTime = extractedHours[day].close;
        weekdayText.push(`${day.charAt(0).toUpperCase() + day.slice(1)}: ${openTime}–${closeTime}`);
      }
    }
  });
  
  return weekdayText;
}

// NEW: Parse Spiral City's nested array format
function parseGoogleMapsHTML(html, locationName) {
  try {
    console.log('🔍 Parsing Google Maps HTML for:', locationName);
    
    // Method 1: Look for nested array format (like Spiral City uses)
    // Pattern: [["Day",dayNumber,[date],[["time–time",[[hour],[hour,minute]]]],status,type]
    const nestedArrayRegex = /\[\\?"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\?",\d+,\[[^\]]+\],\[\[\\?"([^"]*?)\\?",/g;
    let nestedMatch;
    const nestedMatches = [];
    
    while ((nestedMatch = nestedArrayRegex.exec(html)) !== null) {
      const day = nestedMatch[1];
      const timeRange = nestedMatch[2];
      
      console.log(`   📅 Nested format found - ${day}: ${timeRange}`);
      
      if (timeRange === 'Closed' || timeRange.toLowerCase().includes('closed')) {
        nestedMatches.push({ day, hours: 'Closed' });
      } else {
        nestedMatches.push({ day, hours: timeRange });
      }
    }
    
    if (nestedMatches.length > 0) {
      console.log(`🔍 Found ${nestedMatches.length} nested array format matches`);
      
      const extractedHours = {};
      const seenDays = new Set();
      
      nestedMatches.forEach((match) => {
        const dayKey = match.day.toLowerCase();
        
        // Only use the first occurrence of each day
        if (!seenDays.has(dayKey)) {
          seenDays.add(dayKey);
          
          if (match.hours === 'Closed') {
            extractedHours[dayKey] = { closed: true };
          } else {
            // Parse time range like "12–10:30 pm" or "11 am–11:30 pm"
            const timeMatch = match.hours.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[–-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
            if (timeMatch) {
              let openTime = timeMatch[1].trim();
              let closeTime = timeMatch[2].trim();
              
              console.log(`      Parsing times: "${openTime}" to "${closeTime}"`);
              
              // Handle cases where only the closing time has AM/PM
              // If opening time has no AM/PM but closing time does, infer the opening time's period
              if (!/am|pm/i.test(openTime) && /pm/i.test(closeTime)) {
                // If close time is PM and open time is a single digit or 12, it's likely PM too
                const openHour = parseInt(openTime);
                if (openHour === 12 || (openHour >= 1 && openHour <= 11)) {
                  openTime += ' pm';
                  console.log(`      Inferred opening time: "${openTime}"`);
                }
              }
              
              const openHour = convertAMPMToHours(openTime);
              const closeHour = convertAMPMToHours(closeTime);
              
              if (openHour !== null && closeHour !== null) {
                extractedHours[dayKey] = {
                  open: String(Math.floor(openHour)).padStart(2, '0') + ':' + String(Math.round((openHour % 1) * 60)).padStart(2, '0'),
                  close: String(Math.floor(closeHour)).padStart(2, '0') + ':' + String(Math.round((closeHour % 1) * 60)).padStart(2, '0')
                };
                console.log(`      Converted to: ${extractedHours[dayKey].open} - ${extractedHours[dayKey].close}`);
              } else {
                console.log(`      Failed to convert times (open: ${openHour}, close: ${closeHour})`);
              }
            } else {
              console.log(`      No time pattern match found in: "${match.hours}"`);
            }
          }
        }
      });
      
      if (Object.keys(extractedHours).length >= 3) {
        console.log('✅ Extracted hours from nested array format for:', locationName);
        return {
          open_now: false,
          parsed_hours: extractedHours,
          weekday_text: generateWeekdayText(extractedHours)
        };
      }
    }
    
    console.log('❌ No nested array hours data found');
    return null;
  } catch (error) {
    console.error('Error parsing:', error);
    return null;
  }
}

// Test specifically with Spiral City
console.log('🧪 Testing Spiral City nested array parsing...\n');

if (fs.existsSync('spiral_city-debug.html')) {
  const html = fs.readFileSync('spiral_city-debug.html', 'utf8');
  
  console.log('📄 File loaded, searching for patterns...\n');
  
  // First, let's see what patterns exist
  const testPattern = /\[\\?"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\?",\d+,\[[^\]]+\],\[\[\\?"([^"]*?)\\?",/g;
  let match;
  let matchCount = 0;
  
  while ((match = testPattern.exec(html)) !== null && matchCount < 10) {
    console.log(`Found match ${++matchCount}: ${match[1]} -> "${match[2]}"`);
  }
  
  console.log(`\nTotal pattern matches found: ${matchCount}\n`);
  
  // Now test the parsing
  const result = parseGoogleMapsHTML(html, 'Spiral City');
  
  if (result && result.weekday_text) {
    console.log('✅ SUCCESS! Extracted hours:');
    result.weekday_text.forEach(day => console.log(`   ${day}`));
    console.log(`   Total days: ${result.weekday_text.length}`);
  } else {
    console.log('❌ FAILED - No hours extracted');
  }
} else {
  console.log('❌ spiral_city-debug.html not found');
}

console.log('\n🏁 Test complete!');