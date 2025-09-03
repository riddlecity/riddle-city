// refresh-cache.mjs - ES module version
import { createClient } from './lib/supabase/server.js';
import { fetchLocationHours } from './lib/googlePlaces.js';
import fs from 'fs/promises';
import path from 'path';

// Cache file path
const CACHE_FILE = path.join(process.cwd(), 'opening-hours-cache.json');

// Helper function to parse Google Places opening hours
function parseOpeningHours(googleHours) {
  if (googleHours && typeof googleHours === 'object' && 
      ('open_now' in googleHours || 'periods' in googleHours || 'weekday_text' in googleHours)) {
    
    const parsed_hours = {};
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    dayNames.forEach(day => {
      parsed_hours[day] = null;
    });
    
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
      open_now: googleHours.open_now,
      periods: googleHours.periods,
      weekday_text: googleHours.weekday_text,
      parsed_hours
    };
  }
  
  return {};
}

async function refreshCache() {
  console.log('🔄 Starting opening hours cache refresh...');
  
  try {
    // Simulate the refresh logic here since we can't import TS modules directly
    const testLocations = [
      { 
        google_place_url: 'https://maps.app.goo.gl/HwhzfBt35q4WvzWJ8',
        location_id: 'Test_Location' 
      }
    ];
    
    const cache = {};
    
    for (const location of testLocations) {
      console.log('🔍 Processing:', location.location_id);
      
      // For now, let's just update the existing cache with parsed format
      const existingCache = await fs.readFile(CACHE_FILE, 'utf-8').then(JSON.parse).catch(() => ({}));
      
      for (const [url, entry] of Object.entries(existingCache)) {
        console.log('🔄 Updating format for:', entry.location_name);
        
        const parsedHours = parseOpeningHours(entry.opening_hours);
        
        cache[url] = {
          ...entry,
          opening_hours: parsedHours,
          last_updated: new Date().toISOString()
        };
      }
      break; // Just update format, don't fetch new data for now
    }
    
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
    console.log('✅ Cache format updated successfully!');
    
    const firstEntry = Object.values(cache)[0];
    if (firstEntry?.opening_hours?.parsed_hours) {
      console.log('✅ New parsed hours format is working!');
      console.log('📋 Sample daily hours:');
      Object.entries(firstEntry.opening_hours.parsed_hours).forEach(([day, hours]) => {
        if (hours) {
          console.log(`   - ${day}: ${hours.open} - ${hours.close}`);
        } else {
          console.log(`   - ${day}: Closed`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Cache refresh failed:', error);
  }
}

refreshCache();
