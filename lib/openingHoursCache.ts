import { createClient } from './supabase/server';
import { fetchLocationHours } from './googlePlaces';
import fs from 'fs/promises';
import path from 'path';

// Cache file path
const CACHE_FILE = path.join(process.cwd(), 'opening-hours-cache.json');

interface CacheEntry {
  opening_hours: any;
  last_updated: string;
  location_name: string;
}

interface Cache {
  [googlePlaceUrl: string]: CacheEntry;
}

// Check if opening hours data needs refresh (different month/year)
function needsMonthlyRefresh(lastUpdated: string): boolean {
  const lastUpdate = new Date(lastUpdated);
  const now = new Date();
  
  // Check if it's a different month or year
  return lastUpdate.getFullYear() !== now.getFullYear() || 
         lastUpdate.getMonth() !== now.getMonth();
}

// Load cache from file
async function loadCache(): Promise<Cache> {
  try {
    const cacheData = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(cacheData);
  } catch (error) {
    // Cache file doesn't exist or is invalid, return empty cache
    return {};
  }
}

// Save cache to file
async function saveCache(cache: Cache): Promise<void> {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('Error saving cache:', error);
  }
}

// Get opening hours from cache or fetch fresh data
export async function getCachedOpeningHours(
  googlePlaceUrl: string, 
  locationName: string
): Promise<any> {
  try {
    const cache = await loadCache();
    const cacheEntry = cache[googlePlaceUrl];

    // If we have fresh data (same month/year), use it
    if (cacheEntry && cacheEntry.opening_hours && !needsMonthlyRefresh(cacheEntry.last_updated)) {
      console.log('🔍 Using cached opening hours for:', locationName);
      return cacheEntry.opening_hours;
    }

    // Otherwise, fetch fresh data from Google API
    console.log('🔍 Fetching fresh opening hours for:', locationName);
    const freshHours = await fetchLocationHours(googlePlaceUrl, locationName);
    
    if (freshHours) {
      // Update the cache with fresh opening hours
      cache[googlePlaceUrl] = {
        opening_hours: freshHours,
        last_updated: new Date().toISOString(),
        location_name: locationName
      };
      
      await saveCache(cache);
      console.log('🔍 Opening hours cached for:', locationName);
    }

    return freshHours;
  } catch (error) {
    console.error('Error in getCachedOpeningHours:', error);
    return null;
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
          cache[riddle.google_place_url] = {
            opening_hours: freshHours,
            last_updated: new Date().toISOString(),
            location_name: riddle.location_id
          };
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
