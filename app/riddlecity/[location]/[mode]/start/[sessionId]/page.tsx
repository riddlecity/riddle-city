"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StartPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams(); // 🔥

  const supabase = createClient();

  const sessionId = searchParams.get("session_id") as string; // 🔥
  const location = params.location as string;
  const mode = params.mode as string;
  const groupId = params.groupId as string;

  const [loading, setLoading] = useState(true);
  const [sessionEmail, setSessionEmail] = useState("");

  useEffect(() => {
    const processStart = async () => {
      try {
        // 1. Fetch Stripe session (if sessionId exists)
        if (sessionId) {
          const res = await fetch(`/api/stripe-session?session_id=${sessionId}`);
          const data = await res.json();
          if (res.ok && data.customer_details?.email) {
            setSessionEmail(data.customer_details.email);
            console.log("✅ Stripe session retrieved for:", data.customer_details.email);
          } else {
            console.warn("⚠️ Stripe session fetch failed or missing email");
          }
        }

        // 2. Look up track
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

        // 3. Get first riddle
        const { data: riddle, error: riddleError } = await supabase
          .from("riddles")
          .select("id")
          .eq("track_id", trackId);

