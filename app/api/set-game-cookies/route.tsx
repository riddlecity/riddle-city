// app/api/set-game-cookies/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("🍪 SET-COOKIES API: Request received");
    
    const requestBody = await req.json();
    console.log("📥 SET-COOKIES API: Request body:", JSON.stringify(requestBody, null, 2));
    
    const { groupId, userId, teamName } = requestBody;
    
    if (!groupId || !userId) {
      console.error("❌ SET-COOKIES API: Missing required parameters");
      console.error("❌ SET-COOKIES API: groupId:", groupId, "userId:", userId);
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    console.log("🍪 SET-COOKIES API: Setting game cookies with data:", { groupId, userId, teamName });
    
    const response = NextResponse.json({ 
      success: true,
      message: "Cookies set successfully",
      data: { groupId, userId, teamName }
    });
    
    const isProduction = process.env.NODE_ENV === "production";
    const expires = 60 * 60 * 24; // 24 hours
    
    console.log("⚙️ SET-COOKIES API: Cookie settings:", { 
      isProduction, 
      expires, 
      environment: process.env.NODE_ENV 
    });

    // Set essential game cookies
    console.log("🔧 SET-COOKIES API: Setting group_id cookie...");
    response.cookies.set("group_id", groupId, {
      maxAge: expires,
      path: "/",
      sameSite: "lax",
      secure: isProduction,
      httpOnly: false, // Allow client-side access for your game logic
    });

    console.log("🔧 SET-COOKIES API: Setting user_id cookie...");
    response.cookies.set("user_id", userId, {
      maxAge: expires,
      path: "/",
      sameSite: "lax", 
      secure: isProduction,
      httpOnly: false,
    });

    // Set team name if provided
    if (teamName && teamName.trim()) {
      console.log("🔧 SET-COOKIES API: Setting team_name cookie...");
      response.cookies.set("team_name", teamName.trim(), {
        maxAge: expires,
        path: "/",
        sameSite: "lax",
        secure: isProduction,
        httpOnly: false,
      });
    } else {
      console.log("⚠️ SET-COOKIES API: No team name provided or empty, skipping team_name cookie");
    }

    // Log all cookies that will be set
    const cookieHeaders = response.headers.getSetCookie();
    console.log("🍪 SET-COOKIES API: Cookies being set:", cookieHeaders);

    console.log("✅ SET-COOKIES API: Game cookies set successfully via API route");
    return response;

  } catch (error) {
    console.error("❌ SET-COOKIES API: Error setting cookies:", error);
    console.error("❌ SET-COOKIES API: Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: "Failed to set cookies",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}