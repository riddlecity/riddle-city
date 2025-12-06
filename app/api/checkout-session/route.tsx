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
    const ADMIN_KEY = process.env.ADMIN_TEST_KEY; // Set this in your env
    const isAdminTest = adminKey && ADMIN_KEY && adminKey === ADMIN_KEY;

    if (isAdminTest) {
      console.log("🔧 ADMIN: Creating test group without payment...");

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

      // Create test user & group
      const testUserId = uuidv4();
      const testGroupId = uuidv4();

      await supabase.from("profiles").upsert({ id: testUserId });

      const { error: groupError } = await supabase
        .from("groups")
        .insert({
          id: testGroupId,
          track_id: track.id,
          player_limit: players,
          paid: true, // ✅ mark paid
          finished: false,
          is_versus: false,
          current_riddle_id: track.start_riddle_id,
          created_by: testUserId,
          team_name: teamName.trim(),
          riddles_skipped: 0,
          game_started: false,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
        });

      if (groupError) {
        console.error("❌ ADMIN: Failed to create test group:", groupError);
        return NextResponse.json({ error: "Failed to create test group" }, { status: 500 });
      }

      const { error: memberError } = await supabase
        .from("group_members")
        .insert({ group_id: testGroupId, user_id: testUserId, is_leader: true });

      if (memberError) {
        console.error("❌ ADMIN: Failed to add admin as leader:", memberError);
        return NextResponse.json({ error: "Failed to assign group leader" }, { status: 500 });
      }

      console.log("✅ ADMIN: Test group created:", {
        groupId: testGroupId,
        userId: testUserId,
        trackId: track.id,
      });

      const gameData = { groupId: testGroupId, userId: testUserId, teamName: teamName.trim() };

      return NextResponse.json({
        adminTest: true,
        groupId: testGroupId,
        userId: testUserId,
        teamName: teamName.trim(),
        directUrl: `/riddle/${track.start_riddle_id}?game_data=${btoa(JSON.stringify(gameData))}`,
      });
    }

    // 🎮 NORMAL FLOW
    console.log("💳 Creating regular Stripe checkout session...");

    if (!teamName || !teamName.trim()) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }
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

    // Generate + persist user
    const userId = uuidv4();
    await supabase.from("profiles").upsert({ id: userId });

    // 🧪 TESTING MODE: Check if team name contains "(testing)" AND email is authorized
    const testingModeRequested = /\(testing\)/i.test(teamName);
    const authorizedTestEmails = (process.env.TESTING_MODE_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
    const userEmail = (emails && emails.length > 0 ? emails[0] : '').toLowerCase();
    const isAuthorizedForTesting = authorizedTestEmails.includes(userEmail);
    const isTestingMode = testingModeRequested && isAuthorizedForTesting;
    
    // If someone tries testing mode without authorization, reject it
    if (testingModeRequested && !isAuthorizedForTesting) {
      console.warn('⚠️ Unauthorized testing mode attempt from:', userEmail || 'no email');
      return NextResponse.json(
        { error: 'Invalid team name format' },
        { status: 400 }
      );
    }
    
    const displayTeamName = isTestingMode 
      ? teamName.replace(/\(testing\)/gi, '').trim() 
      : teamName.trim();
    
    console.log(isTestingMode ? "🧪 TESTING MODE: Free checkout enabled for " + userEmail : "💳 Regular checkout");

    const groupData = {
      track_id: track.id,
      player_limit: players,
      paid: false,
      finished: false,
      is_versus: false,
      current_riddle_id: track.start_riddle_id,
      created_by: userId,
      team_name: displayTeamName, // Store without "(testing)"
      riddles_skipped: 0,
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

    const { error: memberInsertError } = await supabase
      .from("group_members")
      .insert({ group_id: group.id, user_id: userId, is_leader: true });

    if (memberInsertError) {
      console.error("Member insert error:", memberInsertError);
      return NextResponse.json({ error: "Failed to assign group leader" }, { status: 500 });
    }

    // Validate & de-dupe emails
    const validEmails: string[] = [];
    const emailSet = new Set<string>();
    if (emails && Array.isArray(emails)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of emails) {
        if (email && typeof email === "string" && email.trim() && emailRegex.test(email.trim())) {
          const normalized = email.trim().toLowerCase();
          if (!emailSet.has(normalized)) {
            emailSet.add(normalized);
            validEmails.push(email.trim());
          }
        }
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `${track.name} - Team: ${displayTeamName}`,
              description: `Adventure for ${players} player${players > 1 ? "s" : ""}${isTestingMode ? " (TEST)" : ""}`,
            },
            unit_amount: isTestingMode ? 0 : track.price_per_person, // £0.00 for testing
          },
          quantity: players,
        },
      ],
      mode: "payment",
      metadata: {
        group_id: group.id,
        user_id: userId,
        team_name: displayTeamName,
        track_id: track.id,
        player_count: players.toString(),
        emails: JSON.stringify(validEmails),
        location,
        mode,
        is_test: isTestingMode.toString(), // Track if it was a test
      },
      // 24-hour expiration (max allowed by Stripe)
      expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      // ✅ Redirect to API that sets cookies then bounces to the Start page
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/start-game?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/${location}/${mode}`,
    });

    if (!session?.url) {
      throw new Error("Stripe session URL was not returned");
    }

    console.log("✅ Checkout session created successfully:", {
      groupId: group.id,
      userId,
      teamName: displayTeamName,
      isTestingMode,
      sessionId: session.id,
      emailCount: validEmails.length,
      successUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/start-game?session_id=${session.id}`,
    });

    return NextResponse.json({
      sessionUrl: session.url,
      groupId: group.id,
      teamName: displayTeamName,
    });
  } catch (err) {
    console.error("Checkout session creation failed:", err);
    return NextResponse.json(
      { error: "Something went wrong starting the game. Please try again." },
      { status: 500 }
    );
  }
}
