// app/api/start-game/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    // Pull the Stripe session (we only need metadata + email)
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

    // ✅ Set cookies here (Route Handler is allowed to mutate cookies)
    const opts = {
      path: "/",
      httpOnly: true as const,
      sameSite: "lax" as const,
      secure: true as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };
    const c = cookies();
    c.set("group_id", groupId, opts);
    c.set("user_id", userId, opts);
    c.set("team_name", teamName, opts);

    // Redirect to your existing Start page (which still expects session_id & success)
    const redirectUrl = `/${location}/${mode}/start/${sessionId}?session_id=${sessionId}&success=true`;
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  } catch (err) {
    console.error("start-game route error:", err);
    return NextResponse.json({ error: "Failed to start game" }, { status: 500 });
  }
}
