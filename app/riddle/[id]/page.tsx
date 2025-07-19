// app/riddle/[id]/page.tsx
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import ShareLink from "@/components/ShareLink";
import RestrictedSkipRiddleForm from "@/components/RestrictedSkipRiddleForm";
import RealTimeRiddleSync from "@/components/RealTimeRiddleSync";
import GameProgress from "@/components/GameProgress";
import CookieHandler from "@/components/CookieHandler";
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
    const groupId = cookieStore.get("group_id")?.value;
    const userId = cookieStore.get("user_id")?.value;
    const teamName = cookieStore.get("team_name")?.value;
    
    // If we have the essential cookies, return them
    if (groupId && userId) {
      return { groupId, userId, teamName };
    }
    
    // If this isn't the last attempt, wait a bit
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
    }
  }
  
  return { groupId: undefined, userId: undefined, teamName: undefined };
}

// Unauthorized access page component
function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4 py-16">
      {/* Background maze logo - more visible red tint */}
      <div className="absolute inset-0 flex items-center justify-center opacity-15 z-0">
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
          You Haven't Unlocked This Yet
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
            href="/riddlecity"
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

  const { data, error } = await supabase
    .from("riddles")
    .select("riddle_text, qr_hint, order_index, track_id")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const { riddle_text, qr_hint, order_index, track_id } = data;

  // Get user info from cookies with retry logic
  const { groupId, userId, teamName } = await getCookiesWithRetry();

  // Check if user has valid access - but be more lenient for payment flow
  if (!groupId || !userId) {
    // If no cookies but there might be game_data in URL, show the page and let CookieHandler fix it
    // Only show unauthorized if this is clearly not a payment redirect
    return (
      <main className="min-h-screen bg-neutral-900 text-white flex flex-col px-4 py-8 relative overflow-hidden">
        <CookieHandler />
        
        {/* Background maze logo - original colors, more visible */}
        <div className="absolute inset-0 flex items-center justify-center opacity-25 z-0">
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
    // Redirect to the correct riddle
    redirect(`/riddle/${group.current_riddle_id}`);
  }

  // Get progress data if user is in a group
  let currentRiddleOrder = order_index;
  let totalRiddles = 0;
  let gameStartTime = '';
  let isLastRiddle = false;
  
  if (groupId && userId) {
    // Get total riddles for this track
    const { data: riddleCount } = await supabase
      .from("riddles")
      .select("id", { count: 'exact' })
      .eq("track_id", track_id);
    
    totalRiddles = riddleCount?.length || 0;

    // Get game start time
    const { data: groupData } = await supabase
      .from("groups")
      .select("created_at")
      .eq("id", groupId)
      .single();
    
    gameStartTime = groupData?.created_at || '';

    // Check if this is the last riddle
    const { data: nextRiddleCheck } = await supabase
      .from("riddles")
      .select("next_riddle_id")
      .eq("id", id)
      .single();
    
    isLastRiddle = !nextRiddleCheck?.next_riddle_id;
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

  // If this is the last riddle, check if group is already finished and redirect to completion
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
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col px-4 py-8 relative overflow-hidden">
      {/* Handle cookie setting from URL parameters */}
      <CookieHandler />
      
      {/* Background maze logo - original colors, more visible */}
      <div className="absolute inset-0 flex items-center justify-center opacity-25 z-0">
        <Image
          src="/riddle-city-logo2.png"
          alt=""
          width={400}
          height={400}
          className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] object-contain"
          priority={false}
        />
      </div>

      {/* Game Progress - only show if in a group */}
      {groupId && gameStartTime && (
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
          <GameProgress 
            currentRiddleOrder={currentRiddleOrder}
            totalRiddles={totalRiddles}
            gameStartTime={gameStartTime}
          />
        </div>
      )}

      {/* Main content - split layout with riddle centered in logo */}
      <div className="flex-1 flex flex-col px-4 z-10">
        {/* Much larger top spacer to push riddle way down */}
        <div className="flex-[3]"></div>
        
        {/* Riddle text - centered in the logo */}
        <div className="w-full text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight drop-shadow-lg">
              {riddle_text}
            </h1>
          </div>
        </div>

        {/* Much smaller bottom spacer and content below logo */}
        <div className="flex-[1] flex flex-col justify-end pb-8">
          <div className="w-full max-w-lg mx-auto text-center space-y-6">
            {/* Hint section */}
            {qr_hint && (
              <details className="group">
                <summary className="cursor-pointer text-white/50 hover:text-white/70 transition-colors duration-200 mb-4 text-sm md:text-base font-normal bg-white/5 rounded-lg px-3 py-2 hover:bg-white/10 border border-white/10">
                  💡 Need a hint?
                </summary>
                <div className="text-white/70 text-sm md:text-base leading-relaxed bg-black/20 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/10">
                  {qr_hint}
                </div>
              </details>
            )}

            {/* Share link - only show for leaders */}
            {groupId && isLeader && !isLastRiddle && (
              <div className="w-full">
                <ShareLink groupId={groupId} />
              </div>
            )}

            {/* Last riddle message for leaders */}
            {isLastRiddle && isLeader && (
              <div className="text-center">
                <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 backdrop-blur-sm border border-green-500/30 rounded-xl p-6 md:p-8">
                  <div className="text-4xl md:text-6xl mb-4">🏁</div>
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
                    Final Challenge Complete!
                  </h2>
                  <p className="text-white/80 text-sm md:text-base mb-4">
                    You've reached the end of your adventure. Skip this riddle to complete your journey and see your results!
                  </p>
                  <div className="text-xs md:text-sm text-white/60">
                    Use the skip button to finish your adventure →
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time sync */}
      {groupId && <RealTimeRiddleSync groupId={groupId} />}

      {/* Skip button with penalty notice - show for leaders on non-completed adventures */}
      {groupId && userId && isLeader && (
        <RestrictedSkipRiddleForm groupId={groupId} isLeader={isLeader} />
      )}
    </main>
  );
}