// app/api/start-game/route.ts (fixed version with better cookie management)
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

    // ✅ Set cookies in a Route Handler (await required in Next.js 15)
    const c = await cookies();
    
    // Determine if we're in production
    const isProduction = process.env.NODE_ENV === 'production';
    
    const cookieOpts = {
      path: "/",
      httpOnly: false, // Allow client-side access
      sameSite: "lax" as const,
      secure: isProduction, // Only secure in production
      maxAge: 60 * 60 * 48, // 48 hours to match game expiry
    };

    // Set individual cookies for backward compatibility with non-httpOnly for client access
    c.set("group_id", groupId, cookieOpts);
    c.set("user_id", userId, cookieOpts);
    c.set("team_name", teamName || "Your Team", cookieOpts); // Ensure team name is never empty

    // ✨ Set the main session cookie for rejoin functionality
    const cookieData = { 
      groupId, 
      userId, 
      teamName, 
      sessionId,
      createdAt: new Date().toISOString()
    };
    const encodedData = Buffer.from(JSON.stringify(cookieData)).toString("base64");
    
    c.set("riddlecity-session", encodedData, {
      httpOnly: false, // Allow client-side access for homepage detection
      secure: isProduction, // Only secure in production
      sameSite: "lax" as const,
      maxAge: 48 * 60 * 60, // 48 hours (matches game expiry)
      path: "/"
    });

    console.log('🍪 START-GAME: Set cookies for groupId:', groupId, 'userId:', userId, 'production:', isProduction);

    // Redirect to start page
    const redirectUrl = `/${location}/${mode}/start/${sessionId}?session_id=${sessionId}&success=true`;
    return NextResponse.redirect(new URL(redirectUrl, req.url));
    
  } catch (err) {
    console.error("start-game route error:", err);
    return NextResponse.json({ error: "Failed to start game" }, { status: 500 });
  }
}