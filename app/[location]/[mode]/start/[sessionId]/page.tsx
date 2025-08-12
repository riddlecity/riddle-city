// app/[location]/[mode]/start/[sessionId]/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import ShareLink from "@/components/ShareLink";

// Tiny client button for copying the postcode
function CopyPostcodeButton({ postcode }: { postcode: string }) {
  "use client";
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(postcode);
    } catch {}
  };
  return (
    <button
      onClick={handleCopy}
      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20
                 border border-white/20 hover:border-white/40
                 text-white/90 transition-colors text-sm"
    >
      Copy Postcode
    </button>
  );
}

interface Props {
  params: Promise<{ location: string; mode: string; sessionId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function buildLinks(opts: {
  lat?: number | null;
  lng?: number | null;
  postcode?: string | null;
  w3w?: string | null;
}) {
  const { lat, lng, postcode, w3w } = opts;

  const query =
    typeof lat === "number" && typeof lng === "number"
      ? `${lat},${lng}`
      : (postcode || "")?.toString();

  const googleMapsUrl = query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        query
      )}`
    : null;

  const w3wUrl =
    w3w && w3w.trim()
      ? `https://what3words.com/${w3w.replace(/^\/+/, "")}`
      : null;

  return { googleMapsUrl, w3wUrl };
}

