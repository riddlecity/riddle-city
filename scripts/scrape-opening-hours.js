#!/usr/bin/env node

/**
 * Standalone scraping script for GitHub Actions
 * Scrapes opening hours from Google Maps and updates opening-hours-cache.json
 */

const fs = require('fs').promises;
const path = require('path');

// Simple implementation of needed functions without full Next.js dependencies
const CACHE_FILE = path.join(process.cwd(), 'opening-hours-cache.json');

// Riddle locations mapping (matches the fallback data structure)
const LOCATIONS = [
  {
    name: 'Superbowl',
    url: 'https://maps.app.goo.gl/NvpzkEAzq6JCD5o49'
  },
  {
    name: 'Central Library',
    url: 'https://maps.app.goo.gl/f94mvjKVE9NgMG32A'
  },
  {
    name: 'Falco Lounge',
    url: 'https://maps.app.goo.gl/HwhzfBt35q4WvzWJ8'
  },
  {
    name: '200 Degrees',
    url: 'https://maps.app.goo.gl/tAHPcM7uvTzod6ZV6'
  },
  {
    name: 'Red Robot',
    url: 'https://maps.app.goo.gl/77Xiczt1k2RNPLfF9'
  },
  {
    name: 'Spiral City',
    url: 'https://maps.app.goo.gl/2ckBtY19XnQWj6ea7'
  }
];

// Web scraping function optimized for GitHub Actions environment
async function scrapeGoogleMapsHours(googlePlaceUrl, locationName) {
  try {
    console.log(`🔍 Scraping ${locationName}: ${googlePlaceUrl}`);
    
    // Enhanced fetch options for GitHub Actions (different IP ranges than Vercel)
    const fetchOptions = {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      }
    };
    
    // Follow redirect to get full URL
    const resolveResponse = await fetch(googlePlaceUrl, fetchOptions);
    
    if (!resolveResponse.ok) {
      throw new Error(`Failed to resolve redirect: ${resolveResponse.status}`);
    }
    
    const fullUrl = resolveResponse.url;
    console.log(`🔍 Resolved to: ${fullUrl}`);
    
    // Fetch the full page with longer timeout
    const pageResponse = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        ...fetchOptions.headers,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });
    
    if (!pageResponse.ok) {
      throw new Error(`Failed to fetch page: ${pageResponse.status}`);
    }
    
    const html = await pageResponse.text();
    console.log(`🔍 Fetched HTML for ${locationName}: ${html.length} characters`);
    
    // Parse the HTML for opening hours
    const openingHours = parseGoogleMapsHTML(html, locationName);
    
    if (openingHours && (openingHours.periods || openingHours.weekday_text)) {
      console.log(`✅ Successfully scraped hours for ${locationName}`);
      return openingHours;
    } else {
      console.log(`⚠️ No valid hours found for ${locationName}`);
      return null;
    }
    
  } catch (error) {
    console.error(`❌ Error scraping ${locationName}:`, error.message);
    return null;
  }
}

// HTML parsing function (simplified version of the full implementation)
function parseGoogleMapsHTML(html, locationName) {
  try {
    // Multiple parsing strategies for different Google Maps formats
    
    // Strategy 1: Look for structured data in script tags
    const scriptMatches = html.match(/<script[^>]*>.*?"opening_hours".*?<\/script>/gs);
    if (scriptMatches) {
      for (const script of scriptMatches) {
        try {
          // Extract JSON-like data from script content
          const jsonMatch = script.match(/\[(\[.*?\])\]/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            // Process structured data...
            console.log(`🔍 Found structured data for ${locationName}`);
          }
        } catch (e) {
          // Continue to next strategy
        }
      }
    }
    
    // Strategy 2: Look for weekday text patterns
    const weekdayPatterns = [
      /Monday[^\n]*\n/gi,
      /Tuesday[^\n]*\n/gi,
      /Wednesday[^\n]*\n/gi,
      /Thursday[^\n]*\n/gi,
      /Friday[^\n]*\n/gi,
      /Saturday[^\n]*\n/gi,
      /Sunday[^\n]*\n/gi
    ];
    
    const weekdayText = [];
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    // Extract weekday text from common patterns
    for (let i = 0; i < dayNames.length; i++) {
      const dayPattern = new RegExp(`${dayNames[i]}[^a-z]*([0-9]{1,2}(?::[0-9]{2})?\\s*(?:am|pm).*?(?:[0-9]{1,2}(?::[0-9]{2})?\\s*(?:am|pm)|closed))`, 'gi');
      const match = html.match(dayPattern);
      if (match && match[0]) {
        weekdayText.push(match[0].trim());
      }
    }
    
    if (weekdayText.length > 0) {
      console.log(`🔍 Found weekday text for ${locationName}:`, weekdayText);
      
      // Convert weekday text to periods format
      const periods = [];
      const parsed_hours = {};
      
      weekdayText.forEach((dayText, index) => {
        const timeMatch = dayText.match(/([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)).*?([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm))/i);
        
        if (timeMatch) {
          const openTime = convertToMilitaryTime(timeMatch[1]);
          const closeTime = convertToMilitaryTime(timeMatch[2]);
          
          if (openTime && closeTime) {
            periods.push({
              open: { day: index, time: openTime.replace(':', '') },
              close: { day: index, time: closeTime.replace(':', '') }
            });
            
            parsed_hours[dayNames[index]] = {
              open: openTime,
              close: closeTime
            };
          }
        } else if (dayText.toLowerCase().includes('closed')) {
          parsed_hours[dayNames[index]] = null;
        }
      });
      
      return {
        open_now: true, // We'll assume open for now
        periods: periods,
        weekday_text: weekdayText,
        parsed_hours: parsed_hours
      };
    }
    
    console.log(`⚠️ No recognizable opening hours pattern found for ${locationName}`);
    return null;
    
  } catch (error) {
    console.error(`❌ Error parsing HTML for ${locationName}:`, error.message);
    return null;
  }
}

