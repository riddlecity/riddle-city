import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ location: string }> }
) {
  try {
    const { location } = await params;
    
    if (!location) {
      return NextResponse.json({ error: 'Location is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    console.log('🔍 Fetching track metadata for location:', location);
    
    // Fetch ALL tracks for the location (not just date and standard)
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('id, name, start_label, start_time, mode, color')
      .eq('location', location)
      .order('mode', { ascending: true }); // Order by mode for consistency

    if (error) {
      console.error('🔍 Error fetching track metadata:', error);
      return NextResponse.json({ error: 'Failed to fetch track metadata' }, { status: 500 });
    }

    console.log('🔍 Found tracks:', tracks);
    
    // Get riddle counts for each track
    const tracksWithCounts = await Promise.all(
      (tracks || []).map(async (track) => {
        const { count } = await supabase
          .from('riddles')
          .select('id', { count: 'exact', head: true })
          .eq('track_id', track.id);
        
        return {
          id: track.id,
          name: track.name,
          start_label: track.start_label,
          start_time: track.start_time,
          mode: track.mode,
          color: track.color || (track.mode === 'date' ? 'pink' : 'yellow'), // Use DB color or fallback
          riddle_count: count || 0
        };
      })
    );

    console.log('🔍 Track metadata loaded successfully:', tracksWithCounts);

    return NextResponse.json({
      tracks: tracksWithCounts
    });

  } catch (error) {
    console.error('🔍 Unexpected error in track metadata API:', error);
    console.error('🔍 Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
