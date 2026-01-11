import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

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
    
    console.log('🔍 Fetching locations for trackId:', trackId);
    
    // Get locations for the specified track (no opening hours from DB)
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

    // Transform the data to match expected format
    const formattedLocations = locations.map(location => ({
      id: location.id,
      order: location.order_index,
      name: location.location_id,
      opening_hours: location.opening_hours
    }));

    console.log('🔍 Successfully fetched', formattedLocations.length, 'locations');
    
    return NextResponse.json({ 
      locations: formattedLocations 
    });
  } catch (error) {
    console.error('🔍 Unexpected error in locations API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
