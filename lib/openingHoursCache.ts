import { createClient } from './supabase/server';
import { fetchLocationHours } from './googlePlaces';
import fs from 'fs/promises';
import path from 'path';

// Cache file path
const CACHE_FILE = path.join(process.cwd(), 'opening-hours-cache.json');

interface CacheEntry {
  opening_hours: {
    open_now?: boolean;
    periods?: Array<{
      close?: { day: number; time: string };
      open?: { day: number; time: string };
    }>;
    weekday_text?: string[];
    // Also store parsed format for easy access
    parsed_hours?: {
      [key: string]: { open: string; close: string } | null;
    };
  };
  current_opening_hours?: any; // Additional current status if available
  last_updated: string;
  location_name: string;
}

interface Cache {
  [googlePlaceUrl: string]: CacheEntry;
}

// Helper function to parse Google Places opening hours into our format
function parseOpeningHours(googleHours: any): {
  open_now?: boolean;
  periods?: Array<{
    close?: { day: number; time: string };
    open?: { day: number; time: string };
  }>;
  weekday_text?: string[];
  parsed_hours?: {
    [key: string]: { open: string; close: string } | null;
  };
} {
  // If googleHours is already in our parsed format, return it
  if (googleHours && typeof googleHours === 'object' && 
      ('open_now' in googleHours || 'periods' in googleHours || 'weekday_text' in googleHours)) {
    
    // Parse periods into daily format for easy lookup
    const parsed_hours: { [key: string]: { open: string; close: string } | null } = {};
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    // Initialize all days as closed
    dayNames.forEach(day => {
      parsed_hours[day] = null;
    });
    
    // Parse periods if available
    if (googleHours.periods && Array.isArray(googleHours.periods)) {
      googleHours.periods.forEach((period: any) => {
        if (period.open && period.open.day !== undefined && period.open.time) {
          const dayName = dayNames[period.open.day];
          const openTime = period.open.time.slice(0, 2) + ':' + period.open.time.slice(2);
          const closeTime = period.close && period.close.time
            ? period.close.time.slice(0, 2) + ':' + period.close.time.slice(2)
            : '23:59'; // If no close time, assume open late
            
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
  
  // Return empty object if no valid data
  return {};
}

// Check if opening hours data needs refresh (daily refresh for web scraping)
function needsDailyRefresh(lastUpdated: string): boolean {
  const lastUpdate = new Date(lastUpdated);
  const now = new Date();
  
  // Check if it's a different day (more frequent updates since scraping is free)
  return lastUpdate.toDateString() !== now.toDateString();
}

// Load cache from file (read committed cache in production)
async function loadCache(): Promise<Cache> {
  try {
    // In production, read the committed cache file
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      console.log('🔍 Loading committed cache file in production...');
      try {
        const cacheData = await fs.readFile(CACHE_FILE, 'utf-8');
        const cache = JSON.parse(cacheData);
        console.log('✅ Successfully loaded production cache with', Object.keys(cache).length, 'locations');
        return cache;
      } catch (error) {
        console.log('⚠️ Failed to load production cache file, using empty cache:', error);
        return {};
      }
    }
    
    // In development, load normally
    const cacheData = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(cacheData);
  } catch (error) {
    // Cache file doesn't exist or is invalid, return empty cache
    console.log('📁 No cache file found, starting with empty cache');
    return {};
  }
}

// Save cache to file (disabled in production due to read-only filesystem)
async function saveCache(cache: Cache): Promise<void> {
  try {
    // Skip file system writes in production (Vercel doesn't support persistent writes)
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      console.log('🔍 Skipping cache save in production environment');
      return;
    }
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('Error saving cache:', error);
  }
}

// Production fallback data for when web scraping fails
function getProductionFallbackHours(googlePlaceUrl: string, locationName: string): any {
  // Based on our successful local testing results
  const fallbackData: { [key: string]: any } = {
    // Riddle 1 - https://maps.app.goo.gl/NvpzkEAzq6JCD5o49 (SUPERBOWL) - open till 11pm weekdays, midnight Fri/Sat
    'https://maps.app.goo.gl/NvpzkEAzq6JCD5o49': {
      parsed_hours: {
        monday: { open: '09:00', close: '23:00' },    // 11pm
        tuesday: { open: '09:00', close: '23:00' },   // 11pm
        wednesday: { open: '09:00', close: '23:00' }, // 11pm
        thursday: { open: '09:00', close: '23:00' },  // 11pm
        friday: { open: '09:00', close: '23:59' },    // midnight (23:59 to avoid 00:00 parsing issues)
        saturday: { open: '09:00', close: '23:59' },  // midnight (23:59 to avoid 00:00 parsing issues)
        sunday: { open: '09:00', close: '23:00' }     // 11pm
      },
      weekday_text: [
        'Monday: 9:00 AM – 11:00 PM',
        'Tuesday: 9:00 AM – 11:00 PM',
        'Wednesday: 9:00 AM – 11:00 PM',
        'Thursday: 9:00 AM – 11:00 PM',
        'Friday: 9:00 AM – 12:00 AM',
        'Saturday: 9:00 AM – 12:00 AM',
        'Sunday: 9:00 AM – 11:00 PM'
      ]
    },
    // Riddle 2 - https://maps.app.goo.gl/f94mvjKVE9NgMG32A (LIBRARY)
    'https://maps.app.goo.gl/f94mvjKVE9NgMG32A': {
      parsed_hours: {
        monday: { open: '09:30', close: '17:00' },
        tuesday: { open: '09:30', close: '17:00' },
        wednesday: { open: '09:30', close: '17:00' },
        thursday: { open: '09:30', close: '17:00' },
        friday: { open: '09:30', close: '17:00' },
        saturday: { open: '09:30', close: '16:00' },  // 4pm Saturday
        sunday: null  // CLOSED Sunday
      },
      weekday_text: [
        'Monday: 9:30 AM – 5:00 PM',
        'Tuesday: 9:30 AM – 5:00 PM',
        'Wednesday: 9:30 AM – 5:00 PM',
        'Thursday: 9:30 AM – 5:00 PM',
        'Friday: 9:30 AM – 5:00 PM',
        'Saturday: 9:30 AM – 4:00 PM',
        'Sunday: Closed'
      ]
    },
    // Riddle 3 - https://maps.app.goo.gl/HwhzfBt35q4WvzWJ8 (FALCO LOUNGE)
    'https://maps.app.goo.gl/HwhzfBt35q4WvzWJ8': {
      parsed_hours: {
        monday: { open: '09:00', close: '22:00' },    // 10pm
        tuesday: { open: '09:00', close: '22:00' },   // 10pm
        wednesday: { open: '09:00', close: '22:00' }, // 10pm
        thursday: { open: '09:00', close: '22:00' },  // 10pm
        friday: { open: '09:00', close: '23:00' },    // 11pm
        saturday: { open: '09:00', close: '23:00' },  // 11pm
        sunday: { open: '09:00', close: '22:00' }     // 10pm
      },
      weekday_text: [
        'Monday: 9:00 AM – 10:00 PM',
        'Tuesday: 9:00 AM – 10:00 PM',
        'Wednesday: 9:00 AM – 10:00 PM',
        'Thursday: 9:00 AM – 10:00 PM',
        'Friday: 9:00 AM – 11:00 PM',
        'Saturday: 9:00 AM – 11:00 PM',
        'Sunday: 9:00 AM – 10:00 PM'
      ]
    },
    // Riddle 4 - https://maps.app.goo.gl/tAHPcM7uvTzod6ZV6 (200 DEGREES) - Sunday 8:30am-4:30pm
    'https://maps.app.goo.gl/tAHPcM7uvTzod6ZV6': {
      parsed_hours: {
        monday: { open: '07:00', close: '17:00' },
        tuesday: { open: '07:00', close: '17:00' },
        wednesday: { open: '07:00', close: '17:00' },
        thursday: { open: '07:00', close: '17:00' },
        friday: { open: '07:00', close: '17:00' },
        saturday: { open: '08:30', close: '17:00' },
        sunday: { open: '08:30', close: '16:30' }
      },
      weekday_text: [
        'Monday: 7:00 AM – 5:00 PM',
        'Tuesday: 7:00 AM – 5:00 PM',
        'Wednesday: 7:00 AM – 5:00 PM', 
        'Thursday: 7:00 AM – 5:00 PM',
        'Friday: 7:00 AM – 5:00 PM',
        'Saturday: 8:30 AM – 5:00 PM',
        'Sunday: 8:30 AM – 4:30 PM'
      ]
    },
    // Riddle 5 - https://maps.app.goo.gl/77Xiczt1k2RNPLfF9 (RED ROBOT)
    'https://maps.app.goo.gl/77Xiczt1k2RNPLfF9': {
      parsed_hours: {
        monday: { open: '08:00', close: '17:00' },
        tuesday: { open: '08:00', close: '17:00' },
        wednesday: { open: '08:00', close: '17:00' },
        thursday: { open: '08:00', close: '17:00' },
        friday: { open: '08:00', close: '17:00' },
        saturday: { open: '09:00', close: '16:00' },
        sunday: { open: '10:00', close: '15:00' }
      },
      weekday_text: [
        'Monday: 8:00 AM – 5:00 PM',
        'Tuesday: 8:00 AM – 5:00 PM',
        'Wednesday: 8:00 AM – 5:00 PM',
        'Thursday: 8:00 AM – 5:00 PM',
        'Friday: 8:00 AM – 5:00 PM',
        'Saturday: 9:00 AM – 4:00 PM',
        'Sunday: 10:00 AM – 3:00 PM'
      ]
    },
    // Riddle 6 - https://maps.app.goo.gl/2ckBtY19XnQWj6ea7 (SPIRAL CITY) - ACTUAL SCRAPED HOURS
    'https://maps.app.goo.gl/2ckBtY19XnQWj6ea7': {
      parsed_hours: {
        monday: null,  // CLOSED Monday
        tuesday: { open: '12:00', close: '22:30' },   // 12pm-10:30pm
        wednesday: { open: '12:00', close: '23:30' }, // 12pm-11:30pm  
        thursday: { open: '12:00', close: '23:30' },  // 12pm-11:30pm
        friday: { open: '11:00', close: '23:30' },    // 11am-11:30pm
        saturday: { open: '11:00', close: '00:30' },  // 11am-12:30am (next day)
        sunday: { open: '12:00', close: '21:00' }     // 12pm-9pm
      },
      weekday_text: [
        'Monday: Closed',
        'Tuesday: 12:00 PM – 10:30 PM',
        'Wednesday: 12:00 PM – 11:30 PM',
        'Thursday: 12:00 PM – 11:30 PM',
        'Friday: 11:00 AM – 11:30 PM',
        'Saturday: 10:00 AM – 4:00 PM',
        'Sunday: 11:00 AM – 3:00 PM'
      ]
    }
  };

  const fallback = fallbackData[googlePlaceUrl];
  if (fallback) {
    console.log('🔍 Using production fallback hours for:', locationName);
    return fallback;
  }

  // Default fallback for unknown locations - assume typical business hours
  console.log('🔍 Using default fallback hours for unknown location:', locationName);
  console.log('🔍 To add accurate hours for this location, update the fallbackData object in openingHoursCache.ts');
  return {
    parsed_hours: {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: { open: '09:00', close: '17:00' },
      sunday: { open: '10:00', close: '16:00' }
    },
    weekday_text: [
      'Monday: 9:00 AM – 5:00 PM (DEFAULT - UPDATE NEEDED)',
      'Tuesday: 9:00 AM – 5:00 PM (DEFAULT - UPDATE NEEDED)',
      'Wednesday: 9:00 AM – 5:00 PM (DEFAULT - UPDATE NEEDED)',
      'Thursday: 9:00 AM – 5:00 PM (DEFAULT - UPDATE NEEDED)',
      'Friday: 9:00 AM – 5:00 PM (DEFAULT - UPDATE NEEDED)',
      'Saturday: 9:00 AM – 5:00 PM (DEFAULT - UPDATE NEEDED)',
      'Sunday: 10:00 AM – 4:00 PM (DEFAULT - UPDATE NEEDED)'
    ]
  };
}

// Get opening hours from cache or fetch fresh data
export async function getCachedOpeningHours(
  googlePlaceUrl: string, 
  locationName: string,
  forceRefresh: boolean = false
): Promise<any> {
  try {
    const cache = await loadCache();
    const cacheEntry = cache[googlePlaceUrl];
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;

    // In production, prioritize the committed cache file (updated by GitHub Actions)
    if (isProduction) {
      if (cacheEntry && cacheEntry.opening_hours) {
        console.log('🔍 Using committed cache data for:', locationName);
        return cacheEntry.opening_hours;
      } else {
        console.log('⚠️ No committed cache data found, using fallback for:', locationName);
        return getProductionFallbackHours(googlePlaceUrl, locationName);
      }
    }
    
    // Development mode: Use cache if fresh and not forcing refresh
    if (!forceRefresh && cacheEntry && cacheEntry.opening_hours && !needsDailyRefresh(cacheEntry.last_updated)) {
      console.log('🔍 Using cached opening hours for:', locationName);
      return cacheEntry.opening_hours;
    }

    // Development mode: Fetch fresh data via web scraping
    console.log('🔍 Fetching fresh opening hours for:', locationName);
    const freshHours = await fetchLocationHours(googlePlaceUrl, locationName);
    
    if (freshHours) {
      const parsedHours = parseOpeningHours(freshHours);
      
      // Update the cache with fresh opening hours
      cache[googlePlaceUrl] = {
        opening_hours: parsedHours,
        current_opening_hours: null,
        last_updated: new Date().toISOString(),
        location_name: locationName
      };
      
      await saveCache(cache);
      console.log('🔍 Opening hours cached for:', locationName);
      return parsedHours;
    } else {
      console.log('🔍 Failed to fetch opening hours for:', locationName);
      
      // Fallback to cache if available, otherwise use production fallback
      if (cacheEntry && cacheEntry.opening_hours) {
        console.log('🔍 Using stale cache data as fallback for:', locationName);
        return cacheEntry.opening_hours;
      } else {
        console.log('🔍 Using production fallback for:', locationName);
        return getProductionFallbackHours(googlePlaceUrl, locationName);
      }
    }

  } catch (error) {
    console.error('🔍 Error in getCachedOpeningHours for', locationName, ':', error);
    
    // Always try to load fallback data on error
    return getProductionFallbackHours(googlePlaceUrl, locationName);
  }
}

// Manual function to refresh all opening hours (run monthly)
export async function refreshAllOpeningHours(): Promise<void> {
  const supabase = await createClient();
  
  try {
    // Get all riddles with Google Place URLs
    const { data: riddles, error } = await supabase
      .from('riddles')
      .select('id, google_place_url, location_id')
      .not('google_place_url', 'is', null);

    if (error) throw error;

    console.log('🔍 Refreshing opening hours for', riddles?.length, 'locations');

    // Clear existing cache and fetch fresh hours for each location
    const cache: Cache = {};
    
    for (const riddle of riddles || []) {
      if (riddle.google_place_url) {
        console.log('🔍 Refreshing hours for:', riddle.location_id);
        
        const freshHours = await fetchLocationHours(riddle.google_place_url, riddle.location_id);
        
        if (freshHours) {
          const parsedHours = parseOpeningHours(freshHours);
          
          cache[riddle.google_place_url] = {
            opening_hours: parsedHours,
            current_opening_hours: null, // No longer needed
            last_updated: new Date().toISOString(),
            location_name: riddle.location_id
          };
          
          console.log('🔍 Cached hours for:', riddle.location_id);
        } else {
          console.log('🔍 Failed to fetch hours for:', riddle.location_id);
        }
        
        // Small delay to avoid hitting API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    await saveCache(cache);
    console.log('🔍 Opening hours refresh complete');
  } catch (error) {
    console.error('Error refreshing opening hours:', error);
  }
}
