// extract-cached-hours.js
// Extract and display all cached opening hours in a readable format

const fs = require('fs');

function extractCachedHours() {
  console.log('📋 Current Cached Opening Hours');
  console.log('================================');
  
  try {
    const cache = JSON.parse(fs.readFileSync('opening-hours-cache.json', 'utf-8'));
    
    Object.entries(cache).forEach(([url, data], index) => {
      console.log(`\n${index + 1}. ${data.location_name.toUpperCase()}`);
      console.log(`   🔗 URL: ${url}`);
      console.log(`   📅 Last Updated: ${new Date(data.last_updated).toLocaleDateString('en-GB')}`);
      
      if (data.opening_hours && data.opening_hours.weekday_text) {
        console.log('   🕒 Opening Hours:');
        data.opening_hours.weekday_text.forEach(day => {
          console.log(`      ${day}`);
        });
      } else if (data.opening_hours && data.opening_hours.parsed_hours) {
        console.log('   🕒 Opening Hours:');
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        days.forEach((day, i) => {
          const hours = data.opening_hours.parsed_hours[day];
          if (hours) {
            console.log(`      ${dayNames[i]}: ${hours.open} – ${hours.close}`);
          } else {
            console.log(`      ${dayNames[i]}: Closed`);
          }
        });
      } else {
        console.log('   ❌ No opening hours data');
      }
      
      // Check if data is stale (more than 30 days old)
      const lastUpdate = new Date(data.last_updated);
      const daysSinceUpdate = (new Date() - lastUpdate) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate > 30) {
        console.log(`   ⚠️  Data is ${Math.round(daysSinceUpdate)} days old - may be outdated`);
      } else if (daysSinceUpdate > 7) {
        console.log(`   📊 Data is ${Math.round(daysSinceUpdate)} days old`);
      } else {
        console.log(`   ✅ Data is recent (${Math.round(daysSinceUpdate)} days old)`);
      }
    });
    
    console.log(`\n📊 Total locations cached: ${Object.keys(cache).length}`);
    
    // Summary of data freshness
    const entries = Object.values(cache);
    const staleCount = entries.filter(entry => {
      const daysSinceUpdate = (new Date() - new Date(entry.last_updated)) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 30;
    }).length;
    
    console.log(`📈 Fresh data (≤30 days): ${entries.length - staleCount}`);
    console.log(`⚠️  Stale data (>30 days): ${staleCount}`);
    
  } catch (error) {
    console.error('❌ Error reading cache:', error.message);
  }
}

extractCachedHours();
