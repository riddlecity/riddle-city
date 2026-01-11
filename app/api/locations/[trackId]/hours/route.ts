// app/api/locations/[trackId]/hours/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const { trackId } = await params;
    
    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    console.log('🔍 Fetching locations with hours for trackId:', trackId);
    
    // Get locations for the specified track WITH opening hours in single query
    const { data: locations, error } = await supabase
      .from('riddles')
      .select(`
        id,
        order_index,
        location_id,
        opening_hours
      `)
      .eq('track_id', trackId)
      .order('order_index');

    if (error) {
      console.error('🔍 Error fetching locations:', error);
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }

    if (!locations || locations.length === 0) {
      console.log('🔍 No locations found for trackId:', trackId);
      return NextResponse.json({ locations: [] });
    }

    // SPEED OPTIMIZATION: Fetch all opening hours in parallel
    console.log('🔍 Fetching opening hours for', locations.length, 'locations in parallel');
    
    const locationPromises = locations.map(async (location) => {
      // Parse opening_hours from database
      let parsedHours = null;
      if (location.opening_hours) {
        try {
          parsedHours = typeof location.opening_hours === 'string' 
            ? JSON.parse(location.opening_hours) 
            : location.opening_hours;
        } catch (e) {
          console.error('Failed to parse opening hours for', location.location_id, ':', e);
        }
      }

      return {
        id: location.id,
        order: location.order_index,
        name: location.location_id,
        opening_hours: parsedHours
      };
    });

    // Wait for all hours to load in parallel
    const locationsWithHours = await Promise.all(locationPromises);

    console.log('🔍 Successfully loaded', locationsWithHours.length, 'locations with hours');
    
    return NextResponse.json({ 
      locations: locationsWithHours,
      loadTime: Date.now()
    });
  } catch (error) {
    console.error('🔍 Unexpected error in locations+hours API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
