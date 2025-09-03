// app/api/riddles/[riddleId]/location/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ riddleId: string }> }
) {
  try {
    const { riddleId } = await params;
    
    if (!riddleId) {
      return NextResponse.json({ error: 'Riddle ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get riddle's location data
    const { data: riddle, error } = await supabase
      .from('riddles')
      .select('google_place_url, location_id')
      .eq('id', riddleId)
      .single();

    if (error) {
      console.error('Error fetching riddle location:', error);
      return NextResponse.json({ error: 'Failed to fetch riddle location' }, { status: 500 });
    }

    if (!riddle || !riddle.google_place_url) {
      return NextResponse.json({ error: 'No location data found for this riddle' }, { status: 404 });
    }

    return NextResponse.json({ 
      google_place_url: riddle.google_place_url,
      location_name: riddle.location_id
    });
  } catch (error) {
    console.error('Unexpected error in riddle location API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
