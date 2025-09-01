// app/leaderboard/[trackId]/page.tsx - Fixed version with proper time tracking and skip display
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import BackButton from "@/components/BackButton";

interface Props {
  params: Promise<{ trackId: string }>;
}

export default async function LeaderboardPage({ params }: Props) {
  const { trackId } = await params;
  const supabase = await createClient();

  const { data: track, error: trackError } = await supabase
    .from("tracks")
    .select("name, location, mode")
    .eq("id", trackId)
    .single();

  if (trackError || !track) {
    notFound();
  }

  // Get ALL groups for this track (finished and unfinished)
  const { data: leaderboardData } = await supabase
    .from("groups")
    .select(`
      id,
      team_name, 
      created_at, 
      started_at,
      completed_at,
      riddles_skipped,
      finished,
      paid,
      game_started,
      group_members(user_id)
    `)
    .eq("track_id", trackId)
    .eq("paid", true)
    .not("team_name", "is", null)
    .order("finished", { ascending: false })
    .limit(50);

  // Format time function
  function formatTime(milliseconds: number): string {
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;
      return `${hours}h ${remainingMinutes}m ${seconds}s`;
    } else {
      return `${totalMinutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  // Process all groups (finished and unfinished)
  const allEntries = leaderboardData?.map(entry => {
    // Use started_at if available (more accurate), otherwise fall back to created_at
    const startTime = new Date(entry.started_at || entry.created_at);
    
    if (entry.finished && entry.completed_at) {
      const endTime = new Date(entry.completed_at);
      const actualTimeMs = endTime.getTime() - startTime.getTime();
      // No more skip penalties - just show actual time
      
      return {
        id: entry.id,
        team_name: entry.team_name || 'Unknown Team',
        time: formatTime(actualTimeMs),
        totalTimeMs: actualTimeMs,
        skips: entry.riddles_skipped || 0,
        members: entry.group_members?.length || 0,
        completedDate: new Date(entry.completed_at).toLocaleDateString(),
        status: 'finished' as const,
        hasAccurateStartTime: !!entry.started_at // Track if we have accurate timing
      };
    } else {
      return {
        id: entry.id,
        team_name: entry.team_name || 'Unknown Team',
        time: 'In Progress',
        totalTimeMs: Infinity,
        skips: entry.riddles_skipped || 0,
        members: entry.group_members?.length || 0,
        completedDate: new Date(entry.created_at).toLocaleDateString(),
        status: 'unfinished' as const,
        hasAccurateStartTime: !!entry.started_at
      };
    }
  }) || [];

  const finishedEntries = allEntries
    .filter(entry => entry.status === 'finished')
    .sort((a, b) => {
      // First sort by time
      if (a.totalTimeMs !== b.totalTimeMs) {
        return a.totalTimeMs - b.totalTimeMs;
      }
      // If times are equal, sort by skips (fewer skips = better)
      return a.skips - b.skips;
    });
    
  const unfinishedEntries = allEntries
    .filter(entry => entry.status === 'unfinished')
    .sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime());

  const leaderboard = [...finishedEntries, ...unfinishedEntries];
  const adventureType = track.mode === 'date' ? 'Date Day Adventure' : 'Adventure';
  const cityName = track.location.charAt(0).toUpperCase() + track.location.slice(1);

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col px-4 py-4 md:py-8 relative overflow-hidden">
      {/* Background maze logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <Image
          src="/riddle-city-logo2.png"
          alt=""
          width={600}
          height={600}
          className="w-[300px] h-[300px] md:w-[500px] md:h-[500px] lg:w-[700px] lg:h-[700px] object-contain"
          priority={false}
        />
      </div>

      {/* Logo */}
      <div className="absolute top-2 left-2 md:top-6 md:left-6 z-10">
        <Image
          src="/riddle-city-logo.png"
          alt="Riddle City Logo"
          width={60}
          height={60}
          className="md:w-[80px] md:h-[80px] lg:w-[100px] lg:h-[100px] drop-shadow-lg"
          priority
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-start pt-16 md:pt-20 pb-4 relative z-10 max-w-4xl mx-auto w-full">
        <div className="text-center">
          {/* Header */}
          <div className="text-3xl md:text-4xl lg:text-6xl mb-3 md:mb-4">🏆</div>
          
          <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-white mb-2 leading-tight px-2">
            Leaderboard
          </h1>
          
          <p className="text-base md:text-lg lg:text-xl text-white/70 mb-6 md:mb-8 px-2">
            {adventureType} - {cityName}
          </p>

          {/* Stats summary */}
          {leaderboard.length > 0 && (
            <div className="mb-4 md:mb-6 text-center">
              <p className="text-white/60 text-sm">
                {finishedEntries.length} completed • {unfinishedEntries.length} in progress
              </p>
            </div>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 ? (
            <div className="w-full max-w-2xl mx-auto space-y-2 md:space-y-3">
              {leaderboard.map((entry) => {
                const isFinished = entry.status === 'finished';
                const position = isFinished ? finishedEntries.findIndex(e => e.id === entry.id) + 1 : null;
                
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg transition-all ${
                      isFinished 
                        ? position === 1 
                          ? 'bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 border border-yellow-500/30' 
                          : position === 2
                          ? 'bg-gradient-to-r from-gray-400/20 to-gray-300/20 border border-gray-400/30'
                          : position === 3
                          ? 'bg-gradient-to-r from-orange-600/20 to-orange-500/20 border border-orange-500/30'
                          : 'bg-white/5 border border-white/10'
                        : 'bg-gray-800/50 border border-gray-600/30'
                    }`}
                  >
                    {/* Position/Trophy */}
                    <div className="flex-shrink-0 w-8 md:w-10 text-center">
                      {isFinished ? (
                        position === 1 ? (
                          <div className="text-xl md:text-2xl">🥇</div>
                        ) : position === 2 ? (
                          <div className="text-xl md:text-2xl">🥈</div>
                        ) : position === 3 ? (
                          <div className="text-xl md:text-2xl">🥉</div>
                        ) : (
                          <div className="text-sm md:text-base text-white/60 font-semibold">
                            {position}
                          </div>
                        )
                      ) : (
                        <div className="text-gray-400 text-xs md:text-sm">
                          ⏳
                        </div>
                      )}
                    </div>

                    {/* Team Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-left flex-1 min-w-0">
                          <div className={`font-semibold text-base md:text-lg truncate ${
                            isFinished ? 'text-white' : 'text-gray-300'
                          }`}>
                            {entry.team_name}
                            {!isFinished && <span className="text-gray-400 text-sm ml-1">(In Progress)</span>}
                          </div>
                          <div className={`text-xs md:text-sm ${isFinished ? 'text-white/60' : 'text-gray-400'}`}>
                            {entry.members} member{entry.members !== 1 ? 's' : ''}
                            {entry.skips > 0 && (
                              <span className="text-yellow-400 ml-2">
                                • {entry.skips} skip{entry.skips !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-white/50">
                            {isFinished ? `Completed ${entry.completedDate}` : `Started ${entry.completedDate}`}
                          </div>
                        </div>

                        {/* Time */}
                        <div className={`text-right ${
                          isFinished 
                            ? position === 1 
                              ? 'text-yellow-300' 
                              : position === 2
                              ? 'text-gray-300'
                              : position === 3
                              ? 'text-orange-300'
                              : 'text-white'
                            : 'text-gray-400'
                        }`}>
                          <div className="text-lg md:text-xl font-bold">
                            {entry.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-white/60 py-8">
              <div className="text-4xl mb-4">🎯</div>
              <p className="text-lg">No teams have started this adventure yet!</p>
              <p className="text-sm mt-2">Be the first to take on the challenge.</p>
            </div>
          )}

          {/* Back to locations button */}
          <div className="mt-8 md:mt-12">
            <Link 
              href="/locations" 
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-lg transition-all"
            >
              <BackButton />
              Back to Locations
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
