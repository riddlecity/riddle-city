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
  const secret = process.env.QR_SECRET;
  
  // 🔒 SECURITY: Ensure QR_SECRET is set
  if (!secret) {
    throw new Error('QR_SECRET environment variable is not set');
  }
  
  const data = `location-${locationId}-${timestamp}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex').substring(0, 16);
}

// Verify QR validation token
function verifyQRToken(locationId: string, timestamp: number, token: string): boolean {
  try {
    const expectedToken = generateQRToken(locationId, timestamp);
    return expectedToken === token;
  } catch (error) {
    return false; // Invalid if secret not set
  }
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { locationId } = await params;
    const { searchParams } = new URL(request.url);
    
    // 🔒 SECURITY: Enable QR token validation (no more bypass!)
    const qrToken = searchParams.get('token');
    const qrTimestamp = searchParams.get('ts');
    
    if (!qrToken || !qrTimestamp) {
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=invalid_qr', request.url));
    }
    
    if (!verifyQRToken(locationId, parseInt(qrTimestamp), qrToken)) {
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=invalid_qr', request.url));
    }
    
    const cookieStore = await cookies();
    const groupId = cookieStore.get("group_id")?.value;
    const userId = cookieStore.get("user_id")?.value;
    
    // Special handling for library location - redirect non-players to library website
    if (!groupId || !userId) {
      if (locationId === 'library') {
        return NextResponse.redirect(new URL('https://www.barnsley.gov.uk/services/libraries/find-a-library/library-the-lightbox/', request.url));
      }
      
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
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=not_member', request.url));
    }
    
    // Get group info including current track
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("current_riddle_id, track_id, finished")
      .eq("id", groupId)
      .single();
    
    if (groupError || !group) {
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=group_not_found', request.url));
    }
    
    if (group.finished) {
      return NextResponse.redirect(new URL(`/adventure-complete/${groupId}`, request.url));
    }
    
    // Get the current riddle to find what the next riddle should be
    const { data: currentRiddle, error: currentError } = await supabase
      .from("riddles")
      .select("id, order_index, next_riddle_id, location_id")
      .eq("id", group.current_riddle_id)
      .eq("track_id", group.track_id)
      .single();
    
    if (currentError || !currentRiddle) {
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=current_riddle_error', request.url));
    }
    
    // 🔒 ANTI-CHEAT: Check if we're at the correct location for the current riddle
    if (currentRiddle.location_id !== locationId) {
      return NextResponse.redirect(new URL(`/riddle/${group.current_riddle_id}?error=wrong_location`, request.url));
    }
    
    // Check if there's a next riddle
    if (!currentRiddle.next_riddle_id) {
      // Final riddle completed
      const { error: finishError } = await supabase
        .from("groups")
        .update({ 
          finished: true,
          completed_at: new Date().toISOString()
        })
        .eq("id", groupId);
      
      if (finishError) {
        // Silently handle error - don't expose details
      }
      
      return NextResponse.redirect(new URL(`/adventure-complete/${groupId}`, request.url));
    }
    
    // Progress to the next riddle
    const { error: updateError } = await supabase
      .from("groups")
      .update({ current_riddle_id: currentRiddle.next_riddle_id })
      .eq("id", groupId);
    
    if (updateError) {
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=update_failed', request.url));
    }
    
    return NextResponse.redirect(new URL(`/riddle/${currentRiddle.next_riddle_id}`, request.url));
    
  } catch (error) {
    return NextResponse.redirect(new URL('/riddle-unauthorized?reason=server_error', request.url));
  }
}