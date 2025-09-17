// check-all-urls.js
// Check all URLs in the cache to see which ones are working

const fs = require('fs');

async function checkAllUrls() {
  console.log('🔍 Checking all URLs in cache...');
  
  try {
    const cache = JSON.parse(fs.readFileSync('opening-hours-cache.json', 'utf-8'));
    const locations = Object.entries(cache);
    
    console.log(`📍 Found ${locations.length} locations to check\n`);
    
    for (let i = 0; i < locations.length; i++) {
      const [url, data] = locations[i];
      const locationName = data.location_name;
      
      console.log(`${i + 1}. ${locationName}`);
      console.log(`   URL: ${url}`);
      
      try {
        // Test the URL
        const response = await fetch(url, {
          method: 'HEAD',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.ok) {
          console.log(`   ✅ Working - redirects to: ${response.url.substring(0, 60)}...`);
          
          // Quick check for the title to see if it's a valid maps page
          const fullResponse = await fetch(response.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          const html = await fullResponse.text();
          
          if (html.includes('Dynamic Link Not Found')) {
            console.log(`   ❌ Broken: Shows "Dynamic Link Not Found"`);
          } else if (html.includes('Google Maps') || html.length > 50000) {
            console.log(`   ✅ Valid Google Maps page (${html.length} chars)`);
          } else {
            console.log(`   ⚠️  Suspicious: Short page (${html.length} chars)`);
          }
        } else {
          console.log(`   ❌ HTTP Error: ${response.status}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error checking URLs:', error);
  }
}

checkAllUrls();
