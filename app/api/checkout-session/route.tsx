// app/api/checkout-session/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: Request) {
  try {
    const { players, location, mode, teamName, emails, adminKey } = await req.json();
    
    // 🔧 ADMIN BYPASS: Check for admin key first
    const ADMIN_KEY = process.env.ADMIN_TEST_KEY; // Set this in your environment variables
    const isAdminTest = adminKey && ADMIN_KEY && adminKey === ADMIN_KEY;

    if (isAdminTest) {
      console.log('🔧 ADMIN: Creating test group without payment...');
      
      // Basic validation for admin test
      if (!teamName || !teamName.trim()) {
        return NextResponse.json({ error: "Team name is required" }, { status: 400 });
      }
      
      if (!Number.isInteger(players) || players < 1 || players > 20) {
        return NextResponse.json({ error: "Invalid player count" }, { status: 400 });
      }

      const supabase = await createClient();
      
      // Get track info
      const { data: track, error: trackError } = await supabase
        .from("tracks")
        .select("id, location, mode, name, start_riddle_id")
        .eq("location", location)
        .eq("mode", mode)
        .single();
        
      if (trackError || !track) {
        return NextResponse.json({ error: "Track not found" }, { status: 400 });
      }
      
      // Create test user and group
      const testUserId = uuidv4();
      const testGroupId = uuidv4();
      
      // Create profile
      await supabase.from("profiles").upsert({ id: testUserId });
      
      // Create test group (marked as paid)
      const { error: groupError } = await supabase
        .from("groups")
        .insert({
          id: testGroupId,
          track_id: track.id,
          player_limit: players,
          paid: true, // ✅ Mark as paid for testing
          finished: false,
          is_versus: false,
          current_riddle_id: track.start_riddle_id,
          created_by: testUserId,
          team_name: teamName.trim(),
          riddles_skipped: 0,
          game_started: false,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24-hour expiry
        });

      if (groupError) {
        console.error('❌ ADMIN: Failed to create test group:', groupError);
        return NextResponse.json({ error: 'Failed to create test group' }, { status: 500 });
      }

      // Add admin as group leader
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: testGroupId,
          user_id: testUserId,
          is_leader: true
        });

      if (memberError) {
        console.error('❌ ADMIN: Failed to add admin as leader:', memberError);
        return NextResponse.json({ error: 'Failed to assign group leader' }, { status: 500 });
      }

      console.log('✅ ADMIN: Test group created successfully:', {
        groupId: testGroupId,
        userId: testUserId,
        teamName: teamName.trim(),
        trackId: track.id
      });

      // Return admin test response with direct game URL
      const gameData = {
        groupId: testGroupId,
        userId: testUserId,
        teamName: teamName.trim()
      };

      return NextResponse.json({
        adminTest: true,
        groupId: testGroupId,
        userId: testUserId,
        teamName: teamName.trim(),
        directUrl: `/riddle/${track.start_riddle_id}?game_data=${btoa(JSON.stringify(gameData))}`
      });
    }

    // 🎮 NORMAL FLOW: Continue with regular Stripe checkout
    console.log('💳 Creating regular Stripe checkout session...');
    
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
      console.error("Group creation error:", groupError);
      return NextResponse.json({ error: "Group creation failed" }, { status: 500 });
    }
    
    const { error: memberInsertError } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: userId,
      is_leader: true,
    });
    
    if (memberInsertError) {
      console.error("Member insert error:", memberInsertError);
      return NextResponse.json({ error: "Failed to assign group leader" }, { status: 500 });
    }
    
    // Process and validate emails with duplicate prevention
    const validEmails: string[] = [];
    const emailSet = new Set<string>(); // Track unique emails
    
    if (emails && Array.isArray(emails)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of emails) {
        if (email && typeof email === 'string' && email.trim() && emailRegex.test(email.trim())) {
          const normalizedEmail = email.trim().toLowerCase(); // Normalize to lowercase
          if (!emailSet.has(normalizedEmail)) {
            emailSet.add(normalizedEmail);
            validEmails.push(email.trim()); // Keep original casing for display
          }
        }
      }
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
        player_count: players.toString(),
        // NEW: Store emails as JSON string in metadata
        emails: JSON.stringify(validEmails),
        location: location,
        mode: mode
      },
      // Set 24-hour expiration (maximum allowed by Stripe)
      expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/${location}/${mode}/start/{CHECKOUT_SESSION_ID}?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/${location}/${mode}`,
    });
    
    if (!session?.url) {
      throw new Error("Stripe session URL was not returned");
    }
    
    console.log("✅ Checkout session created successfully:", {
      groupId: group.id,
      userId,
      teamName: teamName.trim(),
      sessionId: session.id,
      emailCount: validEmails.length,
      successUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/${location}/${mode}/start/${session.id}?session_id=${session.id}&success=true`
    });
    
    // Return the response with the session URL and group/team info
    return NextResponse.json({
      sessionUrl: session.url,
      groupId: group.id,
      teamName: teamName.trim()
    });
    
  } catch (err) {
    console.error("Checkout session creation failed:", err);
    return NextResponse.json(
      { error: "Something went wrong starting the game. Please try again." },
      { status: 500 }
    );
  }
}