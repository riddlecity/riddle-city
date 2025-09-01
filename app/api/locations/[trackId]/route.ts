import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: { trackId: string } }
) {
  try {
    const trackId = params.trackId;
    
    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Fetch riddles with Google Place URLs for this track
    const { data, error } = await supabase
      .from('riddles')
      .select('id, riddle_name, location_name, google_place_url')
      .eq('track_id', trackId)
      .not('google_place_url', 'is', null); // Only get riddles with Google URLs

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }

    // Transform the data to match our interface
    const locations = (data || []).map((item: any) => ({
      id: item.id as string,
      name: (item.location_name || item.riddle_name || 'Unknown Location') as string,
      google_place_url: item.google_place_url as string
    }));

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
