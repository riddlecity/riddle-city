// Test the web scraping for Central Library specifically
const fs = require('fs');

// Let me manually test what Google Maps shows for the library
async function testLibraryScraping() {
  console.log('🔍 TESTING LIBRARY WEB SCRAPING\n');
  
  const libraryUrl = 'https://maps.app.goo.gl/f94mvjKVE9NgMG32A';
  console.log('🏛️ Central Library URL:', libraryUrl);
  
  // Load current cache
  const cache = JSON.parse(fs.readFileSync('opening-hours-cache.json', 'utf8'));
  const libraryData = cache[libraryUrl];
  
  if (libraryData) {
    console.log('\n📋 Current cache shows:');
    console.log('Location:', libraryData.location_name);
    console.log('Open now?', libraryData.opening_hours?.open_now);
    
    if (libraryData.opening_hours?.periods) {
      console.log('\n📅 Periods from Google:');
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      libraryData.opening_hours.periods.forEach((period, index) => {
        const openDay = period.open ? dayNames[period.open.day] : 'unknown';
        const openTime = period.open ? period.open.time : 'unknown';
        const closeTime = period.close ? period.close.time : 'open 24h';
        console.log(`  ${openDay}: ${openTime} - ${closeTime}`);
      });
    }
    
    if (libraryData.opening_hours?.weekday_text) {
      console.log('\n📝 Weekday text from Google:');
      libraryData.opening_hours.weekday_text.forEach((text, index) => {
        console.log(`  ${text}`);
      });
    }
  }
  
  console.log('\n❌ PROBLEM ANALYSIS:');
  console.log('User says: Library is closed ALL DAY on Sunday');
  console.log('Cache shows: Library open 09:00-19:00 on Sunday');
  console.log('This means Google Maps data is WRONG or outdated');
  
  console.log('\n🔧 POSSIBLE CAUSES:');
  console.log('1. Google Maps has wrong hours for this library');
  console.log('2. Library changed hours recently (Google not updated)');
  console.log('3. Scraping is getting wrong/cached data');
  console.log('4. Library has special Sunday closure not reflected in Google');
  
  console.log('\n⚡ IMMEDIATE FIX NEEDED:');
  console.log('Need to manually override library hours or re-scrape');
}

testLibraryScraping();