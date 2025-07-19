// app/api/set-game-cookies/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { groupId, userId, teamName } = await req.json();

    if (!groupId || !userId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    console.log("🍪 Setting game cookies:", { groupId, userId, teamName });

    const response = NextResponse.json({ success: true });
    
    const isProduction = process.env.NODE_ENV === "production";
    const expires = 60 * 60 * 24; // 24 hours

    // Set essential game cookies
    response.cookies.set("group_id", groupId, {
      maxAge: expires,
      path: "/",
      sameSite: "lax",
      secure: isProduction,
      httpOnly: false, // Allow client-side access for your game logic
    });

    response.cookies.set("user_id", userId, {
      maxAge: expires,
      path: "/",
      sameSite: "lax", 
      secure: isProduction,
      httpOnly: false,
    });

    // Set team name if provided
    if (teamName && teamName.trim()) {
      response.cookies.set("team_name", teamName.trim(), {
        maxAge: expires,
        path: "/",
        sameSite: "lax",
        secure: isProduction,
        httpOnly: false,
      });
    }

    console.log("✅ Game cookies set successfully via API route");
    return response;

  } catch (error) {
    console.error("❌ Error setting cookies:", error);
    return NextResponse.json({ error: "Failed to set cookies" }, { status: 500 });
  }
}