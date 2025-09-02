import { NextRequest, NextResponse } from 'next/server';
import { getCachedOpeningHours } from '../../../lib/openingHoursCache';

export async function POST(request: NextRequest) {
  try {
    const { google_place_url, location_name } = await request.json();
    
    if (!google_place_url) {
      return NextResponse.json({ error: 'Google Place URL is required' }, { status: 400 });
    }

    const openingHours = await getCachedOpeningHours(google_place_url, location_name || 'Unknown');
    
    return NextResponse.json({ opening_hours: openingHours });
  } catch (error) {
    console.error('Error in cached hours API:', error);
    return NextResponse.json({ error: 'Failed to fetch cached hours' }, { status: 500 });
  }
}
