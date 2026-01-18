// app/api/locations/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    console.log('🔍 Fetching all locations with tracks');
    
    // Get distinct locations that have at least one track
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('location')
      .order('location');

    if (error) {
      console.error('🔍 Error fetching locations:', error);
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }

    // Get unique locations
    const uniqueLocations = [...new Set(tracks?.map(t => t.location) || [])];
    
    console.log('🔍 Found locations:', uniqueLocations);

    return NextResponse.json({ 
      locations: uniqueLocations.map(location => ({
        slug: location,
        name: location.charAt(0).toUpperCase() + location.slice(1)
      }))
    });

  } catch (error) {
    console.error('🔍 Unexpected error in locations API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
