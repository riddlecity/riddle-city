// app/api/debug-group/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Get group info
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("*, group_members(*)")
      .eq("id", groupId)
      .single();

    // Get riddle info if group exists
    let currentRiddle = null;
    if (group && group.current_riddle_id) {
      const { data: riddle } = await supabase
        .from("riddles")
        .select("*")
        .eq("id", group.current_riddle_id)
        .single();
      currentRiddle = riddle;
    }

    return NextResponse.json({
      debug: {
        groupId,
        userError: userError?.message || null,
        user: user ? { id: user.id, email: user.email } : null,
        groupError: groupError?.message || null,
        group: group ? {
          id: group.id,
          current_riddle_id: group.current_riddle_id,
          max_members: group.max_members,
          member_count: group.group_members?.length || 0,
          game_status: group.game_status
        } : null,
        currentRiddle: currentRiddle ? {
          id: currentRiddle.id,
          title: currentRiddle.title
        } : null,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json(
      { error: "Debug API error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}