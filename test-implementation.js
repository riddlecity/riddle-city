// test-implementation.js
// Simple test of the web scraping functionality

async function testWebScraping() {
  console.log('🔄 Testing web scraping implementation...');
  
  try {
    // Import the function (simulate what happens in the API)
    const testUrl = 'https://maps.app.goo.gl/HwhzfBt35q4WvzWJ8';
    const locationName = 'Test Location';
    
    console.log('📍 Testing URL:', testUrl);
    console.log('📋 Location:', locationName);
    
    // Follow redirect and get full URL
    const resolveResponse = await fetch(testUrl, {
      method: 'HEAD',
      redirect: 'follow'
    });
    
    const fullUrl = resolveResponse.url;
    console.log('✅ Resolved URL:', fullUrl);
    
    // Fetch the page
    const pageResponse = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!pageResponse.ok) {
      console.error('❌ Failed to fetch page:', pageResponse.status);
      return;
    }
    
    const html = await pageResponse.text();
    console.log('✅ Page fetched, HTML length:', html.length);
    
    // Look for opening hours patterns
    const timePatterns = [
      /(\d{1,2}:\d{2}\s*[AP]M)/gi,
      /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/gi,
      /(open|close|hours)/gi
    ];
    
    timePatterns.forEach((pattern, index) => {
      const matches = html.match(pattern);
      console.log(`🔍 Pattern ${index + 1} found:`, matches ? matches.length : 0, 'matches');
      if (matches && matches.length < 20) {
        console.log('   Examples:', matches.slice(0, 5));
      }
    });
    
    // Look for structured data
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">/g);
    console.log('📊 JSON-LD blocks found:', jsonLdMatches ? jsonLdMatches.length : 0);
    
    console.log('✅ Web scraping test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in web scraping test:', error.message);
  }
}

// Run the test
testWebScraping();
