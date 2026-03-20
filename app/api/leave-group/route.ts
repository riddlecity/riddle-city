import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { groupId, userId } = await req.json();

    if (!groupId || !userId) {
      return NextResponse.json({ error: "groupId and userId are required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Mark the member as left
    const { error } = await supabase
      .from("group_members")
      .update({ left_at: new Date().toISOString() })
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (error) {
      console.error("❌ LEAVE GROUP: Failed to update member:", error);
      return NextResponse.json({ error: "Failed to leave group" }, { status: 500 });
    }

    // Clear session cookies
    const response = NextResponse.json({ message: "Successfully left group" });
    const clearOptions = {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 0,
      path: "/"
    };

    response.cookies.set("riddlecity-session", "", clearOptions);
    response.cookies.set("group_id", "", clearOptions);
    response.cookies.set("user_id", "", clearOptions);
    response.cookies.set("team_name", "", clearOptions);

    console.log("✅ LEAVE GROUP: User", userId, "left group", groupId);
    return response;

  } catch (error) {
    console.error("💥 LEAVE GROUP: Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
