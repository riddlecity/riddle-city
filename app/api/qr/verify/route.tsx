// app/api/qr/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { addRiddleCompletion } from '@/lib/riddleProgress';

// Generate QR validation token
function generateQRToken(locationId: string, timestamp: number): string {
  const secret = process.env.QR_SECRET;
  
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
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const qrToken = searchParams.get('token');
    const qrTimestamp = searchParams.get('ts');
    
    if (!locationId || !qrToken || !qrTimestamp) {
      return NextResponse.json(
        { success: false, message: '❌ Invalid QR code' },
        { status: 400 }
      );
    }
    
    if (!verifyQRToken(locationId, parseInt(qrTimestamp), qrToken)) {
      return NextResponse.json(
        { success: false, message: '❌ Invalid or expired QR code' },
        { status: 400 }
      );
    }
    
    const cookieStore = await cookies();
    const groupId = cookieStore.get("group_id")?.value;
    const userId = cookieStore.get("user_id")?.value;
    
    if (!groupId || !userId) {
      return NextResponse.json(
        { success: false, message: '❌ No active game session found' },
        { status: 401 }
      );
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
      return NextResponse.json(
        { success: false, message: '❌ You are not part of this game' },
        { status: 403 }
      );
    }
    
    // Get group info
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("current_riddle_id, track_id, finished, riddle_progress")
      .eq("id", groupId)
      .single();
    
    if (groupError || !group) {
      return NextResponse.json(
        { success: false, message: '❌ Game session not found' },
        { status: 404 }
      );
    }
    
    if (group.finished) {
      return NextResponse.json(
        { 
          success: true, 
          message: '🎉 Adventure already completed!',
          redirectUrl: `/adventure-complete/${groupId}`
        },
        { status: 200 }
      );
    }
    
    // Get the current riddle
    const { data: currentRiddle, error: currentError } = await supabase
      .from("riddles")
      .select("id, order_index, next_riddle_id, location_id")
      .eq("id", group.current_riddle_id)
      .eq("track_id", group.track_id)
      .single();
    
    if (currentError || !currentRiddle) {
      return NextResponse.json(
        { success: false, message: '❌ Current riddle not found' },
        { status: 404 }
      );
    }
    
    // Check if scanning correct location
    if (currentRiddle.location_id !== locationId) {
      // Check if they're scanning an old location (already completed)
      const { data: oldRiddle } = await supabase
        .from("riddles")
        .select("order_index")
        .eq("location_id", locationId)
        .eq("track_id", group.track_id)
        .single();
      
      if (oldRiddle && oldRiddle.order_index < currentRiddle.order_index) {
        return NextResponse.json(
          { success: false, message: '⏭️ Already scanned this one - you\'re ahead!' },
          { status: 400 }
        );
      }
      
      // Scanning future location
      return NextResponse.json(
        { success: false, message: '🔒 You haven\'t unlocked this riddle yet' },
        { status: 400 }
      );
    }
    
    // Correct location! Check if there's a next riddle
    if (!currentRiddle.next_riddle_id) {
      // Final riddle completed
      // Track this scan in riddle progress
      const riddleOrder = currentRiddle.order_index;
      const updatedProgress = riddleOrder 
        ? addRiddleCompletion(group.riddle_progress, riddleOrder, 'scan')
        : group.riddle_progress;
      
      // 🔒 CONCURRENCY GUARD: compare-and-swap on current_riddle_id so a
      // duplicate/simultaneous scan can't double-apply the update.
      const { error: finishError } = await supabase
        .from("groups")
        .update({ 
          finished: true,
          completed_at: new Date().toISOString(),
          riddle_progress: updatedProgress
        })
        .eq("id", groupId)
        .eq("current_riddle_id", group.current_riddle_id);
      
      if (finishError) {
        console.error('Error finishing game:', finishError);
      }
      
      return NextResponse.json(
        { 
          success: true, 
          message: '🎉 Final code found! Adventure complete!',
          redirectUrl: `/adventure-complete/${groupId}`
        },
        { status: 200 }
      );
    }
    
    // Progress to the next riddle
    // Track this scan in riddle progress
    const riddleOrder = currentRiddle.order_index;
    const updatedProgress = riddleOrder 
      ? addRiddleCompletion(group.riddle_progress, riddleOrder, 'scan')
      : group.riddle_progress;
    
    // 🔒 CONCURRENCY GUARD: Only advance if the group is still on the riddle
    // we just verified. If another team member's scan/answer already moved
    // the group forward, this affects 0 rows and we fall back to the
    // authoritative next_riddle_id from the database.
    const { data: updatedGroup, error: updateError } = await supabase
      .from("groups")
      .update({ 
        current_riddle_id: currentRiddle.next_riddle_id,
        riddle_progress: updatedProgress
      })
      .eq("id", groupId)
      .eq("current_riddle_id", group.current_riddle_id)
      .select("current_riddle_id")
      .maybeSingle();
    
    if (updateError) {
      return NextResponse.json(
        { success: false, message: '❌ Failed to update progress' },
        { status: 500 }
      );
    }

    if (!updatedGroup) {
      // Someone else already advanced the group - fetch the authoritative state
      const { data: freshGroup } = await supabase
        .from("groups")
        .select("current_riddle_id, finished")
        .eq("id", groupId)
        .single();

      if (freshGroup?.finished) {
        return NextResponse.json(
          { 
            success: true, 
            message: '🎉 Final code found! Adventure complete!',
            redirectUrl: `/adventure-complete/${groupId}`
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { 
          success: true, 
          message: '✓ Code found! Moving to next riddle...',
          redirectUrl: `/riddle/${freshGroup?.current_riddle_id ?? currentRiddle.next_riddle_id}`
        },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      { 
        success: true, 
        message: '✓ Code found! Moving to next riddle...',
        redirectUrl: `/riddle/${currentRiddle.next_riddle_id}`
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('QR verification error:', error);
    return NextResponse.json(
      { success: false, message: '❌ Something went wrong' },
      { status: 500 }
    );
  }
}
