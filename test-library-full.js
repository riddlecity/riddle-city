const fs = require('fs');

// Simulate the convertAMPMToHours function
function convertAMPMToHours(timeStr) {
  if (!timeStr) return null;
  
  const cleanTime = timeStr.trim().toLowerCase();
  
  // Handle midnight special case
  if (cleanTime.includes('12') && cleanTime.includes('am')) {
    const match = cleanTime.match(/12(?::(\d{2}))?/);
    if (match) {
      const minutes = match[1] ? parseInt(match[1]) : 0;
      return 0 + (minutes / 60);
    }
  }
  
  // Handle noon special case  
  if (cleanTime.includes('12') && cleanTime.includes('pm')) {
    const match = cleanTime.match(/12(?::(\d{2}))?/);
    if (match) {
      const minutes = match[1] ? parseInt(match[1]) : 0;
      return 12 + (minutes / 60);
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
  
  return null;
}

// Simulate the full parsing with proper time conversion
function testFullLibraryParsing() {
  console.log('🔍 Testing Full Library Parsing with Time Conversion...\n');
  
  try {
    const html = fs.readFileSync('library-debug.html', 'utf8');
    
    const specificPatternRegex = /"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\?",\d+,\[[\d,]+\],\[\[\\?"([^"]*?)\\?"/g;
    let specificMatch;
    const extractedHours = {};
    const seenDays = new Set();
    
    while ((specificMatch = specificPatternRegex.exec(html)) !== null) {
      const day = specificMatch[1];
      const timeData = specificMatch[2];
      const dayKey = day.toLowerCase();
      
      // Only use the first occurrence of each day
      if (!seenDays.has(dayKey)) {
        seenDays.add(dayKey);
        
        if (timeData === 'Closed' || timeData.toLowerCase().includes('closed')) {
          extractedHours[dayKey] = { closed: true };
          console.log(`📅 ${day}: Closed`);
        } else {
          // Parse time range like "9:30 am–4 pm"
          const timeMatch = timeData.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[–-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
          if (timeMatch) {
            let openTime = timeMatch[1].trim();
            let closeTime = timeMatch[2].trim();
            
            // Handle cases where only the closing time has AM/PM
            if (!/am|pm/i.test(openTime) && /pm/i.test(closeTime)) {
              const openHour = parseInt(openTime);
              if (openHour === 12 || (openHour >= 1 && openHour <= 11)) {
                openTime += ' pm';
              }
            }
            
            const openHour = convertAMPMToHours(openTime);
            const closeHour = convertAMPMToHours(closeTime);
            
            if (openHour !== null && closeHour !== null) {
              const openFormatted = String(Math.floor(openHour)).padStart(2, '0') + ':' + String(Math.round((openHour % 1) * 60)).padStart(2, '0');
              const closeFormatted = String(Math.floor(closeHour)).padStart(2, '0') + ':' + String(Math.round((closeHour % 1) * 60)).padStart(2, '0');
              
              extractedHours[dayKey] = {
                open: openFormatted,
                close: closeFormatted
              };
              
              console.log(`📅 ${day}: ${openTime} → ${openFormatted}, ${closeTime} → ${closeFormatted}`);
            } else {
              console.log(`❌ ${day}: Failed to parse "${timeData}"`);
            }
          } else {
            console.log(`❌ ${day}: No time match for "${timeData}"`);
          }
        }
      }
    }
    
    console.log('\n✅ Final extracted hours:\n');
    Object.entries(extractedHours).forEach(([day, hours]) => {
      if (hours.closed) {
        console.log(`📋 ${day}: CLOSED`);
      } else {
        console.log(`📋 ${day}: ${hours.open} - ${hours.close}`);
      }
    });
    
    console.log('\n🎯 Compare with user-provided actual times:');
    console.log('📌 Saturday should be: 9:30am-4pm');
    console.log('📌 Sunday should be: Closed');
    
    if (extractedHours.saturday && extractedHours.saturday.open === '09:30' && extractedHours.saturday.close === '16:00') {
      console.log('✅ Saturday parsing: CORRECT!');
    } else {
      console.log('❌ Saturday parsing: INCORRECT');
    }
    
    if (extractedHours.sunday && extractedHours.sunday.closed) {
      console.log('✅ Sunday parsing: CORRECT!');
    } else {
      console.log('❌ Sunday parsing: INCORRECT');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFullLibraryParsing();