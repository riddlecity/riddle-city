// extract-opening-hours.js
// Extract the actual opening hours data from the HTML

const fs = require('fs');

function extractOpeningHours() {
  console.log('🔍 Extracting opening hours data...');
  
  const html = fs.readFileSync('superbowl-debug.html', 'utf-8');
  
  // From the previous output, I saw the pattern ends with Friday and Saturday entries
  // Let me search for that specific ending
  console.log('\n1. Looking for the end pattern we saw...');
  const endPattern = html.match(/\[\["Friday"[^}]{0,200}\[\["Saturday"[^}]{0,200}/gi);
  if (endPattern) {
    console.log(`Found ${endPattern.length} end patterns:`);
    endPattern.forEach((match, i) => {
      console.log(`${i+1}. ${match}`);
    });
  }
  
  // Let me search more broadly for the 9 am–12 am pattern
  console.log('\n2. Searching for "9 am–12 am" anywhere...');
  const timeSearch = html.indexOf('9 am–12 am');
  if (timeSearch !== -1) {
    console.log(`Found "9 am–12 am" at position ${timeSearch}`);
    // Show context around it
    const start = Math.max(0, timeSearch - 200);
    const end = Math.min(html.length, timeSearch + 200);
    console.log(`Context: ...${html.substring(start, end)}...`);
  }
  
  // Let me also search for the Saturday pattern
  console.log('\n3. Searching for Saturday with 9 am–12 am...');
  const saturdaySearch = html.indexOf('Saturday');
  if (saturdaySearch !== -1) {
    // Find the section around Saturday
    const start = Math.max(0, saturdaySearch - 100);
    const end = Math.min(html.length, saturdaySearch + 300);
    const saturdayContext = html.substring(start, end);
    console.log(`Saturday context: ...${saturdayContext}...`);
    
    if (saturdayContext.includes('9 am–12 am')) {
      console.log('✅ Found Saturday with 9 am–12 am times!');
    }
  }
}

extractOpeningHours();
