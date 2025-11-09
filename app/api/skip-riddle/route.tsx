import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

interface GroupUpdate {
  current_riddle_id: string;
  riddles_skipped: number;
  finished?: boolean;
  completed_at?: string;
}

// Create service client once and reuse
const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  console.log("=== SKIP RIDDLE API START (OPTIMIZED) ===");
  
  const cookieStore = await cookies();
  
  // Parse request body for emergency skip info
  let isEmergencySkip = false;
  try {
    const body = await request.json();
    isEmergencySkip = body.isEmergencySkip || false;
  } catch (e) {
    // Continue with default values if parsing fails
  }
  
  // Try new format first (riddlecity-session)
  let groupId: string | undefined;
  let userId: string | undefined;
  
  const sessionCookie = cookieStore.get("riddlecity-session")?.value;
  if (sessionCookie) {
    try {
      const decoded = Buffer.from(sessionCookie, 'base64').toString('utf8');
      const sessionData = JSON.parse(decoded);
      groupId = sessionData.groupId;
      userId = sessionData.userId;
      console.log("🔍 SKIP RIDDLE: Using new session cookie format");
    } catch (e) {
      console.warn("Failed to parse riddlecity-session cookie:", e);
    }
  }
  
  // Fallback to old format
  if (!groupId || !userId) {
    groupId = cookieStore.get("group_id")?.value;
    userId = cookieStore.get("user_id")?.value;
    console.log("🔍 SKIP RIDDLE: Using legacy cookie format");
  }

  if (!groupId || !userId) {
    console.error("Missing required cookies");
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const supabase = await createClient();

    // Check if user is leader and get group info
    const { data: member, error: memberError } = await supabase
      .from("group_members")
      .select("is_leader")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (memberError) {
      console.error("Failed to get member info:", memberError);
      return NextResponse.json({ error: "User not found in group" }, { status: 404 });
    }

    // Check authorization - leaders can always skip, non-leaders only during emergency
    if (!member.is_leader && !isEmergencySkip) {
      console.error("User is not leader and not emergency skip");
      return NextResponse.json({ error: "Only group leaders can skip riddles" }, { status: 403 });
    }

    // Get current group riddle
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("current_riddle_id, riddles_skipped, track_id")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      console.error("Failed to get group:", groupError);
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Get current riddle to check if it has a next riddle
    const { data: currentRiddle, error: riddleError } = await supabase
      .from("riddles")
      .select("next_riddle_id")
      .eq("id", group.current_riddle_id)
      .single();

    if (riddleError) {
      console.error("Failed to get current riddle:", riddleError);
      return NextResponse.json({ error: "Current riddle not found" }, { status: 404 });
    }

    // If current riddle has no next_riddle_id, we're on the final riddle
    // Skipping from the final riddle should complete the adventure
    const isSkippingFromFinalRiddle = !currentRiddle?.next_riddle_id;

    if (isSkippingFromFinalRiddle) {
      // Complete the adventure
      const completionTime = new Date().toISOString();
      const updates: GroupUpdate = {
        current_riddle_id: group.current_riddle_id, // Stay on current riddle
        riddles_skipped: (group.riddles_skipped || 0) + 1,
        finished: true,
        completed_at: completionTime
      };

      const [updateResult] = await Promise.allSettled([
        serviceSupabase
          .from('groups')
          .update(updates)
          .eq('id', groupId)
      ]);

      if (updateResult.status === 'rejected') {
        console.error("Failed to complete adventure:", updateResult.reason);
        return NextResponse.json({ error: "Failed to complete adventure" }, { status: 500 });
      }

      console.log(`🎯 SKIP SUCCESSFUL: Completed adventure by skipping final riddle`);

      return NextResponse.json({
        success: true,
        nextRiddleId: null,
        completed: true,
        message: "Adventure completed!",
        riddles_skipped: updates.riddles_skipped,
        wasEmergencySkip: isEmergencySkip
      });
    }

    // Not on final riddle, so move to next riddle
    const nextRiddleId = currentRiddle.next_riddle_id;

    // Prepare update data
    const updates: GroupUpdate = {
      current_riddle_id: nextRiddleId,
      riddles_skipped: (group.riddles_skipped || 0) + 1
    };

    // Don't mark as complete - just moving to next riddle

    // OPTIMIZATION: Use service client for update + broadcast in parallel
    const [updateResult, broadcastResult] = await Promise.allSettled([
      serviceSupabase
        .from('groups')
        .update(updates)
        .eq('id', groupId),
      
      serviceSupabase
        .channel(`riddle-updates-${groupId}`)
        .send({
          type: 'broadcast',
          event: 'riddle_update',
          payload: {
            groupId,
            newRiddleId: nextRiddleId,
            skippedCount: updates.riddles_skipped,
            isCompleted: false,
            completedAt: null,
            wasEmergencySkip: isEmergencySkip
          }
        })
    ]);

    if (updateResult.status === 'rejected') {
      console.error("Failed to update group:", updateResult.reason);
      return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
    }

    if (broadcastResult.status === 'rejected') {
      console.error("Broadcast error:", broadcastResult.reason);
      // Continue even if broadcast fails
    }

    console.log(`🎯 SKIP SUCCESSFUL: ${isEmergencySkip ? 'Emergency' : 'Normal'} skip to ${nextRiddleId}`);

    return NextResponse.json({
      success: true,
      nextRiddleId: nextRiddleId,
      completed: false,
      message: "Skipped to next riddle",
      riddles_skipped: updates.riddles_skipped,
      wasEmergencySkip: isEmergencySkip
    });

  } catch (error) {
    console.error("Skip riddle API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}