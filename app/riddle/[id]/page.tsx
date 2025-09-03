// app/riddle/[id]/page.tsx
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import ShareLink from "@/components/ShareLink";
import RestrictedSkipRiddleForm from "@/components/RestrictedSkipRiddleForm";
import GameProgress from "@/components/GameProgress";
import RiddleTimeWarning from "@/components/RiddleTimeWarning";
import RealTimeRiddleSync from "@/components/RealTimeRiddleSync";
import CookieHandler from "@/components/CookieHandler";
import ManualAnswerForm from "@/components/ManualAnswerForm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Riddle",
};

async function getCookiesWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const cookieStore = await cookies();
    
    // Try new format first (riddlecity-session)
    const sessionCookie = cookieStore.get("riddlecity-session")?.value;
    if (sessionCookie) {
      try {
        const decoded = Buffer.from(sessionCookie, 'base64').toString('utf8');
        const sessionData = JSON.parse(decoded);
        return { 
          groupId: sessionData.groupId, 
          userId: sessionData.userId, 
          teamName: sessionData.teamName 
        };
      } catch (e) {
        console.warn("Failed to parse riddlecity-session cookie:", e);
      }
    }
    
    // Fallback to old format
    const groupId = cookieStore.get("group_id")?.value;
    const userId = cookieStore.get("user_id")?.value;
    const teamName = cookieStore.get("team_name")?.value;

    if (groupId && userId) {
      return { groupId, userId, teamName };
    }
    
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return { groupId: undefined, userId: undefined, teamName: undefined };
}

