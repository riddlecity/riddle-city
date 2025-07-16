"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StartPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  const sessionId = params.sessionId as string;
  const location = params.location as string;
  const mode = params.mode as string;

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getFirstRiddle = async () => {
      // Log the input to help with debugging
      console.log("🔍 Fetching track with:", { location, mode });

      // 1. Look up track based on location + mode
      const { data: track, error: trackError } = await supabase
        .from("tracks")
        .select("id")
        .eq("location", location)
        .eq("mode", mode)
        .single();

      if (trackError || !track) {
        console.error("❌ Track not found:", trackError || "No data returned");
        return;
      }

      const trackId = track.id;

      // 2. Get first riddle from that track
      const { data: riddle, error: riddleError } = await supabase
        .from("riddles")
        .select("id")
        .eq("track_id", trackId)
        .order("order_index", { ascending: true })
        .limit(1)
        .single();

      if (riddleError || !riddle) {
        console.error("❌ First riddle not found:", riddleError || "No data returned");
        return;
      }

      // 3. Redirect to the first riddle
      router.push(`/riddle/${riddle.id}`);
    };

    getFirstRiddle();
  }, [router, location, mode, supabase]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white text-center p-10">
      <h1 className="text-3xl font-bold mb-6">Loading your first riddle...</h1>
      <p className="text-md">Location: {location}</p>
      <p className="text-md">Mode: {mode}</p>
      <p className="text-sm italic mt-4">Session ID: {sessionId}</p>
    </main>
  );
}
