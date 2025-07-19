// app/api/qr/[riddleId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

interface Props {
  params: Promise<{ riddleId: string }>;
}

// Generate QR validation token
function generateQRToken(riddleId: string, timestamp: number): string {
  const secret = process.env.QR_SECRET || 'your-secret-key-here';
  const data = `${riddleId}-${timestamp}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex').substring(0, 16);
}

// Verify QR validation token
function verifyQRToken(riddleId: string, timestamp: number, token: string): boolean {
  const expectedToken = generateQRToken(riddleId, timestamp);
  const tokenAge = Date.now() - timestamp;
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  return expectedToken === token && tokenAge < maxAge;
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { riddleId } = await params;
    const { searchParams } = new URL(request.url);
    
    console.log('🔗 QR ACCESS: Attempting to access riddle via QR:', riddleId);
    
    // Check for QR validation token (anti-cheat measure)
    const qrToken = searchParams.get('token');
    const qrTimestamp = searchParams.get('ts');
    
    if (!qrToken || !qrTimestamp) {
      console.log('🚫 QR ACCESS: Missing QR validation token - direct URL access blocked');
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=invalid_qr', request.url));
    }
    
    // Verify QR token authenticity
    if (!verifyQRToken(riddleId, parseInt(qrTimestamp), qrToken)) {
      console.log('🚫 QR ACCESS: Invalid or expired QR token');
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=invalid_qr', request.url));
    }
    
    const cookieStore = await cookies();
    const groupId = cookieStore.get("group_id")?.value;
    const userId = cookieStore.get("user_id")?.value;
    
    // Check if user has valid game cookies
    if (!groupId || !userId) {
      console.log('🔗 QR ACCESS: No valid cookies, redirecting to unauthorized');
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=no_session', request.url));
    }
    
    const supabase = await createClient();
    
    // Verify user is actually in this group
    const { data: membership, error: memberError } = await supabase
      .from("group_members")
      .select("user_id, is_leader")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();
    
    if (memberError || !membership) {
      console.log('🔗 QR ACCESS: User not member of group');
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=not_member', request.url));
    }
    
    // Get riddle details with order and next riddle info
    const { data: riddle, error: riddleError } = await supabase
      .from("riddles")
      .select("id, order_index, track_id, next_riddle_id")
      .eq("id", riddleId)
      .single();
    
    if (riddleError || !riddle) {
      console.log('🔗 QR ACCESS: Riddle not found');
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=riddle_not_found', request.url));
    }
    
    // Get group's current riddle and progression info
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("current_riddle_id, track_id, finished")
      .eq("id", groupId)
      .single();
    
    if (groupError || !group) {
      console.log('🔗 QR ACCESS: Group not found');
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=group_not_found', request.url));
    }
    
    // Verify riddle belongs to the same track as the group
    if (riddle.track_id !== group.track_id) {
      console.log('🔗 QR ACCESS: Riddle from different track');
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=wrong_track', request.url));
    }
    
    // Check if group has already finished
    if (group.finished) {
      console.log('🔗 QR ACCESS: Group already finished, redirecting to completion');
      return NextResponse.redirect(new URL(`/adventure-complete/${groupId}`, request.url));
    }
    
    // Get current riddle details for order comparison
    const { data: currentRiddle, error: currentRiddleError } = await supabase
      .from("riddles")
      .select("order_index")
      .eq("id", group.current_riddle_id)
      .single();
    
    if (currentRiddleError || !currentRiddle) {
      console.log('🔗 QR ACCESS: Current riddle not found');
      return NextResponse.redirect(new URL('/riddle-unauthorized?reason=current_riddle_error', request.url));
    }
    
    const currentOrder = currentRiddle.order_index;
    const scannedOrder = riddle.order_index;
    
    // QR Access Logic with Anti-Cheat
    if (scannedOrder === currentOrder) {
      // Case 1: Re-scanning current riddle (allowed)
      console.log('🔗 QR ACCESS: Re-scanning current riddle - allowed');
      return NextResponse.redirect(new URL(`/riddle/${riddleId}`, request.url));
      
    } else if (scannedOrder === currentOrder + 1) {
      // Case 2: Scanning next riddle (progression) - ANY TEAM MEMBER CAN PROGRESS
      console.log('🔗 QR ACCESS: Team member scanning next riddle - progressing group');
      
      // Update group's current riddle (progression)
      const { error: updateError } = await supabase
        .from("groups")
        .update({ current_riddle_id: riddleId })
        .eq("id", groupId);
      
      if (updateError) {
        console.error('🔗 QR ACCESS: Failed to update group progression:', updateError);
        return NextResponse.redirect(new URL('/riddle-unauthorized?reason=update_failed', request.url));
      }
      
      // Check if this was the final riddle
      if (!riddle.next_riddle_id) {
        console.log('🔗 QR ACCESS: Final riddle completed via QR');
        
        // Mark group as finished
        const { error: finishError } = await supabase
          .from("groups")
          .update({ 
            finished: true,
            completed_at: new Date().toISOString()
          })
          .eq("id", groupId);
        
        if (finishError) {
          console.error('🔗 QR ACCESS: Failed to mark group as finished:', finishError);
        }
        
        return NextResponse.redirect(new URL(`/adventure-complete/${groupId}`, request.url));
      }
      
      return NextResponse.redirect(new URL(`/riddle/${riddleId}`, request.url));
      
    } else if (scannedOrder < currentOrder) {
      // Case 3: Scanning previous riddle (redirect to current)
      console.log('🔗 QR ACCESS: Scanning old riddle, redirecting to current');
      return NextResponse.redirect(new URL(`/riddle/${group.current_riddle_id}?error=old_riddle`, request.url));
      
    } else {
      // Case 4: Scanning future riddle (cheating attempt)
      console.log('🔗 QR ACCESS: Anti-cheat triggered - trying to skip ahead');
      return NextResponse.redirect(new URL(`/riddle/${group.current_riddle_id}?error=skip_ahead`, request.url));
    }
    
  } catch (error) {
    console.error('🔗 QR ACCESS: Error:', error);
    return NextResponse.redirect(new URL('/riddle-unauthorized?reason=server_error', request.url));
  }
}