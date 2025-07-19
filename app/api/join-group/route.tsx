// app/api/join-group/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

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
    
    // Get or create user
    let userId = cookieStore.get("user_id")?.value;
    
    if (!userId) {
      // Create anonymous user if none exists
      userId = uuidv4();
      console.log("👤 JOIN GROUP: Created new anonymous user:", userId);
    } else {
      console.log("👤 JOIN GROUP: Using existing user:", userId);
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
    
    // Check if group exists
    console.log("🔍 JOIN GROUP: Checking if group exists:", groupId);
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("player_limit, current_riddle_id, track_id, group_members(*)")
      .eq("id", groupId)
      .single();
      
    if (groupError || !group) {
      console.error("❌ JOIN GROUP: Group fetch error:", groupError);
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    
    console.log("✅ JOIN GROUP: Group found, current members:", group.group_members?.length || 0);
    
    // Check if user is already a member
    const existingMember = group.group_members?.find(
      (member: any) => member.user_id === userId
    );
    
    if (existingMember) {
      // User is already a member, let them rejoin
      console.log("🔄 JOIN GROUP: User rejoining group");
      
      // Set cookies and return success
      const response = NextResponse.json({
        message: "Welcome back!",
        nextRiddle: group.current_riddle_id,
        isRejoining: true
      });
      
      response.cookies.set("user_id", userId, {
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/"
      });
      response.cookies.set("group_id", groupId, {
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 1 day
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
    
    // Set cookies and return success
    const response = NextResponse.json({
      message: "Successfully joined group!",
      nextRiddle: group.current_riddle_id,
      isRejoining: false
    });
    
    response.cookies.set("user_id", userId, {
      httpOnly: false, // Allow client-side access for game logic
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/"
    });
    response.cookies.set("group_id", groupId, {
      httpOnly: false, // Allow client-side access for game logic
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/"
    });
    
    console.log("✅ JOIN GROUP: Join process completed successfully");
    return response;
    
  } catch (error) {
    console.error("💥 JOIN GROUP: Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}