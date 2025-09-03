// Simple cache format updater
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(process.cwd(), 'opening-hours-cache.json');

function parseOpeningHours(googleHours) {
  if (googleHours && typeof googleHours === 'object' && 
      ('open_now' in googleHours || 'periods' in googleHours || 'weekday_text' in googleHours)) {
    
    const parsed_hours = {};
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    // Initialize all days as closed
    dayNames.forEach(day => {
      parsed_hours[day] = null;
    });
    
    // Parse periods if available
    if (googleHours.periods && Array.isArray(googleHours.periods)) {
      googleHours.periods.forEach((period) => {
        if (period.open && period.open.day !== undefined && period.open.time) {
          const dayName = dayNames[period.open.day];
          const openTime = period.open.time.slice(0, 2) + ':' + period.open.time.slice(2);
          const closeTime = period.close && period.close.time
            ? period.close.time.slice(0, 2) + ':' + period.close.time.slice(2)
            : '23:59';
            
          parsed_hours[dayName] = {
            open: openTime,
            close: closeTime
          };
        }
      });
    }
    
    return {
      ...googleHours,
      parsed_hours
    };
  }
  
  return googleHours;
}

async function updateCacheFormat() {
  console.log('🔄 Updating cache format...');
  
  try {
    // Read existing cache
    const cacheData = fs.readFileSync(CACHE_FILE, 'utf-8');
    const existingCache = JSON.parse(cacheData);
    
    console.log('📊 Found', Object.keys(existingCache).length, 'cached locations');
    
    const updatedCache = {};
    
    // Update each entry with parsed format
    for (const [url, entry] of Object.entries(existingCache)) {
      console.log('🔄 Updating:', entry.location_name);
      
      const updatedOpeningHours = parseOpeningHours(entry.opening_hours);
      
      updatedCache[url] = {
        ...entry,
        opening_hours: updatedOpeningHours,
        last_updated: new Date().toISOString()
      };
      
      // Show sample parsed hours
      if (updatedOpeningHours.parsed_hours) {
        console.log('✅ Added parsed hours for:', entry.location_name);
        let sampleDay = null;
        for (const [day, hours] of Object.entries(updatedOpeningHours.parsed_hours)) {
          if (hours && !sampleDay) {
            console.log(`   Sample: ${day} ${hours.open} - ${hours.close}`);
            sampleDay = day;
          }
        }
      }
    }
    
    // Write updated cache
    fs.writeFileSync(CACHE_FILE, JSON.stringify(updatedCache, null, 2));
    
    console.log('✅ Cache format updated successfully!');
    console.log('📋 All locations now have parsed_hours format for easy time checking');
    
  } catch (error) {
    console.error('❌ Cache update failed:', error);
  }
}

updateCacheFormat();
