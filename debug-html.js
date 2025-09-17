const fs = require('fs');

// Simple scraping function to get HTML
async function fetchGoogleMapsHTML(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    if (response.redirected) {
      console.log('📡 Following redirect...');
      console.log('  ✅ Resolved to:', response.url.substring(0, 80) + '...');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    return html;
  } catch (error) {
    console.error('❌ Error fetching HTML:', error);
    return null;
  }
}

// Test with one location and save HTML
async function debugHTML() {
  console.log('🔄 Fetching HTML for debugging...');
  
  const testUrl = 'https://maps.app.goo.gl/HwhzfBt35q4WvzWJ8'; // Falco Lounge
  const html = await fetchGoogleMapsHTML(testUrl);
  
  if (html) {
    console.log(`📄 HTML fetched (${html.length} chars)`);
    
    // Save to file for analysis
    fs.writeFileSync('falco-debug.html', html);
    console.log('💾 HTML saved to falco-debug.html');
    
    // Look for specific patterns in the HTML
    console.log('\n🔍 Searching for opening hours patterns...');
    
    // Look for day names
    const dayMatches = html.match(/(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi);
    console.log(`📅 Found ${dayMatches ? dayMatches.length : 0} day name mentions`);
    
    // Look for time patterns
    const timeMatches = html.match(/\d{1,2}:\d{2}/g);
    console.log(`⏰ Found ${timeMatches ? timeMatches.length : 0} time patterns (HH:MM)`);
    
    // Look for AM/PM patterns
    const ampmMatches = html.match(/\d{1,2}(?::\d{2})?\s*(?:AM|PM)/gi);
    console.log(`🕐 Found ${ampmMatches ? ampmMatches.length : 0} AM/PM time patterns`);
    
    // Look for "hours" mentions
    const hoursMatches = html.match(/hours/gi);
    console.log(`🕓 Found ${hoursMatches ? hoursMatches.length : 0} "hours" mentions`);
    
    // Look for JSON-LD scripts
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">/g);
    console.log(`📋 Found ${jsonLdMatches ? jsonLdMatches.length : 0} JSON-LD scripts`);
    
    // Sample some actual time patterns found
    if (ampmMatches && ampmMatches.length > 0) {
      console.log('\n📝 Sample time patterns found:');
      ampmMatches.slice(0, 10).forEach((match, i) => {
        console.log(`   ${i + 1}. ${match}`);
      });
    }
    
  } else {
    console.log('❌ Failed to fetch HTML');
  }
}

debugHTML().catch(console.error);
