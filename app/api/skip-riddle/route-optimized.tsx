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

    // OPTIMIZATION: Single query to get group + member info + current riddle + next riddle
    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .select(`
        current_riddle_id,
        riddles_skipped,
        track_id,
        group_members!inner(is_leader),
        current_riddle:riddles!current_riddle_id(next_riddle_id),
        next_riddle:riddles!current_riddle_id(
          next_riddle:riddles!next_riddle_id(next_riddle_id)
        )
      `)
      .eq("id", groupId)
      .eq("group_members.user_id", userId)
      .single();

    if (groupError || !groupData) {
      console.error("Failed to get group data:", groupError);
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check authorization - leaders can always skip, non-leaders only during emergency
    const isLeader = groupData.group_members?.is_leader;
    if (!isLeader && !isEmergencySkip) {
      console.error("User is not leader and not emergency skip");
      return NextResponse.json({ error: "Only group leaders can skip riddles" }, { status: 403 });
    }

    const nextRiddleId = groupData.current_riddle?.next_riddle_id;
    if (!nextRiddleId) {
      console.error("No next riddle found");
      return NextResponse.json({ error: "No next riddle available" }, { status: 400 });
    }

    // Check if this is the final riddle
    const isLastRiddle = !groupData.next_riddle?.next_riddle?.next_riddle_id;

    // Prepare update data
    const updates: GroupUpdate = {
      current_riddle_id: nextRiddleId,
      riddles_skipped: (groupData.riddles_skipped || 0) + 1
    };

    if (isLastRiddle) {
      const completionTime = new Date().toISOString();
      updates.finished = true;
      updates.completed_at = completionTime;
    }

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
            isCompleted: isLastRiddle,
            completedAt: isLastRiddle ? updates.completed_at : null,
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
      nextRiddleId: isLastRiddle ? null : nextRiddleId,
      completed: isLastRiddle,
      message: isLastRiddle ? "Adventure completed!" : "Skipped to next riddle",
      riddles_skipped: updates.riddles_skipped,
      wasEmergencySkip: isEmergencySkip
    });

  } catch (error) {
    console.error("Skip riddle API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
