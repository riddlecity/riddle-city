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

export async function POST() {
  console.log("=== SKIP RIDDLE API START ===");
  
  const cookieStore = await cookies();
  
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
    // Create both regular and service role clients
    const supabase = await createClient();
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user is leader
    const { data: member, error: memberError } = await supabase
      .from("group_members")
      .select("is_leader")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (memberError || !member?.is_leader) {
      console.error("User is not leader:", memberError);
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

    // Get next riddle
    const { data: currentRiddle, error: riddleError } = await supabase
      .from("riddles")
      .select("next_riddle_id")
      .eq("id", group.current_riddle_id)
      .single();

    if (riddleError || !currentRiddle?.next_riddle_id) {
      console.error("No next riddle found:", riddleError);
      return NextResponse.json({ error: "No next riddle available" }, { status: 400 });
    }

    const nextRiddleId = currentRiddle.next_riddle_id;

    // Check if this is the final riddle by looking ahead
    const { data: nextRiddle } = await supabase
      .from("riddles")
      .select("next_riddle_id")
      .eq("id", nextRiddleId)
      .single();

    const isLastRiddle = !nextRiddle?.next_riddle_id;

    // Prepare update data
    const updates: GroupUpdate = {
      current_riddle_id: nextRiddleId,
      riddles_skipped: (group.riddles_skipped || 0) + 1
    };

    if (isLastRiddle) {
      const completionTime = new Date().toISOString();
      updates.finished = true;
      updates.completed_at = completionTime;
    }

    // Update the group
    const { error: updateError } = await serviceSupabase
      .from('groups')
      .update(updates)
      .eq('id', groupId);

    if (updateError) {
      console.error("Failed to update group:", updateError);
      return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
    }

    // Send broadcast
    try {
      await serviceSupabase
        .channel(`riddle-updates-${groupId}`)
        .send({
          type: 'broadcast',
          event: 'riddle_update',
          payload: {
            groupId,
            newRiddleId: nextRiddleId,
            skippedCount: updates.riddles_skipped,
            isCompleted: isLastRiddle,
            completedAt: isLastRiddle ? updates.completed_at : null
          }
        });
    } catch (broadcastError) {
      console.error("Broadcast error:", broadcastError);
      // Continue even if broadcast fails
    }

    return NextResponse.json({
      success: true,
      nextRiddleId: isLastRiddle ? null : nextRiddleId,
      completed: isLastRiddle,
      message: isLastRiddle ? "Adventure completed!" : "Skipped to next riddle",
      riddles_skipped: updates.riddles_skipped
    });

  } catch (error) {
    console.error("Skip riddle API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}