// Check opening hours data for both tracks
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkOpeningHours() {
  console.log('🔍 Checking opening hours data for barnsley tracks...\n');
  
  // Check pub crawl (standard_barnsley)
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🍻 PUB CRAWL (standard_barnsley)');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const { data: pubRiddles, error: pubError } = await supabase
    .from('riddles')
    .select('id, track_id, location_id, opening_hours, order_index')
    .eq('track_id', 'standard_barnsley')
    .order('order_index');

  if (pubError) {
    console.error('❌ Error:', pubError.message);
  } else {
    console.log(`Found ${pubRiddles.length} riddles\n`);
    
    pubRiddles.forEach((riddle, index) => {
      const hasHours = riddle.opening_hours && typeof riddle.opening_hours === 'object' && Object.keys(riddle.opening_hours).length > 0;
      console.log(`${index + 1}. Riddle #${riddle.order_index}`);
      console.log(`   ID: ${riddle.id}`);
      console.log(`   Location: ${riddle.location_id}`);
      console.log(`   Opening Hours: ${hasHours ? '✅ YES' : '❌ NO (NULL/EMPTY)'}`);
      if (hasHours) {
        console.log(`   Sample: ${JSON.stringify(riddle.opening_hours).substring(0, 80)}...`);
      }
      console.log('');
    });
    
    const pubWithHours = pubRiddles.filter(r => r.opening_hours && typeof r.opening_hours === 'object' && Object.keys(r.opening_hours).length > 0).length;
    console.log(`📊 Summary: ${pubWithHours}/${pubRiddles.length} riddles have opening hours\n`);
  }

  // Check date day (date_barnsley)
  console.log('═══════════════════════════════════════════════════════════');
  console.log('💘 DATE DAY (date_barnsley)');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const { data: dateRiddles, error: dateError } = await supabase
    .from('riddles')
    .select('id, track_id, location_id, opening_hours, order_index')
    .eq('track_id', 'date_barnsley')
    .order('order_index');

  if (dateError) {
    console.error('❌ Error:', dateError.message);
  } else {
    console.log(`Found ${dateRiddles.length} riddles\n`);
    
    dateRiddles.forEach((riddle, index) => {
      const hasHours = riddle.opening_hours && typeof riddle.opening_hours === 'object' && Object.keys(riddle.opening_hours).length > 0;
      console.log(`${index + 1}. Riddle #${riddle.order_index}`);
      console.log(`   ID: ${riddle.id}`);
      console.log(`   Location: ${riddle.location_id}`);
      console.log(`   Opening Hours: ${hasHours ? '✅ YES' : '❌ NO (NULL/EMPTY)'}`);
      if (hasHours) {
        console.log(`   Sample: ${JSON.stringify(riddle.opening_hours).substring(0, 80)}...`);
      }
      console.log('');
    });
    
    const dateWithHours = dateRiddles.filter(r => r.opening_hours && typeof r.opening_hours === 'object' && Object.keys(r.opening_hours).length > 0).length;
    console.log(`📊 Summary: ${dateWithHours}/${dateRiddles.length} riddles have opening hours\n`);
  }

  // Final verdict
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 DIAGNOSIS');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  if (pubRiddles && dateRiddles) {
    const pubWithHours = pubRiddles.filter(r => r.opening_hours && typeof r.opening_hours === 'object' && Object.keys(r.opening_hours).length > 0).length;
    const dateWithHours = dateRiddles.filter(r => r.opening_hours && typeof r.opening_hours === 'object' && Object.keys(r.opening_hours).length > 0).length;
    
    if (pubWithHours === 0) {
      console.log('❌ PUB CRAWL HAS NO OPENING HOURS DATA!');
      console.log('   This is why location warnings are not appearing.');
      console.log('   The time warning system requires opening_hours data in the database.\n');
    } else if (pubWithHours < pubRiddles.length) {
      console.log(`⚠️  PUB CRAWL HAS INCOMPLETE DATA (${pubWithHours}/${pubRiddles.length})`);
      console.log('   Some riddles are missing opening hours.\n');
    } else {
      console.log(`✅ PUB CRAWL HAS COMPLETE DATA (${pubWithHours}/${pubRiddles.length})`);
    }
    
    if (dateWithHours === 0) {
      console.log('❌ DATE DAY HAS NO OPENING HOURS DATA!');
    } else if (dateWithHours < dateRiddles.length) {
      console.log(`⚠️  DATE DAY HAS INCOMPLETE DATA (${dateWithHours}/${dateRiddles.length})`);
    } else {
      console.log(`✅ DATE DAY HAS COMPLETE DATA (${dateWithHours}/${dateRiddles.length})`);
    }
  }
}

checkOpeningHours().then(() => {
  console.log('\n✅ Check complete!');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
