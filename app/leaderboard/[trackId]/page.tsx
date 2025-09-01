// app/leaderboard/[trackId]/page.tsx - Fixed version with proper time tracking and skip display
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface Props {
  params: Promise<{ trackId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LeaderboardPage({ params, searchParams }: Props) {
  const { trackId } = await params;
  const searchParamsData = await searchParams;
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
        completedDate: new Date(entry.completed_at).toLocaleDateString('en-GB'),
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
        completedDate: new Date(entry.created_at).toLocaleDateString('en-GB'),
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
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col px-3 py-4 md:px-4 md:py-6 relative overflow-hidden">
      {/* Background maze logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <Image
          src="/riddle-city-logo2.png"
          alt=""
          width={600}
          height={600}
          className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] object-contain"
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

      {/* Content */}
      <div className="flex-1 flex flex-col justify-start pt-16 md:pt-20 pb-4 relative z-10 max-w-4xl mx-auto w-full">
        <div className="text-center">
          {/* Back to Completion Page - Moved to top */}
          <div className="mb-4">
            <Link 
              href={`/adventure-complete/${searchParamsData?.from_group || ''}`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-sm md:text-base"
            >
              ← Back to Completion
            </Link>
          </div>

          {/* Header */}
          <div className="text-4xl md:text-6xl mb-4">🏆</div>
          
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight">
            Leaderboard
          </h1>
          
          <p className="text-base md:text-lg text-white/70 mb-4">
            {adventureType} - {cityName}
          </p>

          {/* Stats summary */}
          {leaderboard.length > 0 && (
            <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl p-3 md:p-4 mb-6">
              <p className="text-white/80 text-sm md:text-base">
                <span className="text-green-400 font-semibold">{finishedEntries.length}</span> completed • 
                <span className="text-yellow-400 font-semibold ml-1">{unfinishedEntries.length}</span> in progress
              </p>
            </div>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 ? (
            <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl p-4 md:p-6 mb-6">
              <div className="w-full max-w-3xl mx-auto space-y-2 md:space-y-3">
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
                          : 'bg-white/10 border border-white/20 hover:bg-white/15'
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
                            {position}.
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
                          <div className={`font-semibold text-sm md:text-base truncate ${
                            isFinished ? 'text-white' : 'text-gray-300'
                          }`}>
                            {entry.team_name}
                            {!isFinished && <span className="text-gray-400 text-xs ml-1">(In Progress)</span>}
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
                          <div className="text-base md:text-lg font-bold font-mono">
                            {entry.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          ) : (
            <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl p-6 md:p-8 text-center">
              <div className="text-4xl mb-4">🎯</div>
              <p className="text-lg text-white/80 mb-2">No teams have started this adventure yet!</p>
              <p className="text-sm text-white/60">Be the first to take on the challenge.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
