// app/api/stripe-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20', // Use a stable API version
});

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  
  if (!sessionId) {
    console.error("❌ Missing session_id parameter");
    return NextResponse.json({ error: "Missing session_id parameter" }, { status: 400 });
  }

  try {
    console.log("🔍 Retrieving Stripe session:", sessionId);
    
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'line_items'] // Expand useful data
    });

    console.log("✅ Stripe session retrieved successfully:", {
      id: session.id,
      payment_status: session.payment_status,
      metadata: session.metadata
    });

    return NextResponse.json({
      id: session.id,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email,
      metadata: session.metadata,
      amount_total: session.amount_total,
      currency: session.currency
    });
    
  } catch (error) {
    console.error("❌ Error fetching Stripe session:", error);
    return NextResponse.json(
      { error: "Failed to retrieve Stripe session" }, 
      { status: 500 }
    );
  }
}