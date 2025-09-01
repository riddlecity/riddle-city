// app/adventure-complete/[groupId]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface Props {
  params: Promise<{ groupId: string }>;
}

// Client component for cookie clearing
function CookieCleaner() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          // Clear group-related cookies when reaching completion page
          document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'group_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        `,
      }}
    />
  );
}

export default async function AdventureCompletePage({ params }: Props) {
  const { groupId } = await params;
  const supabase = await createClient();

  // Get group details with completion info
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select(`
      *,
      group_members (
        user_id,
        is_leader
      )
    `)
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    notFound();
  }

  // Check if group should be auto-closed (15 minutes after completion)
  const now = new Date();
  const completionTime = group.completed_at ? new Date(group.completed_at) : null;
  const FIFTEEN_MINUTES = 15 * 60 * 1000; // 15 minutes in milliseconds

  if (completionTime) {
    const timeSinceCompletion = now.getTime() - completionTime.getTime();

    if (timeSinceCompletion > FIFTEEN_MINUTES && group.active !== false) {
      // Group should be closed - mark it as inactive
      try {
        await supabase
          .from("groups")
          .update({
            active: false,
            closed_at: now.toISOString(),
          })
          .eq("id", groupId);
      } catch (error) {
        // Silently handle error
      }
    }
  }

  // Calculate completion time (NO penalty added)
  const startTime = new Date(group.created_at);
  let endTime: Date;

  if (group.completed_at) {
    // Use stored completion time
    endTime = new Date(group.completed_at);
  } else {
    // Group finished but no completion time stored - mark it now and use current time
    const now2 = new Date();
    endTime = now2;

    // Update the group with completion timestamp
    try {
      await supabase
        .from("groups")
        .update({
          completed_at: now2.toISOString(),
          finished: true,
        })
        .eq("id", groupId);
    } catch (error) {
      // Silently handle error
    }
  }

  const actualTimeMs = endTime.getTime() - startTime.getTime();
  const skipsUsed = group.riddles_skipped || 0;
  const totalTimeMs = actualTimeMs; // ✅ No penalty applied

  // Format times properly
  function formatTime(milliseconds: number): string {
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;
      return `${hours}h ${remainingMinutes}m ${seconds}s`;
    } else {
      return `${totalMinutes}:${seconds.toString().padStart(2, "0")}`;
    }
  }

  const formattedTime = formatTime(totalTimeMs);

  // Get track info to show adventure type
  const trackParts = group.track_id?.split("_") || [];
  const adventureType =
    trackParts[0] === "date" ? "Date Day Adventure" : "Adventure";
  const cityName = trackParts[1]
    ? trackParts[1].charAt(0).toUpperCase() + trackParts[1].slice(1)
    : "Unknown";

  const memberCount = group.group_members?.length || 0;

  // Create fun WhatsApp share message
  const funMessages = [
    `🎯 Just solved all the mysteries in Riddle City ${cityName}! We completed the ${adventureType} in ${formattedTime}${
      skipsUsed > 0
        ? ` (okay, we might have needed ${skipsUsed} skip${
            skipsUsed > 1 ? "s" : ""
          } 😅)`
        : " without any help! 💪"
    }. Think you and your squad can crack the codes? 🕵️‍♀️`,
    `🧩 MISSION ACCOMPLISHED! We just escaped Riddle City ${cityName} in ${formattedTime}! The ${adventureType} was epic${
      skipsUsed > 0
        ? ` (we used ${skipsUsed} skip${skipsUsed > 1 ? "s" : ""} but who's counting? 😏)`
        : " and we smashed it! 🔥"
    }. Your turn to solve the mystery! 🔍`,
    `🏆 Plot twist: WE WON! Just finished the ultimate ${adventureType} challenge in Riddle City ${cityName}! Took us ${formattedTime}${
      skipsUsed > 0
        ? ` with ${skipsUsed} strategic skip${skipsUsed > 1 ? "s" : ""} 🎭`
        : " of pure brain power! 🧠"
    }. Ready for your adventure? 🗺️`,
  ];

  const randomMessage =
    funMessages[Math.floor(Math.random() * funMessages.length)];
  const shareMessage = `${randomMessage} ${
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  }/${cityName.toLowerCase()}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    shareMessage
  )}`;

  // Get leaderboard data for this track
  const { data: leaderboardData } = await supabase
    .from("groups")
    .select(
      "team_name, created_at, completed_at, riddles_skipped, group_members(user_id)"
    )
    .eq("track_id", group.track_id)
    .eq("finished", true)
    .not("team_name", "is", null)
    .not("completed_at", "is", null) // Only include groups with completion times
    .order("created_at", { ascending: false })
    .limit(20); // Get more entries for better leaderboard

  // Calculate times for leaderboard (NO penalty)
  const leaderboard =
    leaderboardData
      ?.map((entry) => {
        if (!entry.completed_at) return null; // Skip entries without completion time

        const start = new Date(entry.created_at);
        const end = new Date(entry.completed_at);
        const actual = end.getTime() - start.getTime();
        const total = actual; // ✅ No penalty added

        return {
          team_name: entry.team_name,
          time: formatTime(total),
          totalTimeMs: total,
          skips: entry.riddles_skipped || 0,
          members: entry.group_members?.length || 0,
          isCurrentTeam: entry.team_name === group.team_name,
        };
      })
      .filter((entry) => entry !== null) // Remove null entries
      .sort((a, b) => a!.totalTimeMs - b!.totalTimeMs) || [];

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col px-3 py-4 md:px-4 md:py-6 relative overflow-hidden">
      {/* Clear cookies when page loads */}
      <CookieCleaner />

      {/* Background maze logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <Image
          src="/riddle-city-logo2.png"
          alt=""
          width={600}
          height={600}
          className="w-[400px] h-[400px] md:w-[500px] md:h-[500px] object-contain"
          priority={false}
        />
      </div>

      {/* Logo */}
      <div className="absolute top-3 left-3 md:top-4 md:left-4 z-10">
        <Link href="/">
          <Image
            src="/riddle-city-logo.png"
            alt="Riddle City Logo"
            width={50}
            height={50}
            className="md:w-[60px] md:h-[60px] drop-shadow-lg hover:scale-105 transition-transform duration-200"
            priority
          />
        </Link>
      </div>

      {/* Completion content */}
      <div className="flex-1 flex flex-col items-center justify-center px-2 relative z-10 max-w-3xl mx-auto">
        <div className="w-full text-center">
          {/* Celebration */}
          <div className="text-4xl md:text-6xl mb-3">🎉</div>

          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight">
            Adventure Complete!
          </h1>

          <p className="text-base md:text-lg text-white/70 mb-4">
            {group.team_name
              ? `Well done ${group.team_name}!`
              : "Congratulations!"}{" "}
            You completed the {adventureType} in {cityName}!
          </p>

          {/* Stats - More compact */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl p-4 md:p-6 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {/* Final Completion Time */}
              <div className="text-center">
                <div className="text-lg md:text-2xl font-bold text-white mb-1">
                  ⏱️ {formattedTime}
                </div>
                <div className="text-white/60 text-xs md:text-sm">Final Time</div>
              </div>

              {/* Team Size */}
              <div className="text-center">
                <div className="text-lg md:text-2xl font-bold text-white mb-1">
                  👥 {memberCount}
                </div>
                <div className="text-white/60 text-xs md:text-sm">
                  {memberCount === 1 ? "Solo Explorer" : "Team Members"}
                </div>
              </div>

              {/* Skips Used */}
              <div className="text-center">
                <div className="text-lg md:text-2xl font-bold text-white mb-1">
                  ⏭️ {skipsUsed}
                </div>
                <div className="text-white/60 text-xs md:text-sm">
                  Riddle{skipsUsed !== 1 ? "s" : ""} Skipped
                </div>
              </div>

              {/* Adventure Type */}
              <div className="text-center">
                <div className="text-lg md:text-2xl font-bold text-white mb-1">
                  {adventureType === "Date Day Adventure" ? "💘" : "🎮"}
                </div>
                <div className="text-white/60 text-xs md:text-sm">
                  {adventureType === "Date Day Adventure"
                    ? "Date Day"
                    : "Adventure"}
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard - With inline "See Full Leaderboard" button */}
          {leaderboard.length > 0 && (
            <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl p-4 md:p-5 mb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 gap-2">
                <h3 className="text-lg md:text-xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
                  🏆 {adventureType} Leaderboard - {cityName}
                </h3>
                <Link
                  href={`/leaderboard/${group.track_id}?from_group=${groupId}`}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-xs md:text-sm whitespace-nowrap"
                >
                  See Full Leaderboard
                </Link>
              </div>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((entry, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-2 md:p-3 rounded-lg transition-all duration-200 ${
                      entry.isCurrentTeam
                        ? "bg-yellow-500/20 border border-yellow-500/30"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2 md:gap-3">
                      <div
                        className={`text-sm md:text-lg font-bold ${
                          index === 0
                            ? "text-yellow-400"
                            : index === 1
                            ? "text-gray-300"
                            : index === 2
                            ? "text-orange-400"
                            : "text-white/70"
                        }`}
                      >
                        {index + 1}.
                      </div>
                      <div>
                        <div
                          className={`text-sm md:text-base font-semibold ${
                            entry.isCurrentTeam
                              ? "text-yellow-200"
                              : "text-white"
                          }`}
                        >
                          {entry.team_name} {entry.isCurrentTeam && "(You!)"}
                        </div>
                        <div className="text-xs text-white/60">
                          {entry.members} member
                          {entry.members !== 1 ? "s" : ""} • {entry.skips} skip
                          {entry.skips !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`font-mono font-bold text-sm md:text-base ${
                        entry.isCurrentTeam ? "text-yellow-200" : "text-white"
                      }`}
                    >
                      {entry.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Primary Actions - All buttons side-by-side for maximum compactness */}
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            {/* WhatsApp Share */}
            <div className="p-2 bg-green-600/20 border border-green-500/30 rounded-lg">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-2 rounded-lg transition-all duration-200 text-center text-xs"
              >
                📱 Share on WhatsApp
              </a>
            </div>

            {/* Leave Review */}
            <div className="p-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg">
              <a
                href="#"
                className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-2 rounded-lg transition-all duration-200 text-center text-xs"
              >
                ⭐ Leave us a Review
              </a>
            </div>

            {/* Return to Riddle City */}
            <div className="p-2 bg-red-600/20 border border-red-500/30 rounded-lg">
              <Link
                href="/"
                className="block w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 px-2 rounded-lg transition-all duration-200 text-center text-xs"
              >
                🏠 Homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