// Helper function to convert AM/PM time to 24-hour format
function convertToMilitaryTime(timeStr) {
  if (!timeStr) return null;
  
  const cleanTime = timeStr.trim().toLowerCase();
  const match = cleanTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  
  if (match) {
    let hour = parseInt(match[1]);
    const minutes = match[2] ? match[2] : '00';
    const period = match[3];
    
    if (period === 'am' && hour === 12) {
      hour = 0;
    } else if (period === 'pm' && hour !== 12) {
      hour += 12;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  }
  
  return null;
}

// Load existing cache
async function loadCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log('📁 No existing cache file, starting fresh');
    return {};
  }
}

// Save cache to file
async function saveCache(cache) {
  const data = JSON.stringify(cache, null, 2);
  await fs.writeFile(CACHE_FILE, data, 'utf8');
  console.log('💾 Saved cache to opening-hours-cache.json');
}

// Main scraping function
async function main() {
  console.log('🚀 Starting opening hours scraping...');
  console.log('🕐 Time:', new Date().toISOString());
  
  const cache = await loadCache();
  let updatedCount = 0;
  let errorCount = 0;
  
  // Process each location with delays to be respectful
  for (const location of LOCATIONS) {
    try {
  console.log(`\n📍 Processing ${location.name}...`);
      
      // Check if we need to update this location (daily refresh)
      const existing = cache[location.url];
      const forceRun = process.env.FORCE_RUN === 'true';
      
      if (existing && !forceRun) {
        const lastUpdate = new Date(existing.last_updated);
        const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate < 1) {
          console.log(`⏭️ Skipping ${location.name} (updated ${daysSinceUpdate.toFixed(1)} days ago)`);
          continue;
        }
      }
      
      // Scrape the location
      const hours = await scrapeGoogleMapsHours(location.url, location.name);
      
      if (hours) {
        cache[location.url] = {
          opening_hours: hours,
          last_updated: new Date().toISOString(),
          location_name: location.name
        };
        updatedCount++;
        console.log(`✅ Updated ${location.name}`);
      } else {
        errorCount++;
        console.log(`❌ Failed to scrape ${location.name}`);
      }
      
      // Respectful delay between requests (2-5 seconds)
      const delay = 2000 + Math.random() * 3000;
      console.log(`⏳ Waiting ${(delay/1000).toFixed(1)}s before next request...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      console.error(`❌ Error processing ${location.name}:`, error.message);
      errorCount++;
    }
  }
  
  // Save the updated cache
  if (updatedCount > 0) {
    await saveCache(cache);
    console.log(`\n🎉 Scraping completed! Updated: ${updatedCount}, Errors: ${errorCount}`);
  } else {
    console.log(`\n✨ No updates needed. Errors: ${errorCount}`);
  }
  
  // Exit with error code if all locations failed
  if (errorCount === LOCATIONS.length) {
    console.error('❌ All locations failed to scrape!');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = { main, scrapeGoogleMapsHours, parseGoogleMapsHTML };