// Unauthorized access page component
function UnauthorizedPage() {
  return (
    <main className="min-h-[100svh] md:min-h-dvh bg-neutral-900 text-white flex flex-col items-center justify-center px-4 py-16 relative">
      {/* Background maze logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-15 z-0 pointer-events-none">
        <Image
          src="/riddle-city-logo2.png"
          alt=""
          width={400}
          height={400}
          className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] object-contain filter sepia hue-rotate-12 saturate-150"
          priority={false}
        />
      </div>

      <div className="text-center relative z-10 max-w-md">
        <div className="text-6xl mb-6">🔒</div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          You Haven&apos;t Unlocked This Yet
        </h1>

        <p className="text-lg text-white/70 mb-8">
          This riddle is part of an active adventure. Start your journey to unlock the mysteries!
        </p>

        <div className="space-y-4">
          <Link
            href="/"
            className="block w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            What is Riddle City? Find Out
          </Link>

          <Link
            href="/locations"
            className="block w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 border border-white/20 hover:border-white/40"
          >
            Start Your Adventure
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function RiddlePage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  // Add manual answer fields to the query
  const { data, error } = await supabase
    .from("riddles")
    .select(
      "riddle_text, qr_hint, order_index, track_id, has_manual_answer, answer, next_riddle_id"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const {
    riddle_text,
    qr_hint,
    order_index,
    track_id,
    has_manual_answer,
    answer,
    next_riddle_id,
  } = data;

  // Get user info from cookies with retry logic
  const { groupId, userId } = await getCookiesWithRetry();

  // If cookies missing, show loading screen so CookieHandler can set them
  if (!groupId || !userId) {
    return (
      <main className="min-h-[100svh] md:min-h-dvh bg-neutral-900 text-white flex flex-col px-4 py-8 relative overflow-hidden">
        <CookieHandler />

        {/* Background maze logo */}
        <div className="absolute inset-0 flex items-center justify-center opacity-25 z-0 pointer-events-none">
          <Image
            src="/riddle-city-logo2.png"
            alt=""
            width={400}
            height={400}
            className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] object-contain"
            priority={false}
          />
        </div>

        <div className="flex-1 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/70">Loading your adventure...</p>
          </div>
        </div>
      </main>
    );
  }

  // Verify user is actually in this group (only if we have cookies)
  const { data: membership } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();

  if (!membership) {
    return <UnauthorizedPage />;
  }

  // Anti-cheat: Check if user should be on this riddle
  const { data: group } = await supabase
    .from("groups")
    .select("current_riddle_id")
    .eq("id", groupId)
    .single();

  if (group && group.current_riddle_id !== id) {
    redirect(`/riddle/${group.current_riddle_id}`);
  }

  // Get progress data if user is in a group
  const currentRiddleOrder = order_index;
  let totalRiddles = 0;
  let isLastRiddle = false;

  if (groupId && userId) {
    // Get total riddles for this track
    const { data: riddleCount } = await supabase
      .from("riddles")
      .select("id", { count: "exact" })
      .eq("track_id", track_id);

    totalRiddles = riddleCount?.length || 0;

    // Use next_riddle_id to determine last step
    isLastRiddle = !next_riddle_id;
  }

  // Check if user is marked as leader in group_members
  let isLeader = false;
  if (groupId && userId) {
    const { data: memberData } = await supabase
      .from("group_members")
      .select("is_leader")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    isLeader = memberData?.is_leader || false;
  }

  // If this is the last riddle and group finished, go to completion
  if (isLastRiddle && groupId) {
    const { data: groupStatus } = await supabase
      .from("groups")
      .select("finished")
      .eq("id", groupId)
      .single();

    if (groupStatus?.finished) {
      redirect(`/adventure-complete/${groupId}`);
    }
  }

  return (
    <main className="min-h-[100svh] md:min-h-dvh bg-neutral-900 text-white relative overflow-hidden flex flex-col">
      {/* Handle cookie setting from URL parameters */}
      <CookieHandler />

      {/* Background maze logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-25 z-0 pointer-events-none">
        <Image
          src="/riddle-city-logo2.png"
          alt=""
          width={400}
          height={400}
          className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] object-contain"
          priority={false}
        />
      </div>

      {/* Game Progress - At the very top (NO TIMER) */}
      {groupId && (
        <div className="w-full px-4 pt-4 z-10">
          <GameProgress
            currentRiddleOrder={currentRiddleOrder}
            totalRiddles={totalRiddles}
          />
        </div>
      )}

      {/* Time Warning for this riddle's location */}
      <RiddleTimeWarning riddleId={id} trackId={track_id} />

      {/* Main content area - riddle centered in logo */}
      <div className="flex-1 flex items-center justify-center px-4 z-10">
        <div className="w-full max-w-4xl text-center">
          <h1
            className="font-bold text-white leading-tight drop-shadow-lg mb-8
                       text-[clamp(1.5rem,6vw,2.5rem)]
                       md:text-[clamp(2rem,4vw,3rem)]"
          >
            {riddle_text}
          </h1>

          {/* Manual Answer Form */}
          {has_manual_answer && groupId && (
            <div className="mt-8 mb-8">
              <ManualAnswerForm
                riddleId={id}
                groupId={groupId}
                correctAnswer={answer}
                isLastRiddle={isLastRiddle}
              />
            </div>
          )}

          {/* Hint section */}
          {qr_hint && (
            <div className="mt-8">
              <details className="group">
                <summary className="cursor-pointer text-white/50 hover:text-white/70 transition-colors duration-200 text-center text-sm font-normal bg-white/10 rounded-lg px-4 py-3 hover:bg-white/20 inline-block">
                  💡 Ask for a hint? ▼
                </summary>
                <div className="text-white/70 text-sm leading-relaxed bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10 mt-2 max-w-lg mx-auto">
                  {qr_hint}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* Bottom section - copy link and skip */}
      <div
        className="relative z-10 p-4 flex justify-between items-end"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
      >
        {/* Copy Link - Bottom Left */}
        {groupId && isLeader && !isLastRiddle && (
          <div className="flex-1">
            <ShareLink groupId={groupId} />
          </div>
        )}

        {/* Skip button - Bottom Right */}
        {groupId && userId && isLeader && (
          <div className="flex-1 flex justify-end">
            <RestrictedSkipRiddleForm groupId={groupId} isLeader={isLeader} />
          </div>
        )}
      </div>

      {/* Real-time sync */}
      {groupId && <RealTimeRiddleSync groupId={groupId} />}
    </main>
  );
}
