// app/[location]/[mode]/start/admin/page.tsx
// Start page for admin/testing bypass — no Stripe session needed
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import ShareLink from "@/components/ShareLink";
import StartAdventureButton from "@/components/StartAdventureButton";

interface Props {
  params: Promise<{ location: string; mode: string }>;
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
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;

  const w3wUrl =
    w3w && w3w.trim()
      ? `https://what3words.com/${w3w.replace(/^\/+/, "")}`
      : null;

  return { googleMapsUrl, w3wUrl };
}

export default async function AdminStartPage({ params, searchParams }: Props) {
  const awaitedParams = await params;
  const awaitedSearchParams = await searchParams;

  const groupId = awaitedSearchParams.groupId as string | undefined;
  const firstRiddleId = awaitedSearchParams.firstRiddleId as string | undefined;
  const teamName = (awaitedSearchParams.teamName as string) || "Your Team";

  if (!groupId || !firstRiddleId) {
    redirect("/locations");
  }

  const supabase = await createClient();

  // Verify the group exists
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, track_id, current_riddle_id")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    redirect("/locations");
  }

  // Load track start info
  const { data: trackMeta } = await supabase
    .from("tracks")
    .select("id, name, start_label, start_postcode, start_w3w, start_lat, start_lng")
    .eq("id", group.track_id)
    .single();

  const start_label = trackMeta?.start_label || "Starting Point";
  const start_postcode = (trackMeta?.start_postcode as string | null) ?? null;
  const start_w3w = (trackMeta?.start_w3w as string | null) ?? null;
  const start_lat = (trackMeta?.start_lat as number | null) ?? null;
  const start_lng = (trackMeta?.start_lng as number | null) ?? null;

  const { googleMapsUrl, w3wUrl } = buildLinks({
    lat: start_lat,
    lng: start_lng,
    postcode: start_postcode,
    w3w: start_w3w || undefined,
  });

  const riddleHref = `/riddle/${firstRiddleId}`;

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
          priority={false}
        />
      </div>

      {/* Top bar */}
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
          {/* LEFT: Starting Location */}
          <div className="md:col-span-2">
            <div className="bg-white/5 border border-white/15 rounded-2xl p-5">
              <h2 className="text-xl font-semibold mb-3">Starting Location</h2>
              <div className="flex flex-col gap-3">
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20
                               border border-white/20 hover:border-white/40
                               text-white/90 transition-colors text-sm w-max"
                  >
                    Open in Google Maps
                  </a>
                )}
                {start_postcode && (
                  <div className="text-sm">
                    <div className="text-white/50">Postcode</div>
                    <div className="font-medium">{start_postcode}</div>
                  </div>
                )}
                {w3wUrl && start_w3w && (
                  <div className="text-sm">
                    <div className="text-white/50">what3words</div>
                    <a
                      href={w3wUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-300 hover:text-sky-200 underline font-medium"
                    >
                      {`///${start_w3w}`}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Details + Start */}
          <div className="md:col-span-3 flex flex-col gap-4">
            <div className="bg-white/5 border border-white/15 rounded-2xl p-5">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                {start_label}
              </h1>
              <p className="text-white/70">
                Head to the starting location. When your team is together, tap
                Start to begin.
              </p>
            </div>

            {/* Photo info card */}
            <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📸</span>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-base mb-1.5">Team Selfie Collage</h3>
                  <p className="text-white/80 text-sm mb-2">
                    As team leader, snap a selfie at each venue to create your adventure collage at the end!
                  </p>
                  <p className="text-purple-200/60 text-xs">
                    🔒 Photos are stored locally on your device, not on our servers
                  </p>
                </div>
              </div>
            </div>

            {/* Start button card */}
            <div className="bg-white/5 border border-white/15 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div className="text-white/80">
                <div className="text-sm">Team</div>
                <div className="text-lg font-semibold">{teamName}</div>
              </div>
              <StartAdventureButton
                groupId={groupId}
                riddleHref={riddleHref}
              />
            </div>

            {/* Mobile: Share link */}
            <div className="sm:hidden">
              <ShareLink groupId={groupId} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
