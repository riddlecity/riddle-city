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
    
    // Get the current riddle to find what the next riddle should be
    const { data: currentRiddle, error: currentError } = await supabase
      .from("riddles")
      .select("id, order_index, next_riddle_id, location_id")
      .eq("id", group.current_riddle_id)
      .eq("track_id", group.track_id)
      .single();
    
    if (currentError || !currentRiddle) {
      console.log('🌍 LOCATION QR: Current riddle not found');
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=current_riddle_error', request.url));
    }
    
    // Check if we're at the correct location for the current riddle
    if (currentRiddle.location_id !== locationId) {
      console.log('🌍 LOCATION QR: Wrong location for current riddle:', {
        currentRiddleLocation: currentRiddle.location_id,
        scannedLocation: locationId
      });
      return NextResponse.redirect(new URL(`/riddle/${group.current_riddle_id}?error=wrong_location`, request.url));
    }
    
    // Check if there's a next riddle
    if (!currentRiddle.next_riddle_id) {
      console.log('🌍 LOCATION QR: Final riddle completed');
      
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
    
    // Progress to the next riddle
    const { error: updateError } = await supabase
      .from("groups")
      .update({ current_riddle_id: currentRiddle.next_riddle_id })
      .eq("id", groupId);
    
    if (updateError) {
      console.error('🌍 LOCATION QR: Failed to update group:', updateError);
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=update_failed', request.url));
    }
    
    console.log('🌍 LOCATION QR: Successfully progressed from', currentRiddle.id, 'to', currentRiddle.next_riddle_id);
    
    return NextResponse.redirect(new URL(`/riddle/${currentRiddle.next_riddle_id}`, request.url));
    
  } catch (error) {
    console.error('🌍 LOCATION QR: Error:', error);
    return NextResponse.redirect(new URL('/riddle-unauthorized?reason=server_error', request.url));
  }
}