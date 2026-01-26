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
    
    // Fetch both date and standard (pub) tracks for the location using location+mode
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('id, start_label, start_time, mode, name')
      .eq('location', location)
      .in('mode', ['date', 'standard']);

    if (error) {
      console.error('🔍 Error fetching track metadata:', error);
      return NextResponse.json({ error: 'Failed to fetch track metadata' }, { status: 500 });
    }

    // Organize tracks by mode
    const dateTrack = tracks?.find(track => track.mode === 'date') || null;
    const pubTrack = tracks?.find(track => track.mode === 'standard') || null;
    
    console.log('🔍 Found tracks:', { 
      dateTrack: dateTrack ? `${dateTrack.id} (${dateTrack.mode})` : 'none',
      pubTrack: pubTrack ? `${pubTrack.id} (${pubTrack.mode})` : 'none'
    });
    
    // Get riddle counts for each track using actual track IDs from database
    const riddleCounts = await Promise.all([
      dateTrack ? supabase
        .from('riddles')
        .select('id', { count: 'exact', head: true })
        .eq('track_id', dateTrack.id) : Promise.resolve({ count: 0 }),
      pubTrack ? supabase
        .from('riddles')
        .select('id', { count: 'exact', head: true })
        .eq('track_id', pubTrack.id) : Promise.resolve({ count: 0 })
    ]);
    
    const [dateRiddleCount, pubRiddleCount] = riddleCounts;

    console.log('🔍 Track metadata loaded successfully:', { 
      dateTrack: !!dateTrack, 
      pubTrack: !!pubTrack,
      dateRiddleCount: dateRiddleCount.count,
      pubRiddleCount: pubRiddleCount.count
    });

    return NextResponse.json({
      dateTrack: dateTrack ? {
        id: dateTrack.id,
        name: dateTrack.name,
        start_label: dateTrack.start_label,
        start_time: dateTrack.start_time,
        riddle_count: dateRiddleCount.count || 0
      } : null,
      pubTrack: pubTrack ? {
        id: pubTrack.id,
        name: pubTrack.name,
        start_label: pubTrack.start_label,
        start_time: pubTrack.start_time,
        riddle_count: pubRiddleCount.count || 0
      } : null
    });

  } catch (error) {
    console.error('🔍 Unexpected error in track metadata API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
