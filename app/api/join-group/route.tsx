// app/api/join-group/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { GroupMember, SessionData } from "@/types/group";

export async function POST(req: Request) {
  try {
    // Check content type and parse accordingly
    const contentType = req.headers.get('content-type');
    let groupId: string;
    
    if (contentType?.includes('application/json')) {
      const { groupId: gid } = await req.json();
      groupId = gid;
    } else {
      const formData = await req.formData();
      groupId = formData.get("groupId") as string;
    }
    
    if (!groupId) {
      console.error("❌ JOIN GROUP: No group ID provided");
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
    }
    
    console.log("🔗 JOIN GROUP: Attempting to join group:", groupId);
    
    const cookieStore = await cookies();
    const supabase = await createClient();
    
    // Check if user already has a session cookie
    const existingSession = cookieStore.get("riddlecity-session")?.value;
    let userId: string;
    let existingSessionData: SessionData | null = null;
    
    if (existingSession) {
      try {
        // Decode base64 to match client-side btoa/atob encoding
        const decodedSession = Buffer.from(existingSession, 'base64').toString('utf-8');
        existingSessionData = JSON.parse(decodedSession);
        userId = existingSessionData?.userId ?? uuidv4();
        console.log("👤 JOIN GROUP: Using existing session user:", userId, "from session data:", existingSessionData);
      } catch (e) {
        console.warn("⚠️ JOIN GROUP: Invalid session cookie, creating new user. Error:", e);
        userId = uuidv4();
      }
    } else {
      // Create new anonymous user
      userId = uuidv4();
      console.log("👤 JOIN GROUP: Created new anonymous user:", userId);
    }
    
    // 🔧 FIX: Ensure profile exists for this user
    console.log("👤 JOIN GROUP: Ensuring profile exists for user:", userId);
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: userId }, { onConflict: 'id' });
    
    if (profileError) {
      console.error("❌ JOIN GROUP: Failed to create/update profile:", profileError);
      return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 });
    }
    
    console.log("✅ JOIN GROUP: Profile ensured for user:", userId);
    
    // Check if group exists and get team name
    console.log("🔍 JOIN GROUP: Checking if group exists:", groupId);
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("player_limit, current_riddle_id, track_id, team_name, finished, active, paid, game_started, group_members(*)")
      .eq("id", groupId)
      .single();
      
    if (groupError || !group) {
      console.error("❌ JOIN GROUP: Group fetch error:", groupError);
      return NextResponse.json({ error: "Group not found or no longer available" }, { status: 404 });
    }
    
    // Check if group is still valid
    if (group.finished) {
      console.log("❌ JOIN GROUP: Group has finished");
      return NextResponse.json({ error: "This adventure has already finished" }, { status: 403 });
    }
    
    if (!group.active) {
      console.log("❌ JOIN GROUP: Group is not active");
      return NextResponse.json({ error: "This group is no longer active" }, { status: 403 });
    }
    
    if (!group.paid) {
      console.log("❌ JOIN GROUP: Group hasn't been paid for yet");
      return NextResponse.json({ error: "This group hasn't completed payment yet" }, { status: 403 });
    }
    
    console.log("✅ JOIN GROUP: Group found, current members:", group.group_members?.length || 0);
    console.log("📋 JOIN GROUP: Group details - Team:", group.team_name, "Started:", group.game_started);
    
    // Check if user is already a member
    console.log("🔍 JOIN GROUP: Checking if user is already a member. UserId:", userId);
    console.log("📋 JOIN GROUP: Current members:", group.group_members?.map(m => ({ user_id: m.user_id, id: m.id })));
    
    const existingMember = group.group_members?.find(
      (member: GroupMember) => member.user_id === userId
    );
    
    console.log("🔍 JOIN GROUP: Existing member found:", existingMember ? "YES" : "NO", existingMember);
    
    if (existingMember) {
      // User is already a member, let them rejoin
      console.log("🔄 JOIN GROUP: User rejoining group");
      
      // Create consistent session data
      const sessionData = {
        groupId,
        userId,
        teamName: group.team_name || "Your Team"
      };
      const encodedData = Buffer.from(JSON.stringify(sessionData)).toString("base64");
      
      const response = NextResponse.json({
        message: "Welcome back!",
        userId,
        teamName: group.team_name || "Your Team",
        nextRiddle: group.current_riddle_id,
        gameStarted: Boolean(group.game_started), // Use actual database value
        isRejoining: true
      });
      
      // Set the consistent session cookie
      response.cookies.set("riddlecity-session", encodedData, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 48 * 60 * 60, // 48 hours to match game expiry
        path: "/"
      });
      
      console.log("✅ JOIN GROUP: User rejoined successfully");
      return response;
    }
    
    // Check if group is full (only for new members)
    const currentMemberCount = group.group_members?.length || 0;
    if (currentMemberCount >= group.player_limit) {
      console.log("❌ JOIN GROUP: Group is full:", currentMemberCount, ">=", group.player_limit);
      return NextResponse.json({ error: "Group is full" }, { status: 403 });
    }
    
    // Add new member to group
    console.log("➕ JOIN GROUP: Adding new member to group");
    const { error: insertError } = await supabase
      .from("group_members")
      .insert({
        group_id: groupId,
        user_id: userId,
        is_leader: false, // New joiners are not leaders
      });
      
    if (insertError) {
      console.error("❌ JOIN GROUP: Failed to add member:", insertError);
      return NextResponse.json({ error: "Failed to join group" }, { status: 500 });
    }
    
    console.log("✅ JOIN GROUP: Successfully added user to group");
    
    // Create session data
    const sessionData = {
      groupId,
      userId,
      teamName: group.team_name || "Your Team"
    };
    const encodedData = Buffer.from(JSON.stringify(sessionData)).toString("base64");
    
    const response = NextResponse.json({
      message: "Successfully joined group!",
      userId,
      teamName: group.team_name || "Your Team", 
      nextRiddle: group.current_riddle_id,
      gameStarted: Boolean(group.game_started), // Use actual database value
      isRejoining: false
    });
    
    // Set the consistent session cookie (matches your start page format)
    response.cookies.set("riddlecity-session", encodedData, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production", 
      sameSite: "lax",
      maxAge: 48 * 60 * 60, // 48 hours to match game expiry
      path: "/"
    });
    
    console.log("✅ JOIN GROUP: Join process completed successfully");
    return response;
    
  } catch (error) {
    console.error("💥 JOIN GROUP: Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}