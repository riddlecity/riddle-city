import { NextRequest, NextResponse } from 'next/server';
import { getCachedOpeningHours } from '../../../lib/openingHoursCache';

export async function POST(request: NextRequest) {
  try {
    const { google_place_url, location_name, force_refresh = false } = await request.json();
    
    if (!google_place_url) {
      return NextResponse.json({ error: 'Google Place URL is required' }, { status: 400 });
    }

    const openingHours = await getCachedOpeningHours(
      google_place_url, 
      location_name || 'Unknown',
      force_refresh
    );
    
    return NextResponse.json({ 
      opening_hours: openingHours,
      force_refresh: force_refresh,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in cached hours API:', error);
    return NextResponse.json({ error: 'Failed to fetch cached hours' }, { status: 500 });
  }
}
