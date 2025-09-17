const fs = require('fs');

// Read the debug HTML file
const html = fs.readFileSync('falco-debug.html', 'utf8');

console.log('🔍 Testing opening hours regex patterns...');

// Pattern with escaped quotes as seen in the JSON structure
const pattern6 = /\[\\\"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\\",\d+,\[[^\]]+\],\[\[\\\"[^\\\"]*\\\",\[\[(\d+)\],\[(\d+)\]\]\]\]/gi;
const matches6 = [...html.matchAll(pattern6)];
console.log(`📅 Pattern 6 (escaped quotes) found ${matches6.length} matches`);
if (matches6.length > 0) {
  matches6.forEach((match, index) => {
    console.log(`   ${index + 1}. Day: ${match[1]}, Open: ${match[2]}, Close: ${match[3]}`);
  });
}

// Let's also search for the actual text we saw
const searchText = '\\\"Tuesday\\\",2,[2025';
if (html.includes(searchText)) {
  console.log('✅ Found the escaped Tuesday pattern in HTML');
} else {
  console.log('❌ Could not find escaped Tuesday pattern in HTML');
}

// Try a simpler pattern first
const pattern7 = /\\\"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\\"/gi;
const matches7 = [...html.matchAll(pattern7)];
console.log(`📅 Pattern 7 (simple escaped day names) found ${matches7.length} matches`);

// Look for the hour numbers pattern with escaped quotes
const pattern8 = /\[\[(\d+)\],\[(\d+)\]\]/gi;
const matches8 = [...html.matchAll(pattern8)];
console.log(`📅 Pattern 8 (hour arrays) found ${matches8.length} matches`);
if (matches8.length > 0) {
  matches8.slice(0, 10).forEach((match, index) => {
    console.log(`   ${index + 1}. Open: ${match[1]}, Close: ${match[2]}`);
  });
}
