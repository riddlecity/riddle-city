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

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Riddle",
};

async function getCookiesWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🍪 RIDDLE PAGE: Cookie read attempt ${attempt}/${maxRetries}`);
    
    const cookieStore = await cookies();
    const groupId = cookieStore.get("group_id")?.value;
    const userId = cookieStore.get("user_id")?.value;
    const teamName = cookieStore.get("team_name")?.value;
    
    console.log(`🍪 RIDDLE PAGE: Attempt ${attempt} cookies:`, { groupId, userId, teamName });
    
    // If we have the essential cookies, return them
    if (groupId && userId) {
      console.log(`✅ RIDDLE PAGE: Cookies found on attempt ${attempt}`);
      return { groupId, userId, teamName };
    }
    
    // If this isn't the last attempt, wait a bit
    if (attempt < maxRetries) {
      console.log(`⏳ RIDDLE PAGE: Waiting before retry attempt ${attempt + 1}`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
    }
  }
  
  console.log(`❌ RIDDLE PAGE: No cookies found after ${maxRetries} attempts`);
  return { groupId: undefined, userId: undefined, teamName: undefined };
}

export default async function RiddlePage({ params }: Props) {
  const { id } = await params;
  console.log(`🎯 RIDDLE PAGE: Loading riddle ${id}`);
  
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("riddles")
    .select("riddle_text, qr_hint, order_index, track_id")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error('❌ RIDDLE PAGE: Riddle fetch error:', error);
    notFound();
  }

  const { riddle_text, qr_hint, order_index, track_id } = data;
  console.log(`📋 RIDDLE PAGE: Riddle data loaded for ${id}`);

  // Get user info from cookies with retry logic
  const { groupId, userId, teamName } = await getCookiesWithRetry();

  console.log("🍪 RIDDLE PAGE: Final cookies result:", {
    groupId,
    userId,
    teamName
  });

  // Anti-cheat: Check if user should be on this riddle
  if (groupId && userId) {
    console.log(`🔍 RIDDLE PAGE: Running anti-cheat check for group ${groupId}`);
    const { data: group } = await supabase
      .from("groups")
      .select("current_riddle_id")
      .eq("id", groupId)
      .single();

    if (group && group.current_riddle_id !== id) {
      console.log(`❌ RIDDLE PAGE: Anti-cheat triggered - user on ${id} but should be on ${group.current_riddle_id}`);
      redirect(`/riddle-locked?current=${group.current_riddle_id}&attempted=${id}`);
    } else {
      console.log(`✅ RIDDLE PAGE: Anti-cheat passed - user on correct riddle`);
    }
  } else {
    console.log(`⚠️ RIDDLE PAGE: Skipping anti-cheat - no group/user cookies`);
  }

  // Get progress data if user is in a group
  let currentRiddleOrder = order_index;
  let totalRiddles = 0;
  let gameStartTime = '';
  let isLastRiddle = false;
  
  if (groupId && userId) {
    console.log(`📊 RIDDLE PAGE: Loading progress data for group ${groupId}`);
    
    // Get total riddles for this track
    const { data: riddleCount } = await supabase
      .from("riddles")
      .select("id", { count: 'exact' })
      .eq("track_id", track_id);
    
    totalRiddles = riddleCount?.length || 0;
    console.log(`📊 RIDDLE PAGE: Total riddles: ${totalRiddles}`);

    // Get game start time
    const { data: groupData } = await supabase
      .from("groups")
      .select("created_at")
      .eq("id", groupId)
      .single();
    
    gameStartTime = groupData?.created_at || '';
    console.log(`⏱️ RIDDLE PAGE: Game start time: ${gameStartTime}`);

    // Check if this is the last riddle
    const { data: nextRiddleCheck } = await supabase
      .from("riddles")
      .select("next_riddle_id")
      .eq("id", id)
      .single();
    
    isLastRiddle = !nextRiddleCheck?.next_riddle_id;
    console.log(`🏁 RIDDLE PAGE: Is last riddle: ${isLastRiddle}`);
  }

  // Check if user is marked as leader in group_members
  let isLeader = false;
  if (groupId && userId) {
    console.log(`👑 RIDDLE PAGE: Checking leadership for user ${userId} in group ${groupId}`);
    const { data: memberData } = await supabase
      .from("group_members")
      .select("is_leader")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();
    
    isLeader = memberData?.is_leader || false;
    console.log(`👑 RIDDLE PAGE: Is leader: ${isLeader}`);
  }

  // If this is the last riddle, check if group is already finished and redirect to completion
  if (isLastRiddle && groupId) {
    console.log(`🏁 RIDDLE PAGE: Checking if group already finished`);
    const { data: groupStatus } = await supabase
      .from("groups")
      .select("finished")
      .eq("id", groupId)
      .single();
    
    if (groupStatus?.finished) {
      console.log(`✅ RIDDLE PAGE: Group already finished - redirecting to completion`);
      redirect(`/adventure-complete/${groupId}`);
    }
  }

  console.log(`🎮 RIDDLE PAGE: Rendering riddle with state:`, {
    groupId: !!groupId,
    userId: !!userId,
    isLeader,
    isLastRiddle,
    totalRiddles,
    currentRiddleOrder
  });

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col px-4 py-8 relative overflow-hidden">
      {/* Handle cookie setting from URL parameters */}
      <CookieHandler />
      
      {/* Background maze logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 z-0">
        <Image
          src="/riddle-city-logo2.png"
          alt=""
          width={400}
          height={400}
          className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] object-contain"
          priority={false}
        />
      </div>

      {/* Logo */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
        <Image
          src="/riddle-city-logo.png"
          alt="Riddle City Logo"
          width={80}
          height={80}
          className="md:w-[100px] md:h-[100px] drop-shadow-lg"
          priority
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

      {/* Main content - centered with mobile-friendly spacing */}
      <div className="flex-1 flex flex-col items-center justify-center pt-24 md:pt-28 pb-32 px-4 z-10">
        {/* Riddle text - better mobile width control */}
        <div className="max-w-4xl w-full text-center">
          <div className="max-w-3xl mx-auto mb-8 md:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 md:mb-8 leading-tight drop-shadow-lg">
              {riddle_text}
            </h1>
          </div>

          {/* Hint section */}
          {qr_hint && (
            <details className="group mb-8 md:mb-12">
              <summary className="cursor-pointer text-white/80 hover:text-white transition-colors duration-200 mb-4 text-lg md:text-xl font-medium backdrop-blur-sm bg-white/5 rounded-lg px-4 py-3 hover:bg-white/10">
                🤫 Ask for a hint?
              </summary>
              <div className="text-white/70 text-base md:text-lg leading-relaxed bg-black/20 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/10">
                {qr_hint}
              </div>
            </details>
          )}

          {/* Share link - only show for leaders, positioned below content */}
          {groupId && isLeader && !isLastRiddle && (
            <div className="mt-6 md:mt-8 w-full max-w-lg mx-auto px-4">
              <ShareLink groupId={groupId} />
            </div>
          )}

          {/* Last riddle message for leaders */}
          {isLastRiddle && isLeader && (
            <div className="mt-8 md:mt-12 text-center">
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

      {/* Real-time sync */}
      {groupId && <RealTimeRiddleSync groupId={groupId} />}

      {/* Skip button - show for leaders on non-completed adventures */}
      {groupId && userId && isLeader && (
        <RestrictedSkipRiddleForm groupId={groupId} isLeader={isLeader} />
      )}
    </main>
  );
}