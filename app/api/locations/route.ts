// app/api/locations/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    console.log('🔍 Fetching all locations with tracks');
    
    // Get all tracks with their location field
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('location, id')
      .not('location', 'is', null)
      .order('location');

    if (error) {
      console.error('🔍 Error fetching locations:', error);
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }

    console.log('🔍 Raw tracks data:', tracks);

    // Get unique locations with track counts
    const locationCounts = tracks?.reduce((acc, track) => {
      const loc = track.location;
      if (loc && loc.trim() !== '' && loc.toLowerCase() !== 'null') {
        acc[loc] = (acc[loc] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {};
    
    const uniqueLocations = Object.keys(locationCounts);
    
    console.log('🔍 Found locations with counts:', locationCounts);

    return NextResponse.json({ 
      locations: uniqueLocations.map(location => ({
        slug: location,
        name: location.charAt(0).toUpperCase() + location.slice(1),
        trackCount: locationCounts[location]
      }))
    });

  } catch (error) {
    console.error('🔍 Unexpected error in locations API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
