import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getCachedOpeningHours } from '../../../lib/openingHoursCache';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting daily opening hours refresh...');
    console.log('🔄 Environment:', process.env.NODE_ENV, 'Vercel:', !!process.env.VERCEL);
    
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

    // In production (Vercel), web scraping is handled by GitHub Actions
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    
    if (isProduction) {
      console.log('🔄 Production environment detected - web scraping is handled by GitHub Actions');
      
      // Check if we have the committed cache file
      try {
        await fs.access(path.join(process.cwd(), 'opening-hours-cache.json'));
        
        return NextResponse.json({
          success: true,
          message: 'Production environment: Opening hours are refreshed daily by GitHub Actions at 6 AM UK time',
          method: 'GitHub Actions workflow',
          cache_status: 'Available',
          next_update: 'Daily at 6 AM UK time',
          note: 'Web scraping is disabled in Vercel production environment to avoid 500 errors'
        });
      } catch {
        return NextResponse.json({
          success: false,
          message: 'Production environment: GitHub Actions handles refresh, but cache file not found',
          method: 'GitHub Actions workflow',
          cache_status: 'Missing',
          recommendation: 'Check GitHub Actions workflow logs'
        }, { status: 503 });
      }
    }

    // Development environment: continue with web scraping
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

    console.log(`🔍 Found ${locations.length} locations to refresh in development`);
    
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
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
  
  if (isProduction) {
    return NextResponse.json({ 
      message: 'Production: Opening hours refresh via GitHub Actions', 
      method: 'GitHub Actions workflow (daily at 6 AM UK time)',
      auth: 'Not required in production',
      features: ['Automated daily refresh', 'Committed cache file', 'No Vercel limitations'],
      web_scraping: 'Disabled in production (handled by GitHub Actions)',
      manual_refresh: 'Not available in production - use GitHub Actions workflow_dispatch'
    });
  } else {
    return NextResponse.json({ 
      message: 'Development: Opening hours refresh endpoint (web scraping)', 
      method: 'POST',
      auth: 'Required: adminKey in body or x-admin-key header',
      features: ['Web scraping (free)', 'Manual refresh', 'Batch processing', 'Error handling']
    });
  }
}
