import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Create service client once and reuse
const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
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
    } catch (e) {
      console.warn("Failed to parse riddlecity-session cookie:", e);
    }
  }

  // Fallback to old format
  if (!groupId || !userId) {
    groupId = cookieStore.get("group_id")?.value;
    userId = cookieStore.get("user_id")?.value;
  }

  if (!groupId || !userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const supabase = await createClient();

    // 🔒 SECURITY: Only the group leader can go back to a previous riddle
    const { data: member, error: memberError } = await supabase
      .from("group_members")
      .select("is_leader")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "User not found in group" }, { status: 404 });
    }

    if (!member.is_leader) {
      return NextResponse.json({ error: "Only the group leader can go back to a previous riddle" }, { status: 403 });
    }

    // Get current group state
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("current_riddle_id, riddles_skipped, track_id, riddle_progress")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Get current riddle's order and track
    const { data: currentRiddle, error: currentRiddleError } = await supabase
      .from("riddles")
      .select("order_index, track_id")
      .eq("id", group.current_riddle_id)
      .single();

    if (currentRiddleError || !currentRiddle) {
      return NextResponse.json({ error: "Current riddle not found" }, { status: 404 });
    }

    const previousOrder = currentRiddle.order_index - 1;

    if (previousOrder < 1) {
      return NextResponse.json({ error: "There is no previous riddle" }, { status: 400 });
    }

    // 🔒 Only allow going back if the previous riddle was actually skipped -
    // this prevents leaders from rewinding a normally-solved riddle.
    const previousProgress = group.riddle_progress?.[previousOrder.toString()];
    if (!previousProgress || previousProgress.type !== 'skip') {
      return NextResponse.json({ error: "The previous riddle was not skipped" }, { status: 400 });
    }

    // Find the previous riddle's id
    const { data: previousRiddle, error: previousRiddleError } = await supabase
      .from("riddles")
      .select("id")
      .eq("track_id", currentRiddle.track_id)
      .eq("order_index", previousOrder)
      .single();

    if (previousRiddleError || !previousRiddle) {
      return NextResponse.json({ error: "Previous riddle not found" }, { status: 404 });
    }

    // Remove the skip record for the previous riddle since the group is now
    // going back to attempt it properly.
    const updatedProgress = { ...(group.riddle_progress || {}) };
    delete updatedProgress[previousOrder.toString()];

    // 🔒 CONCURRENCY GUARD: Compare-and-swap on current_riddle_id so this only
    // applies if nobody else has already moved the group on in the meantime.
    const [updateResult, broadcastResult] = await Promise.allSettled([
      serviceSupabase
        .from('groups')
        .update({
          current_riddle_id: previousRiddle.id,
          riddles_skipped: Math.max((group.riddles_skipped || 0) - 1, 0),
          riddle_progress: updatedProgress
        })
        .eq('id', groupId)
        .eq('current_riddle_id', group.current_riddle_id),

      serviceSupabase
        .channel(`riddle-updates-${groupId}`)
        .send({
          type: 'broadcast',
          event: 'riddle_update',
          payload: {
            groupId,
            newRiddleId: previousRiddle.id,
            isCompleted: false,
            completedAt: null
          }
        })
    ]);

    if (updateResult.status === 'rejected') {
      console.error("Failed to go back a riddle:", updateResult.reason);
      return NextResponse.json({ error: "Failed to go back a riddle" }, { status: 500 });
    }

    if (broadcastResult.status === 'rejected') {
      console.error("Broadcast error:", broadcastResult.reason);
      // Continue even if broadcast fails
    }

    return NextResponse.json({
      success: true,
      previousRiddleId: previousRiddle.id
    });
  } catch (error) {
    console.error("Go back riddle API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
