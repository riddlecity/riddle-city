// app/api/admin-start/route.tsx
// Sets cookies and redirects to the admin start page (bypass flow - no Stripe needed)
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    const userId = searchParams.get("userId");
    const teamName = searchParams.get("teamName") || "Your Team";
    const location = searchParams.get("location");
    const mode = searchParams.get("mode");
    const firstRiddleId = searchParams.get("firstRiddleId");

    if (!groupId || !userId || !location || !mode || !firstRiddleId) {
      return NextResponse.json({ error: "Missing required params" }, { status: 400 });
    }

    const c = await cookies();
    const isProduction = process.env.NODE_ENV === "production";

    const cookieOpts = {
      path: "/",
      httpOnly: false,
      sameSite: "lax" as const,
      secure: isProduction,
      maxAge: 60 * 60 * 48,
    };

    c.set("group_id", groupId, cookieOpts);
    c.set("user_id", userId, cookieOpts);
    c.set("team_name", teamName, cookieOpts);

    const sessionData = {
      groupId,
      userId,
      teamName,
      sessionId: `bypass_${groupId}`,
      createdAt: new Date().toISOString(),
    };
    const encodedData = Buffer.from(JSON.stringify(sessionData)).toString("base64");

    c.set("riddlecity-session", encodedData, {
      httpOnly: false,
      secure: isProduction,
      sameSite: "lax" as const,
      maxAge: 48 * 60 * 60,
      path: "/",
    });

    const redirectUrl = `/${location}/${mode}/start/admin?groupId=${groupId}&firstRiddleId=${firstRiddleId}&teamName=${encodeURIComponent(teamName)}`;
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  } catch (err) {
    console.error("admin-start route error:", err);
    return NextResponse.json({ error: "Failed to start game" }, { status: 500 });
  }
}
