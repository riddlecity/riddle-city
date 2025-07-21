// app/api/checkout-session/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: Request) {
  try {
    const { players, location, mode, teamName, emails } = await req.json();
    
    // Basic input validation
    if (!teamName || !teamName.trim()) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }
    
    // Basic sanity check for player count
    if (!Number.isInteger(players) || players < 1 || players > 20) {
      return NextResponse.json({ error: "Invalid player count" }, { status: 400 });
    }
    
    const supabase = await createClient();
    
    const { data: track, error: trackError } = await supabase
      .from("tracks")
      .select("id, location, mode, name, price_per_person, start_riddle_id")
      .eq("location", location)
      .eq("mode", mode)
      .single();
      
    if (trackError || !track) {
      const { data: allTracks } = await supabase.from("tracks").select("id, location, mode, name");
      return NextResponse.json({ error: "Track not found", availableTracks: allTracks }, { status: 400 });
    }
    
    // 🔑 Generate and persist user ID early
    const userId = uuidv4();
    await supabase.from("profiles").upsert({ id: userId });
    
    const groupData = {
      track_id: track.id,
      player_limit: players,
      paid: false,
      finished: false,
      is_versus: false,
      current_riddle_id: track.start_riddle_id,
      created_by: userId,
      team_name: teamName.trim(),
      riddles_skipped: 0
    };
    
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert(groupData)
      .select("id")
      .single();
      
    if (groupError || !group) {
      return NextResponse.json({ error: "Group creation failed" }, { status: 500 });
    }
    
    const { error: memberInsertError } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: userId,
      is_leader: true,
    });
    
    if (memberInsertError) {
      return NextResponse.json({ error: "Failed to assign group leader" }, { status: 500 });
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "gbp",
          product_data: {
            name: `${track.name} - Team: ${teamName.trim()}`,
            description: `Adventure for ${players} player${players > 1 ? 's' : ''}`
          },
          unit_amount: track.price_per_person,
        },
        quantity: players,
      }],
      mode: "payment",
      metadata: {
        group_id: group.id,
        user_id: userId,
        team_name: teamName.trim(),
        track_id: track.id,
        player_count: players.toString()
      },
      // 🔧 FIX: Use session.id in the URL path, not group.id
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/${location}/${mode}/start/{CHECKOUT_SESSION_ID}?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/${location}/${mode}`,
    });
    
    if (!session?.url) {
      throw new Error("Stripe session URL was not returned");
    }
    
    // Return the response with the session URL and group/team info
    return NextResponse.json({
      sessionUrl: session.url,
      groupId: group.id,
      teamName: teamName.trim()
    });
    
  } catch (err) {
    return NextResponse.json(
      { error: "Something went wrong starting the game. Please try again." },
      { status: 500 }
    );
  }
}