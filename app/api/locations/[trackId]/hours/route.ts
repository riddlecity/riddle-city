// app/api/locations/[trackId]/hours/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';
import { getCachedOpeningHours } from '../../../../../lib/openingHoursCache';

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
        google_place_url
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
      const formattedLocation = {
        id: location.id,
        order: location.order_index,
        name: location.location_id,
        google_place_url: location.google_place_url,
        opening_hours: null as any
      };

      // Only fetch hours if Google Place URL exists
      if (location.google_place_url) {
        try {
          const hours = await getCachedOpeningHours(
            location.google_place_url,
            location.location_id
          );
          
          if (hours) {
            formattedLocation.opening_hours = hours;
            console.log('✅ Loaded hours for:', location.location_id);
          } else {
            console.log('⚠️ No hours found for:', location.location_id);
          }
        } catch (error) {
          console.error('❌ Error loading hours for', location.location_id, ':', error);
        }
      }

      return formattedLocation;
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
