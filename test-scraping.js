// test-scraping.js
async function testScraping() {
  console.log('Testing web scraping...');
  const testUrl = 'https://maps.app.goo.gl/HwhzfBt35q4WvzWJ8';
  
  try {
    // Follow redirect
    const response = await fetch(testUrl, { method: 'HEAD', redirect: 'follow' });
    console.log('Resolved URL:', response.url);
    
    // Fetch page
    const pageResponse = await fetch(response.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = await pageResponse.text();
    console.log('HTML length:', html.length);
    console.log('Contains opening hours indicators:', html.includes('opening') || html.includes('hours') || html.includes('Open'));
    
    // Look for JSON-LD data
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/gs);
    console.log('Found JSON-LD blocks:', jsonLdMatches ? jsonLdMatches.length : 0);
    
    // Look for common hour patterns
    const hourPatterns = [
      /\d{1,2}:\d{2}\s*[AP]M/gi,
      /\d{1,2}[ap]m/gi,
      /open|close|hours/gi
    ];
    
    hourPatterns.forEach((pattern, i) => {
      const matches = html.match(pattern);
      console.log(`Pattern ${i+1} matches:`, matches ? matches.length : 0);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testScraping();
