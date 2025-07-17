import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: Request) {
  try {
    const { players, location, mode, teamName, emails } = await req.json();
    
    // Validate team name
    if (!teamName || !teamName.trim()) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }

    // Create Supabase client inside the function to avoid build-time issues
    const supabase = await createClient();
    
    // Lookup track
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

    // 🔑 Generate user_id early
    const userId = uuidv4();

    // Ensure profile exists
    await supabase.from("profiles").upsert({ id: userId });

    // Create group with team name
    const groupData = {
      track_id: track.id,
      player_limit: players,
      paid: false,
      finished: false,
      is_versus: false,
      current_riddle_id: track.start_riddle_id,
      created_by: userId,
      team_name: teamName.trim(), // Add team name to group
      riddles_skipped: 0 // Initialize skip counter
    };

    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert(groupData)
      .select("id")
      .single();

    if (groupError || !group) {
      console.error("Group creation error:", groupError);
      return NextResponse.json({ error: "Group creation failed" }, { status: 500 });
    }

    // Insert group_members row for this user as leader
    const { error: memberInsertError } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: userId,
      is_leader: true,
    });

    if (memberInsertError) {
      console.error("Member insert error:", memberInsertError);
      return NextResponse.json({ error: "Failed to assign group leader" }, { status: 500 });
    }

    // Create Stripe session with team name in metadata
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
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/riddlecity/${location}/${mode}/start/${group.id}?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/riddlecity/${location}/${mode}`,
    });

    if (!session?.url) {
      throw new Error("Stripe session URL was not returned");
    }

    // ✅ Set both group_id and user_id cookies
    const response = NextResponse.json({ 
      sessionUrl: session.url,
      groupId: group.id,
      teamName: teamName.trim()
    });
    
    const expires = 60 * 60 * 24; // 24 hours
    
    response.cookies.set("group_id", group.id, {
      maxAge: expires, 
      path: "/", 
      sameSite: "lax",
    });
    
    response.cookies.set("user_id", userId, {
      maxAge: expires, 
      path: "/", 
      sameSite: "lax",
    });

    // Optional: Set team name in cookie for easy access
    response.cookies.set("team_name", teamName.trim(), {
      maxAge: expires, 
      path: "/", 
      sameSite: "lax",
    });

    console.log("✅ Checkout session created successfully:", {
      groupId: group.id,
      userId,
      teamName: teamName.trim(),
      sessionId: session.id
    });

    return response;

  } catch (err) {
    console.error("Checkout session creation failed:", err);
    return NextResponse.json(
      { error: "Something went wrong starting the game. Please try again." },
      { status: 500 }
    );
  }
}