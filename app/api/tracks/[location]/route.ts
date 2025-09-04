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
    
    // Fetch both date and pub tracks for the location in a single optimized query
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('id, start_label, start_time')
      .or(`id.eq.date_${location},id.eq.pub_${location}`);

    if (error) {
      console.error('🔍 Error fetching track metadata:', error);
      return NextResponse.json({ error: 'Failed to fetch track metadata' }, { status: 500 });
    }

    // Get riddle counts for each track
    const dateTrackId = `date_${location}`;
    const pubTrackId = `pub_${location}`;
    
    const [dateRiddleCount, pubRiddleCount] = await Promise.all([
      supabase
        .from('riddles')
        .select('id', { count: 'exact', head: true })
        .eq('track_id', dateTrackId),
      supabase
        .from('riddles')
        .select('id', { count: 'exact', head: true })
        .eq('track_id', pubTrackId)
    ]);

    // Organize the data by track type
    const dateTrack = tracks?.find(track => track.id === `date_${location}`) || null;
    const pubTrack = tracks?.find(track => track.id === `pub_${location}`) || null;

    console.log('🔍 Track metadata loaded successfully:', { 
      dateTrack: !!dateTrack, 
      pubTrack: !!pubTrack,
      dateRiddleCount: dateRiddleCount.count,
      pubRiddleCount: pubRiddleCount.count
    });

    return NextResponse.json({
      dateTrack: dateTrack ? {
        start_label: dateTrack.start_label,
        start_time: dateTrack.start_time,
        riddle_count: dateRiddleCount.count || 0
      } : null,
      pubTrack: pubTrack ? {
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
