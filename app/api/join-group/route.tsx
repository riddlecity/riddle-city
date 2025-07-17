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
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
    }
    
    const cookieStore = await cookies();
    const supabase = await createClient(); // Add await here
    
    // Get or create user
    let userId = cookieStore.get("user_id")?.value;
    
    if (!userId) {
      // Create anonymous user if none exists
      userId = uuidv4();
      console.log("Created new anonymous user:", userId);
    }
    
    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("player_limit, current_riddle_id, track_id, group_members(*)")
      .eq("id", groupId)
      .single();
      
    if (groupError || !group) {
      console.error("Group fetch error:", groupError);
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    
    // Check if user is already a member
    const existingMember = group.group_members?.find(
      (member: any) => member.user_id === userId
    );
    
    if (existingMember) {
      // User is already a member, let them rejoin
      console.log("User rejoining group");
      
      // Set cookies and return success
      const response = NextResponse.json({
        message: "Welcome back!",
        nextRiddle: group.current_riddle_id,
        isRejoining: true
      });
      
      response.cookies.set("user_id", userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });
      response.cookies.set("group_id", groupId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 1 day
      });
      return response;
    }
    
    // Check if group is full (only for new members)
    const currentMemberCount = group.group_members?.length || 0;
    if (currentMemberCount >= group.player_limit) {
      return NextResponse.json({ error: "Group is full" }, { status: 403 });
    }
    
    // Add new member to group
    const { error: insertError } = await supabase
      .from("group_members")
      .insert({
        group_id: groupId,
        user_id: userId,
        is_leader: false, // New joiners are not leaders
      });
      
    if (insertError) {
      console.error("Failed to add member:", insertError);
      return NextResponse.json({ error: "Failed to join group" }, { status: 500 });
    }
    
    console.log("Successfully added user to group");
    
    // Set cookies and return success
    const response = NextResponse.json({
      message: "Successfully joined group!",
      nextRiddle: group.current_riddle_id,
      isRejoining: false
    });
    
    response.cookies.set("user_id", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    response.cookies.set("group_id", groupId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
    });
    
    return response;
  } catch (error) {
    console.error("Join group error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}