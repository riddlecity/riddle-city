// app/api/qr/location/[locationId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

interface Props {
  params: Promise<{ locationId: string }>;
}

// Generate QR validation token
function generateQRToken(locationId: string, timestamp: number): string {
  const secret = process.env.QR_SECRET || 'your-secret-key-here';
  const data = `location-${locationId}-${timestamp}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex').substring(0, 16);
}

// Verify QR validation token
function verifyQRToken(locationId: string, timestamp: number, token: string): boolean {
  const expectedToken = generateQRToken(locationId, timestamp);
  
  console.log('🔧 LOCATION TOKEN DEBUG:', {
    locationId,
    timestamp,
    receivedToken: token,
    expectedToken,
    data: `location-${locationId}-${timestamp}`,
    tokenValid: expectedToken === token
  });
  
  return expectedToken === token; // Permanent QR codes
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { locationId } = await params;
    const { searchParams } = new URL(request.url);
    
    console.log('🌍 LOCATION QR: Attempting to access location:', locationId);
    
    // Check for QR validation token
    const qrToken = searchParams.get('token');
    const qrTimestamp = searchParams.get('ts');
    
    // TEMPORARY: Skip token validation for debugging
    const skipTokenValidation = true; // Change to false once working
    
    if (!skipTokenValidation) {
      if (!qrToken || !qrTimestamp) {
        console.log('🚫 LOCATION QR: Missing QR validation token');
        return NextResponse.redirect(new URL('/riddle-unauthorized?reason=invalid_qr', request.url));
      }
      
      if (!verifyQRToken(locationId, parseInt(qrTimestamp), qrToken)) {
        console.log('🚫 LOCATION QR: Invalid QR token');
        return NextResponse.redirect(new URL('/riddle-unauthorized?reason=invalid_qr', request.url));
      }
    } else {
      console.log('⚠️ LOCATION QR: TOKEN VALIDATION TEMPORARILY DISABLED');
    }
    
    const cookieStore = await cookies();
    const groupId = cookieStore.get("group_id")?.value;
    const userId = cookieStore.get("user_id")?.value;
    
    if (!groupId || !userId) {
      console.log('🌍 LOCATION QR: No valid cookies');
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=no_session', request.url));
    }
    
    const supabase = await createClient();
    
    // Verify user is in this group
    const { data: membership, error: memberError } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();
    
    if (memberError || !membership) {
      console.log('🌍 LOCATION QR: User not member of group');
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=not_member', request.url));
    }
    
    // Get group info including current track
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("current_riddle_id, track_id, finished")
      .eq("id", groupId)
      .single();
    
    if (groupError || !group) {
      console.log('🌍 LOCATION QR: Group not found');
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=group_not_found', request.url));
    }
    
    if (group.finished) {
      console.log('🌍 LOCATION QR: Group already finished');
      return NextResponse.redirect(new URL(`/adventure-complete/${groupId}`, request.url));
    }
    
    console.log('🌍 LOCATION QR: Group info:', {
      groupId,
      trackId: group.track_id,
      currentRiddleId: group.current_riddle_id,
      locationId
    });
    
    // Find the riddle for this location in the team's current track
    const { data: targetRiddle, error: riddleError } = await supabase
      .from("riddles")
      .select("id, order_index, next_riddle_id, title")
      .eq("location_id", locationId)
      .eq("track_id", group.track_id)
      .single();
    
    if (riddleError || !targetRiddle) {
      console.log('🌍 LOCATION QR: No riddle found for this location in current track:', {
        locationId,
        trackId: group.track_id,
        error: riddleError
      });
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=location_not_in_track', request.url));
    }
    
    console.log('🌍 LOCATION QR: Found riddle for location:', {
      locationId,
      riddleId: targetRiddle.id,
      riddleTitle: targetRiddle.title,
      trackId: group.track_id
    });
    
    // Get current riddle details
    const { data: currentRiddle, error: currentError } = await supabase
      .from("riddles")
      .select("order_index")
      .eq("id", group.current_riddle_id)
      .eq("track_id", group.track_id)
      .single();
    
    if (currentError || !currentRiddle) {
      console.log('🌍 LOCATION QR: Current riddle not found');
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=current_riddle_error', request.url));
    }
    
    const currentOrder = currentRiddle.order_index;
    const targetOrder = targetRiddle.order_index;
    
    console.log('🌍 LOCATION QR: Order comparison:', {
      locationId,
      currentRiddleId: group.current_riddle_id,
      currentOrder,
      targetRiddleId: targetRiddle.id,
      targetOrder,
      difference: targetOrder - currentOrder
    });
    
    // Location-based progression logic
    if (targetOrder === currentOrder) {
      // Re-scanning current location
      console.log('🌍 LOCATION QR: Re-scanning current location - allowed');
      return NextResponse.redirect(new URL(`/riddle/${targetRiddle.id}`, request.url));
      
    } else if (targetOrder === currentOrder + 1) {
      // Scanning next location - progress the group
      console.log('🌍 LOCATION QR: Scanning next location - progressing group');
      
      // Update group's current riddle
      const { error: updateError } = await supabase
        .from("groups")
        .update({ current_riddle_id: targetRiddle.id })
        .eq("id", groupId);
      
      if (updateError) {
        console.error('🌍 LOCATION QR: Failed to update group:', updateError);
        return NextResponse.redirect(new URL('/riddle-unauthorized?reason=update_failed', request.url));
      }
      
      console.log('🌍 LOCATION QR: Successfully progressed to:', targetRiddle.id);
      
      // Check if this was the final riddle
      if (!targetRiddle.next_riddle_id) {
        console.log('🌍 LOCATION QR: Final location completed');
        
        const { error: finishError } = await supabase
          .from("groups")
          .update({ 
            finished: true,
            completed_at: new Date().toISOString()
          })
          .eq("id", groupId);
        
        if (finishError) {
          console.error('🌍 LOCATION QR: Failed to mark finished:', finishError);
        }
        
        return NextResponse.redirect(new URL(`/adventure-complete/${groupId}`, request.url));
      }
      
      return NextResponse.redirect(new URL(`/riddle/${targetRiddle.id}`, request.url));
      
    } else if (targetOrder < currentOrder) {
      // Scanning previous location
      console.log('🌍 LOCATION QR: Scanning previous location - redirecting to current');
      return NextResponse.redirect(new URL(`/riddle/${group.current_riddle_id}?error=old_location`, request.url));
      
    } else {
      // Scanning future location
      console.log('🌍 LOCATION QR: Scanning future location - blocked');
      return NextResponse.redirect(new URL(`/riddle/${group.current_riddle_id}?error=skip_ahead`, request.url));
    }
    
  } catch (error) {
    console.error('🌍 LOCATION QR: Error:', error);
    return NextResponse.redirect(new URL('/riddle-unauthorized?reason=server_error', request.url));
  }
}