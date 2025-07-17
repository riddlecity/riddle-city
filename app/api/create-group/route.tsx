import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const { track_id, player_limit, team_name } = await req.json();
    const cookieStore = await cookies();
    const supabase = createClient();
    
    let userId = cookieStore.get("user_id")?.value || uuidv4();
    
    // Ensure user exists
    await supabase.from("profiles").upsert({ id: userId });
    
    // Get starting riddle from track
    const { data: trackData, error: trackError } = await supabase
      .from("tracks")
      .select("start_riddle_id")
      .eq("id", track_id)
      .single();
      
    if (trackError || !trackData?.start_riddle_id) {
      console.error("Track fetch error:", trackError);
      return NextResponse.json({ error: "Track not found or missing start_riddle_id" }, { status: 400 });
    }
    
    const startRiddleId = trackData.start_riddle_id;
    
    // Prepare group data
    const groupData: any = {
      track_id,
      player_limit,
      created_by: userId,
      current_riddle_id: startRiddleId,
      riddles_skipped: 0, // Initialize skip counter
      paid: false, // Initialize as unpaid
      finished: false, // Initialize as not finished
    };
    
    // Add team name if provided
    if (team_name && team_name.trim()) {
      groupData.team_name = team_name.trim();
    }
    
    // Create group
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert(groupData)
      .select("id")
      .single();
      
    if (groupError || !group) {
      console.error("Group creation error:", groupError);
      return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
    }
    
    const groupId = group.id;
    
    // Add user as leader
    const { error: memberInsertError } = await supabase
      .from("group_members")
      .insert({
        group_id: groupId,
        user_id: userId,
        is_leader: true,
      });
      
    if (memberInsertError) {
      console.error("Group member insert error:", memberInsertError);
      return NextResponse.json({ error: "Failed to add group leader" }, { status: 500 });
    }
    
    const response = NextResponse.json({ 
      groupId, 
      userId, 
      success: true,
      teamName: team_name?.trim() || null
    });
    
    const expires = new Date(Date.now() + 86400000); // 1 day
    
    response.cookies.set("group_id", groupId, {
      path: "/",
      expires,
      httpOnly: false,
      secure: false,
      sameSite: "lax",
    });
    
    response.cookies.set("user_id", userId, {
      path: "/",
      expires,
      httpOnly: false,
      secure: false,
      sameSite: "lax",
    });
    
    // Optional: Set team name cookie if provided
    if (team_name && team_name.trim()) {
      response.cookies.set("team_name", team_name.trim(), {
        path: "/",
        expires,
        httpOnly: false,
        secure: false,
        sameSite: "lax",
      });
    }
    
    console.log("✅ Group created successfully:", {
      groupId,
      userId,
      teamName: team_name?.trim() || 'No team name',
      trackId: track_id
    });
    
    return response;
    
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}