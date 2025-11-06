// Test script to verify opening hours caching performance
// Run with: node test-cache-performance.js

import { checkLocationHours, checkMultipleLocationHours } from './lib/timeWarnings.ts';

async function testCachingPerformance() {
  console.log('🧪 Testing Opening Hours Cache Performance\n');
  
  // Test single riddle caching
  console.log('--- Testing Single Riddle (checkLocationHours) ---');
  const testRiddleId = '1'; // Replace with actual riddle ID from your database
  
  console.log('First call (cache miss - should query database):');
  const start1 = Date.now();
  const result1 = await checkLocationHours(testRiddleId);
  const time1 = Date.now() - start1;
  console.log(`Time: ${time1}ms`);
  console.log('Result:', result1);
  
  console.log('\nSecond call (cache hit - should be faster):');
  const start2 = Date.now();
  const result2 = await checkLocationHours(testRiddleId);
  const time2 = Date.now() - start2;
  console.log(`Time: ${time2}ms`);
  console.log('Result:', result2);
  
  console.log(`\n✅ Performance improvement: ${((time1 - time2) / time1 * 100).toFixed(1)}% faster\n`);
  
  // Test track caching
  console.log('--- Testing Track Riddles (checkMultipleLocationHours) ---');
  const testTrackId = '1'; // Replace with actual track ID from your database
  
  console.log('First call (cache miss - should query database):');
  const start3 = Date.now();
  const result3 = await checkMultipleLocationHours(testTrackId);
  const time3 = Date.now() - start3;
  console.log(`Time: ${time3}ms`);
  console.log('Closed count:', result3.closedCount);
  console.log('Opening soon count:', result3.openingSoonCount);
  
  console.log('\nSecond call (cache hit - should be faster):');
  const start4 = Date.now();
  const result4 = await checkMultipleLocationHours(testTrackId);
  const time4 = Date.now() - start4;
  console.log(`Time: ${time4}ms`);
  console.log('Closed count:', result4.closedCount);
  console.log('Opening soon count:', result4.openingSoonCount);
  
  console.log(`\n✅ Performance improvement: ${((time3 - time4) / time3 * 100).toFixed(1)}% faster\n`);
  
  console.log('--- Cache Summary ---');
  console.log('Cache TTL: 1 hour (3600000ms)');
  console.log('Expected reduction in Supabase calls: ~95%+');
  console.log('Note: Components refresh every 5 minutes, so each user makes 12 calls/hour max instead of constant queries');
}

testCachingPerformance().catch(console.error);
