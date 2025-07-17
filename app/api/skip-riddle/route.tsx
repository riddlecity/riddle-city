// app/api/skip-riddle/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    console.log("=== SKIP RIDDLE API START ===");
    
    const cookieStore = await cookies();
    const groupId = cookieStore.get("group_id")?.value;
    const userId = cookieStore.get("user_id")?.value;

    console.log("Cookies:", { groupId, userId });

    if (!groupId || !userId) {
      console.error("Missing required cookies");
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Create both regular and service role clients
    const supabase = await createClient(); // Add await here
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user is leader
    console.log("Checking if user is leader...");
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

    console.log("User is leader, proceeding...");

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

    console.log("Current group state:", group);

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
    console.log("Next riddle ID:", nextRiddleId);

    // Check if this is the final riddle by looking ahead
    const { data: nextRiddle } = await supabase
      .from("riddles")
      .select("next_riddle_id")
      .eq("id", nextRiddleId)
      .single();

    const isLastRiddle = !nextRiddle?.next_riddle_id;
    console.log("Is this the last riddle?", isLastRiddle);

    // Use service role to update the group (bypasses RLS)
    console.log("Updating group with service role...");
    const updateData: any = {
      current_riddle_id: nextRiddleId,
      riddles_skipped: (group.riddles_skipped || 0) + 1
    };

    // If this is the last riddle, mark as completed
    if (isLastRiddle) {
      updateData.finished = true;
      // Don't try to update completed_at since it doesn't exist
    }

    const { data: updateResult, error: updateError } = await serviceSupabase
      .from("groups")
      .update(updateData)
      .eq("id", groupId)
      .select("current_riddle_id, riddles_skipped, finished");

    if (updateError) {
      console.error("Failed to update group:", updateError);
      return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
    }

    console.log("Group updated successfully:", updateResult);

    // Broadcast real-time update to other group members
    try {
      await serviceSupabase
        .channel(`riddle-updates-${groupId}`)
        .send({
          type: 'broadcast',
          event: 'riddle_update',
          payload: {
            groupId,
            newRiddleId: nextRiddleId,
            skippedCount: updateData.riddles_skipped,
            isCompleted: isLastRiddle
          }
        });
      console.log("Broadcast sent successfully");
    } catch (broadcastError) {
      console.error("Broadcast error:", broadcastError);
    }

    console.log("=== SKIP RIDDLE SUCCESS ===");

    // Return appropriate response
    if (isLastRiddle) {
      return NextResponse.json({
        success: true,
        completed: true,
        message: "Adventure completed!",
        groupId: groupId
      });
    } else {
      return NextResponse.json({
        success: true,
        nextRiddleId: nextRiddleId,
        skipsUsed: updateData.riddles_skipped
      });
    }

  } catch (error) {
    console.error("Skip riddle API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}