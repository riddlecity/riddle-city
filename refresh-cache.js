// Direct cache refresh script - requires transpilation
import { refreshAllOpeningHours } from './lib/openingHoursCache.js';

async function refreshCache() {
  console.log('🔄 Starting opening hours cache refresh...');
  
  try {
    await refreshAllOpeningHours();
    console.log('✅ Cache refresh completed successfully!');
    
    // Test the updated cache
    const fs = await import('fs/promises');
    const cacheData = await fs.readFile('./opening-hours-cache.json', 'utf-8');
    const cache = JSON.parse(cacheData);
    
    console.log('📊 Refreshed cache contains:', Object.keys(cache).length, 'locations');
    
    const firstEntry = Object.values(cache)[0];
    if (firstEntry?.opening_hours?.parsed_hours) {
      console.log('✅ New parsed hours format is working!');
    }
    
  } catch (error) {
    console.error('❌ Cache refresh failed:', error);
  }
}

refreshCache();
