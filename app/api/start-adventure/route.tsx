// app/api/start-adventure/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { groupId } = await req.json();
    
    if (!groupId) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
    }
    
    console.log("🚀 START ADVENTURE: Attempting to start game for group:", groupId);
    
    const cookieStore = await cookies();
    const supabase = await createClient();
    
    // Get user session
    let sessionData;
    try {
      const sessionCookie = cookieStore.get("riddlecity-session")?.value;
      if (!sessionCookie) {
        return NextResponse.json({ error: "No active session" }, { status: 401 });
      }
      sessionData = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf8'));
    } catch (e) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    
    const { userId } = sessionData;
    
    // Verify user is the leader
    const { data: membership, error: memberError } = await supabase
      .from("group_members")
      .select("is_leader")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();
    
    if (memberError || !membership?.is_leader) {
      console.log("❌ START ADVENTURE: User is not the leader");
      return NextResponse.json({ error: "Only the team leader can start the game" }, { status: 403 });
    }
    
    // Get group and verify it's ready to start
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("id, track_id, current_riddle_id, game_started, finished, active, paid")
      .eq("id", groupId)
      .single();
    
    if (groupError || !group) {
      console.error("❌ START ADVENTURE: Group not found:", groupError);
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    
    if (!group.active || !group.paid) {
      return NextResponse.json({ error: "Group is not ready to start" }, { status: 403 });
    }
    
    if (group.finished) {
      return NextResponse.json({ error: "Group has already finished" }, { status: 403 });
    }
    
    if (group.game_started) {
      // Already started, return current riddle
      console.log("⚠️ START ADVENTURE: Game already started, returning current riddle:", group.current_riddle_id);
      return NextResponse.json({ 
        message: "Game already started",
        currentRiddleId: group.current_riddle_id,
        gameStarted: true
      });
    }
    
    // Get the starting riddle for this track
    const { data: track, error: trackError } = await supabase
      .from("tracks")
      .select("start_riddle_id")
      .eq("id", group.track_id)
      .single();
    
    if (trackError || !track?.start_riddle_id) {
      console.error("❌ START ADVENTURE: No starting riddle found:", trackError);
      return NextResponse.json({ error: "No starting riddle found for this adventure" }, { status: 500 });
    }
    
    console.log("🎯 START ADVENTURE: Starting game with riddle:", track.start_riddle_id);
    
    // Start the game - Clean update without modifying created_at
    const { error: updateError } = await supabase
      .from("groups")
      .update({
        game_started: true,
        current_riddle_id: track.start_riddle_id
      })
      .eq("id", groupId);
    
    if (updateError) {
      console.error("❌ START ADVENTURE: Failed to update group:", updateError);
      return NextResponse.json({ error: "Failed to start game" }, { status: 500 });
    }
    
    console.log("✅ START ADVENTURE: Successfully started game!", {
      groupId,
      currentRiddleId: track.start_riddle_id
    });
    
    // Verify the update worked by fetching the group again
    const { data: updatedGroup } = await supabase
      .from("groups")
      .select("game_started, current_riddle_id")
      .eq("id", groupId)
      .single();
    
    console.log("🔍 START ADVENTURE: Post-update verification:", updatedGroup);
    
    return NextResponse.json({
      message: "Game started successfully!",
      currentRiddleId: track.start_riddle_id,
      gameStarted: true
    });
    
  } catch (error) {
    console.error("💥 START ADVENTURE: Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}