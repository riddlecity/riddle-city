import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { addRiddleCompletion, type RiddleProgress } from "@/lib/riddleProgress";
import { isLocationEmergencySkippable } from "@/lib/locationEmergencySkip";

interface GroupUpdate {
  current_riddle_id: string;
  riddles_skipped: number;
  riddle_progress?: RiddleProgress;
  finished?: boolean;
  completed_at?: string;
}

// Create service client once and reuse
const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  console.log("=== SKIP RIDDLE API START (OPTIMIZED) ===");
  
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

    // Get current group riddle
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("current_riddle_id, riddles_skipped, track_id, riddle_progress")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      console.error("Failed to get group:", groupError);
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Get current riddle to check if it has a next riddle and get its order
    const { data: currentRiddle, error: riddleError } = await supabase
      .from("riddles")
      .select("next_riddle_id, order_index, opening_hours")
      .eq("id", group.current_riddle_id)
      .single();

    if (riddleError) {
      console.error("Failed to get current riddle:", riddleError);
      return NextResponse.json({ error: "Current riddle not found" }, { status: 404 });
    }

    // 🔒 SECURITY: Only the group leader can skip a riddle - UNLESS the
    // location itself is closed or closing very soon, in which case any
    // member can skip. Eligibility is computed here from the riddle's own
    // opening_hours data - never trust a client-supplied "emergency" flag,
    // since that would let anyone bypass the leader-only restriction.
    const isEmergencySkip = isLocationEmergencySkippable(currentRiddle.opening_hours);

    if (!member.is_leader && !isEmergencySkip) {
      console.error("User is not leader and location is not closed/closing soon");
      return NextResponse.json({ error: "Only the group leader can skip riddles" }, { status: 403 });
    }

    // If current riddle has no next_riddle_id, we're on the final riddle
    // Skipping from the final riddle should complete the adventure
    const isSkippingFromFinalRiddle = !currentRiddle?.next_riddle_id;

    if (isSkippingFromFinalRiddle) {
      // Complete the adventure
      const completionTime = new Date().toISOString();
      
      // Track this skip in riddle progress
      const riddleOrder = currentRiddle.order_index;
      const updatedProgress = riddleOrder 
        ? addRiddleCompletion(group.riddle_progress, riddleOrder, 'skip')
        : group.riddle_progress;
      
      const updates: GroupUpdate = {
        current_riddle_id: group.current_riddle_id, // Stay on current riddle
        riddles_skipped: (group.riddles_skipped || 0) + 1,
        riddle_progress: updatedProgress,
        finished: true,
        completed_at: completionTime
      };

      // 🔒 CONCURRENCY GUARD: Compare-and-swap on current_riddle_id so this
      // skip only applies if nobody else has already progressed the group.
      // 🚨 IMPORTANT: .select().maybeSingle() lets us detect when the CAS
      // condition matched 0 rows (i.e. someone else already moved the group
      // on) - without this check, a failed CAS update silently reports
      // success while writing nothing to the database.
      const { data: updatedGroup, error: updateError } = await serviceSupabase
        .from('groups')
        .update(updates)
        .eq('id', groupId)
        .eq('current_riddle_id', group.current_riddle_id)
        .select('current_riddle_id, finished')
        .maybeSingle();

      if (updateError) {
        console.error("Failed to complete adventure:", updateError);
        return NextResponse.json({ error: "Failed to complete adventure" }, { status: 500 });
      }

      if (!updatedGroup) {
        // Someone else already changed the group's state - fetch the
        // authoritative current state instead of blindly reporting success.
        const { data: freshGroup } = await serviceSupabase
          .from('groups')
          .select('current_riddle_id, finished')
          .eq('id', groupId)
          .single();

        return NextResponse.json({
          success: true,
          nextRiddleId: freshGroup?.finished ? null : freshGroup?.current_riddle_id,
          completed: Boolean(freshGroup?.finished),
          message: freshGroup?.finished ? "Adventure completed!" : "Group already progressed",
          riddles_skipped: group.riddles_skipped,
          wasEmergencySkip: isEmergencySkip
        });
      }

      // 🚀 Push an instant update to every device in the group.
      await Promise.allSettled([
        serviceSupabase
          .channel(`riddle-updates-${groupId}`)
          .send({
            type: 'broadcast',
            event: 'riddle_update',
            payload: {
              groupId,
              newRiddleId: null,
              skippedCount: updates.riddles_skipped,
              isCompleted: true,
              completedAt: completionTime
            }
          })
      ]);

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

    // Track this skip in riddle progress
    const riddleOrder = currentRiddle.order_index;
    const updatedProgress = riddleOrder 
      ? addRiddleCompletion(group.riddle_progress, riddleOrder, 'skip')
      : group.riddle_progress;

    // Prepare update data
    const updates: GroupUpdate = {
      current_riddle_id: nextRiddleId,
      riddles_skipped: (group.riddles_skipped || 0) + 1,
      riddle_progress: updatedProgress
    };

    // Don't mark as complete - just moving to next riddle

    // 🔒 CONCURRENCY GUARD: Compare-and-swap on current_riddle_id + OPTIMIZATION:
    // Use service client for the update. 🚨 IMPORTANT: .select().maybeSingle()
    // lets us detect when the CAS condition matched 0 rows (i.e. someone else
    // already moved the group on) - without this check, a failed CAS update
    // would silently report success while writing nothing to the database,
    // leaving every device stuck on the old riddle.
    const { data: updatedGroup, error: updateError } = await serviceSupabase
      .from('groups')
      .update(updates)
      .eq('id', groupId)
      .eq('current_riddle_id', group.current_riddle_id)
      .select('current_riddle_id')
      .maybeSingle();

    if (updateError) {
      console.error("Failed to update group:", updateError);
      return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
    }

    if (!updatedGroup) {
      // Someone else already advanced (or completed) the group in the
      // meantime - fetch the authoritative current state instead of
      // reporting success with a stale/incorrect nextRiddleId.
      const { data: freshGroup } = await serviceSupabase
        .from('groups')
        .select('current_riddle_id, finished')
        .eq('id', groupId)
        .single();

      if (freshGroup?.finished) {
        return NextResponse.json({
          success: true,
          nextRiddleId: null,
          completed: true,
          message: "Adventure completed!",
          riddles_skipped: updates.riddles_skipped,
          wasEmergencySkip: isEmergencySkip
        });
      }

      return NextResponse.json({
        success: true,
        nextRiddleId: freshGroup?.current_riddle_id ?? nextRiddleId,
        completed: false,
        message: "Group already progressed",
        riddles_skipped: updates.riddles_skipped,
        wasEmergencySkip: isEmergencySkip
      });
    }

    // 🚀 Push an instant update to every device in the group instead of
    // waiting on postgres_changes replication or the slower polling fallback.
    const broadcastResult = await serviceSupabase
      .channel(`riddle-updates-${groupId}`)
      .send({
        type: 'broadcast',
        event: 'riddle_update',
        payload: {
          groupId,
          newRiddleId: nextRiddleId,
          skippedCount: updates.riddles_skipped,
          isCompleted: false,
          completedAt: null
        }
      })
      .catch((err) => {
        console.error("Broadcast error:", err);
        return null;
      });

    if (!broadcastResult) {
      console.error("Broadcast failed, continuing anyway");
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