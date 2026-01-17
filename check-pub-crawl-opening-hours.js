// Check if pub crawl riddles have opening hours data
const { createClient } = require('@supabase/supabase-js');

async function checkPubCrawlRiddles() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  console.log('🔍 Checking standard_barnsley (Pub Crawl) riddles...\n');
  
  const { data: pubRiddles, error: pubError } = await supabase
    .from('riddles')
    .select('id, track_id, location_id, opening_hours, order_index')
    .eq('track_id', 'standard_barnsley')
    .order('order_index');

  if (pubError) {
    console.error('❌ Error fetching pub crawl riddles:', pubError);
    return;
  }

  console.log(`Found ${pubRiddles.length} pub crawl riddles:\n`);
  
  pubRiddles.forEach((riddle, index) => {
    const hasHours = riddle.opening_hours && Object.keys(riddle.opening_hours).length > 0;
    console.log(`${index + 1}. Riddle ${riddle.order_index}`);
    console.log(`   ID: ${riddle.id}`);
    console.log(`   Location ID: ${riddle.location_id}`);
    console.log(`   Has Opening Hours: ${hasHours ? '✅ YES' : '❌ NO'}`);
    if (hasHours) {
      console.log(`   Opening Hours Sample:`, JSON.stringify(riddle.opening_hours).substring(0, 100) + '...');
    }
    console.log('');
  });

  console.log('\n🔍 Checking date_barnsley (Date Day) riddles...\n');
  
  const { data: dateRiddles, error: dateError } = await supabase
    .from('riddles')
    .select('id, track_id, location_id, opening_hours, order_index')
    .eq('track_id', 'date_barnsley')
    .order('order_index');

  if (dateError) {
    console.error('❌ Error fetching date day riddles:', dateError);
    return;
  }

  console.log(`Found ${dateRiddles.length} date day riddles:\n`);
  
  dateRiddles.forEach((riddle, index) => {
    const hasHours = riddle.opening_hours && Object.keys(riddle.opening_hours).length > 0;
    console.log(`${index + 1}. Riddle ${riddle.order_index}`);
    console.log(`   ID: ${riddle.id}`);
    console.log(`   Location ID: ${riddle.location_id}`);
    console.log(`   Has Opening Hours: ${hasHours ? '✅ YES' : '❌ NO'}`);
    if (hasHours) {
      console.log(`   Opening Hours Sample:`, JSON.stringify(riddle.opening_hours).substring(0, 100) + '...');
    }
    console.log('');
  });

  // Summary
  const pubWithHours = pubRiddles.filter(r => r.opening_hours && Object.keys(r.opening_hours).length > 0).length;
  const dateWithHours = dateRiddles.filter(r => r.opening_hours && Object.keys(r.opening_hours).length > 0).length;
  
  console.log('\n📊 SUMMARY:');
  console.log(`Pub Crawl: ${pubWithHours}/${pubRiddles.length} riddles have opening hours`);
  console.log(`Date Day: ${dateWithHours}/${dateRiddles.length} riddles have opening hours`);
  
  if (pubWithHours < pubRiddles.length) {
    console.log('\n⚠️  WARNING: Some pub crawl riddles are missing opening hours data!');
    console.log('This is why location warnings are not appearing for pub crawl.');
  }
}

checkPubCrawlRiddles().then(() => process.exit(0)).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
