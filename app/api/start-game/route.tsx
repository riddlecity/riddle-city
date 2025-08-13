// app/api/start-game/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs"; // Stripe needs Node runtime

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    // Pull session to get the metadata we stored in checkout
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const md = session.metadata || {};
    
    const groupId = md.group_id;
    const userId = md.user_id;
    const teamName = md.team_name || "";
    const location = md.location;
    const mode = md.mode;

    if (!groupId || !userId || !location || !mode) {
      return NextResponse.json({ error: "Missing required metadata" }, { status: 400 });
    }

    // ✅ Set cookies in a Route Handler (allowed)
    const c = await cookies(); // <-- await is required in Next 15
    const opts = {
      path: "/",
      httpOnly: true as const,
      sameSite: "lax" as const,
      secure: true as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    // Set your original cookies
    c.set("group_id", groupId, opts);
    c.set("user_id", userId, opts);
    c.set("team_name", teamName, opts);

    // ✨ NEW: Set the session cookie for rejoin functionality
    const cookieData = { groupId, userId, teamName };
    const encodedData = Buffer.from(JSON.stringify(cookieData)).toString("base64");
    
    c.set("riddlecity-session", encodedData, {
      httpOnly: false, // Allow client-side access for homepage detection
      secure: true,
      sameSite: "lax" as const,
      maxAge: 48 * 60 * 60, // 48 hours (matches game expiry)
      path: "/"
    });

    // Redirect to start page
    const redirectUrl = `/${location}/${mode}/start/${sessionId}?session_id=${sessionId}&success=true`;
    return NextResponse.redirect(new URL(redirectUrl, req.url));

  } catch (err) {
    console.error("start-game route error:", err);
    return NextResponse.json({ error: "Failed to start game" }, { status: 500 });
  }
}