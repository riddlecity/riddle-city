import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getCachedOpeningHours } from '../../../lib/openingHoursCache';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting daily opening hours refresh with web scraping...');
    
    // Optional: Add authentication here to prevent unauthorized refreshes
    let adminKey;
    try {
      const body = await request.json();
      adminKey = body.adminKey;
    } catch {
      // If no JSON body, check query params or headers
      adminKey = request.nextUrl.searchParams.get('key') || request.headers.get('x-admin-key');
    }
    
    // Simple auth check (you can make this more secure)
    if (adminKey !== 'riddle-city-refresh-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    
    // Get all unique Google Place URLs from the database
    const { data: locations, error } = await supabase
      .from('riddle_locations')
      .select('google_place_url, location_name')
      .not('google_place_url', 'is', null)
      .not('google_place_url', 'eq', '');

    if (error) {
      console.error('❌ Error fetching locations:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!locations || locations.length === 0) {
      console.log('ℹ️ No locations with Google Place URLs found');
      return NextResponse.json({ message: 'No locations to refresh', count: 0 });
    }

    console.log(`🔍 Found ${locations.length} locations to refresh`);
    
    // Get unique URLs to avoid duplicates
    const uniqueUrls = [...new Map(
      locations.map((loc: any) => [loc.google_place_url, loc])
    ).values()];
    
    console.log(`🔍 Refreshing ${uniqueUrls.length} unique URLs with web scraping`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process locations in batches to be respectful to Google
    const BATCH_SIZE = 3; // Smaller batches for web scraping
    
    for (let i = 0; i < uniqueUrls.length; i += BATCH_SIZE) {
      const batch = uniqueUrls.slice(i, i + BATCH_SIZE);
      console.log(`🔍 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(uniqueUrls.length / BATCH_SIZE)}`);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (location: any) => {
        try {
          console.log(`🔄 Scraping hours for: ${location.location_name}`);
          
          // Force refresh by calling getCachedOpeningHours with forceRefresh=true
          const hours = await getCachedOpeningHours(
            location.google_place_url,
            location.location_name,
            true // Force refresh - will trigger web scraping
          );
          
          if (hours) {
            console.log(`✅ Successfully scraped: ${location.location_name}`);
            return { success: true, location: location.location_name };
          } else {
            console.log(`⚠️ No hours found for: ${location.location_name}`);
            return { success: false, location: location.location_name, error: 'No hours found' };
          }
        } catch (error) {
          console.error(`❌ Error scraping ${location.location_name}:`, error);
          return { 
            success: false, 
            location: location.location_name, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      });
      
      // Wait for batch to complete
      const results = await Promise.allSettled(batchPromises);
      
      // Process results
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`${result.value.location}: ${result.value.error}`);
          }
        } else {
          errorCount++;
          errors.push(`Batch error: ${result.reason}`);
        }
      });
      
      // Delay between batches to be respectful
      if (i + BATCH_SIZE < uniqueUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
      }
    }
    
    console.log(`🔄 Daily refresh complete! Success: ${successCount}, Errors: ${errorCount}`);
    
    return NextResponse.json({
      success: true,
      message: `Daily opening hours refresh completed via web scraping`,
      total: uniqueUrls.length,
      successCount: successCount,
      errorCount: errorCount,
      errorDetails: errors.length > 0 ? errors.slice(0, 10) : undefined // Limit error details
    });

  } catch (error) {
    console.error('❌ Error in daily refresh-hours:', error);
    return NextResponse.json({ 
      error: 'Failed to refresh opening hours', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Support GET for testing and status
export async function GET() {
  return NextResponse.json({ 
    message: 'Daily opening hours refresh endpoint (web scraping)', 
    method: 'POST',
    auth: 'Required: adminKey in body or x-admin-key header',
    features: ['Web scraping (free)', 'Daily refresh', 'Batch processing', 'Error handling']
  });
}
