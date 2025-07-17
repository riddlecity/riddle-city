import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: { location: string; mode: string };
  searchParams: { session_id?: string };
}

export default async function StartPage({ params, searchParams }: PageProps) {
  const { location, mode } = params;
  const sessionId = searchParams.session_id;
  const supabase = createClient();

  // 🔐 1. Get logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userEmail = user?.email || null;

  // 📦 2. If no logged-in user, try to get Stripe email
  if (!userEmail && sessionId) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/stripe-session?session_id=${sessionId}`);
      const data = await res.json();
      if (res.ok && data.customer_details?.email) {
        userEmail = data.customer_details.email;
        console.log("✅ Got email from Stripe:", userEmail);
      } else {
        console.warn("⚠️ Stripe session fetch failed or missing email");
      }
    } catch (err) {
      console.error("❌ Error fetching Stripe session:", err);
    }
  }

  // 🎯 3. Find the track
  const { data: track, error: trackError } = await supabase
    .from("tracks")
    .select("id")
    .eq("location", location)
    .eq("mode", mode)
    .single();

  if (trackError || !track) {
    console.error("❌ Track not found:", trackError || "No data");
    return <div>Track not found</div>;
  }

  // 🧩 4. Get first riddle for that track
  const { data: riddle, error: riddleError } = await supabase
    .from("riddles")
    .select("id")
    .eq("track_id", track.id)
    .order("order_index", { ascending: true })
    .limit(1)
    .single();

  if (riddleError || !riddle) {
    console.error("❌ First riddle not found:", riddleError || "No data");
    return <div>Riddle not found</div>;
  }

  // 🛠️ 5. Create the group
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({
      track_id: track.id,
      current_riddle_id: riddle.id,
      lead_email: userEmail,
    })
    .select()
    .single();

  if (groupError || !group) {
    console.error("❌ Failed to create group:", groupError || "No data");
    return <div>Group creation failed</div>;
  }

  // 👥 6. Add lead to group_members
  if (userEmail) {
    const { error: insertError } = await supabase.from("group_members").insert({
      group_id: group.id,
      email: userEmail,
      is_lead: true,
    });

    if (insertError) {
      console.warn("⚠️ Could not add group member:", insertError);
    }
  }

  // 🚀 7. Redirect to first riddle
  redirect(`/riddlecity/${location}/${mode}/riddle/${riddle.id}`);
}
