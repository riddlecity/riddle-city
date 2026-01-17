import { NextRequest, NextResponse } from 'next/server';
import { checkMultipleLocationHours } from '../../../lib/timeWarnings';
import { createClient } from '../../../lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get('trackId');
    const location = searchParams.get('location');
    const mode = searchParams.get('mode');
    
    let actualTrackId = trackId;
    
    // If trackId not found directly, try to find it by location and mode
    if (trackId || (location && mode)) {
      const supabase = await createClient();
      
      // First try direct trackId lookup
      if (trackId) {
        const { data: track } = await supabase
          .from('tracks')
          .select('id')
          .eq('id', trackId)
          .single();
        
        if (track) {
          actualTrackId = track.id;
        } else {
          // Track ID not found, try to find by location and mode
          console.log(`⚠️ Track ID "${trackId}" not found, trying location+mode lookup...`);
          
          if (trackId.includes('_')) {
            const parts = trackId.split('_');
            const inferredMode = parts[0]; // e.g., "standard" or "date"
            const inferredLocation = parts.slice(1).join('_'); // e.g., "barnsley"
            
            // Try to find track by location and mode
            const { data: trackByMode } = await supabase
              .from('tracks')
              .select('id, mode')
              .eq('location', inferredLocation)
              .single();
            
            if (trackByMode && trackByMode.mode === inferredMode) {
              actualTrackId = trackByMode.id;
              console.log(`✅ Found track by mode: ${actualTrackId}`);
            } else if (trackByMode) {
              // Found a track for this location, use it even if mode doesn't match exactly
              actualTrackId = trackByMode.id;
              console.log(`✅ Found track by location: ${actualTrackId} (mode: ${trackByMode.mode})`);
            }
          }
        }
      }
      
      // Fallback: try location and mode parameters
      if (!actualTrackId && location && mode) {
        const { data: trackByParams } = await supabase
          .from('tracks')
          .select('id')
          .eq('location', location)
          .eq('mode', mode)
          .single();
        
        if (trackByParams) {
          actualTrackId = trackByParams.id;
          console.log(`✅ Found track by location+mode params: ${actualTrackId}`);
        }
      }
    }
    
    if (!actualTrackId) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    const timeWarning = await checkMultipleLocationHours(actualTrackId);
    
    return NextResponse.json(timeWarning);
  } catch (error) {
    console.error('Error getting track time warning:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}