export default async function StartPage({ params, searchParams }: Props) {
  console.log("🚀 START PAGE: Beginning payment verification process...");

  const awaitedParams = await params;
  const awaitedSearchParams = await searchParams;

  const supabase = await createClient();
  const stripeSessionId = awaitedSearchParams.session_id as string;
  const successFlag = awaitedSearchParams.success;

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://riddle-city.vercel.app";

  // 1) Validate success flags
  if (!stripeSessionId || successFlag !== "true") {
    console.error("❌ START PAGE: Invalid payment confirmation", {
      stripeSessionId,
      successFlag,
    });
    redirect("/locations");
  }

  // 2) Fetch Stripe session via your API
  let stripeSession: any;
  try {
    const stripeUrl = `${baseUrl}/api/stripe-session?session_id=${stripeSessionId}`;
    const stripeResponse = await fetch(stripeUrl, { cache: "no-store" });
    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text();
      console.error("❌ START PAGE: Stripe error:", errorText);
      redirect("/locations");
    }
    stripeSession = await stripeResponse.json();
  } catch (error) {
    console.error("💥 START PAGE: Error fetching Stripe session:", error);
    redirect("/locations");
  }

  // 3) Check paid
  if (stripeSession.payment_status !== "paid") {
    console.error(
      "❌ START PAGE: Payment not completed:",
      stripeSession.payment_status
    );
    redirect("/locations");
  }

  // 4) Extract metadata
  const groupId = stripeSession.metadata?.group_id as string | undefined;
  const userId = stripeSession.metadata?.user_id as string | undefined;
  const teamName = (stripeSession.metadata?.team_name as string) || "";
  const playerCount = stripeSession.metadata?.player_count as string | undefined;
  const mLocation = stripeSession.metadata?.location;
  const mMode = stripeSession.metadata?.mode;

  // Emails
  const teamLeaderEmail = stripeSession.customer_details?.email || "";
  const memberEmails = stripeSession.metadata?.emails
    ? JSON.parse(stripeSession.metadata.emails).filter(
        (email: string) => email && email.trim()
      )
    : [];

  if (!groupId || !userId) {
    console.error("❌ START PAGE: Missing essential metadata", {
      groupId,
      userId,
    });
    redirect("/locations");
  }

  // 5) Verify group belongs to this user
  let group: {
    id: string;
    current_riddle_id: string | null;
    track_id: string;
    created_by: string;
    finished: boolean;
  };
  {
    const { data, error } = await supabase
      .from("groups")
      .select("id, current_riddle_id, track_id, created_by, finished")
      .eq("id", groupId)
      .single();

    if (error || !data) {
      console.error("❌ START PAGE: Group not found / DB error", error);
      redirect("/locations");
    }
    if (data.created_by !== userId) {
      console.error("❌ START PAGE: User is not the creator of this group");
      redirect("/locations");
    }
    group = data;
  }

  // 6) Verify leader
  {
    const { data, error } = await supabase
      .from("group_members")
      .select("is_leader")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (error || !data?.is_leader) {
      console.error("❌ START PAGE: User is not marked as leader", error, data);
      redirect("/locations");
    }
  }

  // 7) Reset group to a fresh start (start riddle, clear finished)
  {
    const { data: trackStart } = await supabase
      .from("tracks")
      .select("start_riddle_id")
      .eq("id", group.track_id)
      .single();

    const startRiddleId = trackStart?.start_riddle_id || "barnsley_r1";
    const { error: updateError } = await supabase
      .from("groups")
      .update({
        paid: true,
        current_riddle_id: startRiddleId,
        riddles_skipped: 0,
        finished: false,
        completed_at: null,
      })
      .eq("id", groupId);

    if (updateError) {
      console.error("❌ START PAGE: Failed to reset group", updateError);
      redirect("/locations");
    } else {
      group.current_riddle_id = startRiddleId;
    }
  }

  // 8) Fire emails (non‑blocking for gameplay)
  if (teamLeaderEmail || memberEmails.length > 0) {
    try {
      const effectiveLeaderEmail =
        teamLeaderEmail || (memberEmails.length > 0 ? memberEmails[0] : "");
      const remainingEmails = teamLeaderEmail ? memberEmails : memberEmails.slice(1);

      await fetch(`${baseUrl}/api/send-invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          teamLeaderEmail: effectiveLeaderEmail,
          teamLeaderName: "Team Leader",
          teamName: teamName || "Adventure Team",
          location: mLocation || awaitedParams.location,
          mode: mMode || awaitedParams.mode,
          players: parseInt(playerCount || "2"),
          firstRiddleId: group.current_riddle_id,
          memberEmails: remainingEmails,
        }),
        cache: "no-store",
      });
    } catch (emailError) {
      console.warn("⚠️ START PAGE: Email error (continuing)", emailError);
    }
  }

  // 9) Prepare cookie payload for Start button
  const cookieData = { groupId, userId, teamName: teamName || "" };
  const encodedData = Buffer.from(JSON.stringify(cookieData)).toString("base64");
  const riddleHref = `/riddle/${group.current_riddle_id}?game_data=${encodedData}`;

  // 10) Load minimal start meta from tracks (incl. your hosted image)
  const { data: trackMeta } = await supabase
    .from("tracks")
    .select(
      "id, name, start_label, start_postcode, start_w3w, start_lat, start_lng, start_image_url"
    )
    .eq("id", group.track_id)
    .single();

  const start_label = trackMeta?.start_label || "Starting Point";
  const start_postcode = (trackMeta?.start_postcode as string | null) ?? null;
  const start_w3w = (trackMeta?.start_w3w as string | null) ?? null;
  const start_lat = (trackMeta?.start_lat as number | null) ?? null;
  const start_lng = (trackMeta?.start_lng as number | null) ?? null;
  const start_image_url = (trackMeta?.start_image_url as string | null) ?? null;

  const { googleMapsUrl, w3wUrl } = buildLinks({
    lat: start_lat,
    lng: start_lng,
    postcode: start_postcode,
    w3w: start_w3w || undefined,
  });

  // 11) Render Start page (no auto-redirect)
  return (
    <main className="min-h-[100svh] md:min-h-dvh bg-neutral-900 text-white relative overflow-hidden flex flex-col">
      {/* Background maze logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <Image
          src="/riddle-city-logo2.png"
          alt=""
          width={600}
          height={600}
          className="w-[480px] h-[480px] md:w-[720px] md:h-[720px] object-contain"
        />
      </div>

      {/* Top bar: logo + share */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 pt-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/riddle-city-logo.png"
            alt="Riddle City"
            width={48}
            height={48}
            className="drop-shadow"
            priority
          />
          <span className="hidden sm:inline text-white/80">Riddle City</span>
        </Link>
        <div className="hidden sm:block">
          <ShareLink groupId={groupId} />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 pb-24 md:pb-28 flex items-center">
        <div className="w-full grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Image card (your own hosted image) */}
          <div className="md:col-span-2">
            <div className="bg-white/5 border border-white/15 rounded-2xl overflow-hidden">
              {start_image_url ? (
                <Image
                  src={start_image_url}
                  alt={start_label}
                  width={1200}
                  height={800}
                  className="w-full h-64 md:h-80 object-cover"
                />
              ) : (
                <div className="w-full h-64 md:h-80 flex items-center justify-center text-white/40">
                  No start image provided
                </div>
              )}

              <div className="p-4 border-t border-white/10 flex items-center gap-3">
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20
                               border border-white/20 hover:border-white/40 text-white/90 text-sm transition"
                  >
                    Open in Google Maps
                  </a>
                )}
                {start_postcode && <CopyPostcodeButton postcode={start_postcode} />}
              </div>
            </div>
          </div>

          {/* Details + Start */}
          <div className="md:col-span-3 flex flex-col gap-4">
            <div className="bg-white/5 border border-white/15 rounded-2xl p-5">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                {start_label}
              </h1>
              <p className="text-white/70 mb-4">
                Head to the starting location below. When your team is together, tap Start.
              </p>

              <div className="space-y-3 text-sm">
                {start_postcode && (
                  <div className="flex items-start gap-2">
                    <span className="text-white/50 w-24">Postcode</span>
                    <span className="text-white/90">{start_postcode}</span>
                  </div>
                )}
                {start_w3w && (
                  <div className="flex items-start gap-2">
                    <span className="text-white/50 w-24">what3words</span>
                    <a
                      href={w3wUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-300 hover:text-sky-200 underline"
                    >
                      ///{start_w3w}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Start button card */}
            <div className="bg-white/5 border border-white/15 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div className="text-white/80">
                <div className="text-sm">Team</div>
                <div className="text-lg font-semibold">
                  {teamName || "Your Team"}
                </div>
              </div>
              <a
                href={riddleHref}
                className="inline-flex items-center justify-center w-full md:w-auto
                           bg-gradient-to-r from-green-600 to-emerald-600
                           hover:from-green-700 hover:to-emerald-700
                           text-white font-semibold px-8 py-4 rounded-xl
                           transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                🚀 Start
              </a>
            </div>

            {/* Mobile: Share link below */}
            <div className="sm:hidden">
              <ShareLink groupId={groupId} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
