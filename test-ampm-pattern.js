// test-ampm-pattern.js
// Specifically test the AM/PM pattern on Superbowl

const fs = require('fs');

function testAMPMPattern() {
  console.log('🔍 Testing AM/PM pattern on Superbowl...');
  
  const html = fs.readFileSync('superbowl-debug.html', 'utf-8');
  
  // Test different AM/PM patterns
  console.log('\n1. Testing basic AM/PM pattern...');
  const pattern1 = /"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)"\s*,\s*\[\s*"(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[–-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))"/gi;
  const matches1 = [...html.matchAll(pattern1)];
  console.log(`   Found ${matches1.length} matches`);
  matches1.forEach((match, i) => {
    console.log(`   ${i+1}. ${match[1]}: "${match[2]}" - "${match[3]}"`);
  });
  
  // Test broader pattern
  console.log('\n2. Testing broader pattern...');
  const pattern2 = /"(Friday)"\s*,\s*\[\s*"([^"]+)"/gi;
  const matches2 = [...html.matchAll(pattern2)];
  console.log(`   Found ${matches2.length} Friday matches`);
  matches2.forEach((match, i) => {
    console.log(`   ${i+1}. Friday: "${match[2]}"`);
  });
  
  // Test very specific Friday pattern we know exists
  console.log('\n3. Testing specific Friday 9 am–12 am pattern...');
  const pattern3 = /"Friday"[^"]*"9\s*am[^"]*12\s*am"/gi;
  const matches3 = [...html.matchAll(pattern3)];
  console.log(`   Found ${matches3.length} specific matches`);
  matches3.forEach((match, i) => {
    console.log(`   ${i+1}. "${match[0]}"`);
  });
  
  // Look for the exact pattern from our earlier analysis
  console.log('\n4. Testing exact pattern from analysis...');
  const pattern4 = /"Friday",\["9 am–12 am"/gi;
  const matches4 = [...html.matchAll(pattern4)];
  console.log(`   Found ${matches4.length} exact matches`);
  matches4.forEach((match, i) => {
    console.log(`   ${i+1}. "${match[0]}"`);
  });
  
  // Try without the quotes around the time
  console.log('\n5. Testing pattern without quotes around time...');
  const pattern5 = /"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)",\["(\d{1,2}(?::\d{2})?\s*(?:am|pm))[–-](\d{1,2}(?::\d{2})?\s*(?:am|pm))"/gi;
  const matches5 = [...html.matchAll(pattern5)];
  console.log(`   Found ${matches5.length} matches`);
  matches5.forEach((match, i) => {
    console.log(`   ${i+1}. ${match[1]}: "${match[2]}" - "${match[3]}"`);
  });
}

testAMPMPattern();
