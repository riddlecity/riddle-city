// app/leaderboard/[trackId]/page.tsx - Mobile Responsive Version
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
      completed_at,
      riddles_skipped,
      finished,
      paid,
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
    const startTime = new Date(entry.created_at);
    
    if (entry.finished && entry.completed_at) {
      const endTime = new Date(entry.completed_at);
      const actualTimeMs = endTime.getTime() - startTime.getTime();
      const skipPenaltyMs = (entry.riddles_skipped || 0) * 20 * 60 * 1000;
      const totalTimeMs = actualTimeMs + skipPenaltyMs;
      
      return {
        id: entry.id,
        team_name: entry.team_name,
        time: formatTime(totalTimeMs),
        totalTimeMs,
        skips: entry.riddles_skipped || 0,
        members: entry.group_members?.length || 0,
        completedDate: new Date(entry.completed_at).toLocaleDateString(),
        actualTime: formatTime(actualTimeMs),
        status: 'finished' as const
      };
    } else {
      return {
        id: entry.id,
        team_name: entry.team_name,
        time: 'Unfinished',
        totalTimeMs: Infinity,
        skips: entry.riddles_skipped || 0,
        members: entry.group_members?.length || 0,
        completedDate: new Date(entry.created_at).toLocaleDateString(),
        actualTime: '',
        status: 'unfinished' as const
      };
    }
  }) || [];

  const finishedEntries = allEntries
    .filter(entry => entry.status === 'finished')
    .sort((a, b) => a.totalTimeMs - b.totalTimeMs);
    
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

      {/* Logo - Made smaller on mobile */}
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

      {/* Content - Better mobile spacing */}
      <div className="flex-1 flex flex-col justify-start pt-16 md:pt-20 pb-4 relative z-10 max-w-4xl mx-auto w-full">
        <div className="text-center">
          {/* Header - Responsive text sizes */}
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
                {finishedEntries.length} completed • {unfinishedEntries.length} unfinished
              </p>
            </div>
          )}

          {/* Leaderboard - Mobile optimized */}
          {leaderboard.length > 0 ? (
            <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl md:rounded-2xl p-3 md:p-6 lg:p-8 mb-6 md:mb-8">
              <div className="space-y-2 md:space-y-3">
                {leaderboard.map((entry, index) => {
                  const isFinished = entry.status === 'finished';
                  const isTopThree = isFinished && index < 3;
                  const medals = ['🥇', '🥈', '🥉'];
                  const finishedPosition = isFinished ? finishedEntries.findIndex(e => e.id === entry.id) + 1 : null;
                  
                  return (
                    <div 
                      key={entry.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 rounded-lg transition-all duration-200 ${
                        isTopThree
                        ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30'
                        : isFinished
                        ? 'bg-white/5 hover:bg-white/10'
                        : 'bg-gray-600/20 border border-gray-500/30'
                      }`}
                    >
                      {/* Top section - Rank and Team Info */}
                      <div className="flex items-center gap-2 md:gap-4 mb-2 sm:mb-0">
                        <div className={`text-lg md:text-2xl font-bold min-w-[2rem] md:min-w-[3rem] ${
                          isTopThree ? 'text-yellow-400' : 
                          isFinished ? 'text-white/70' : 'text-gray-400'
                        }`}>
                          {isTopThree ? medals[index] : 
                           isFinished ? `${finishedPosition}.` : '—'}
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <div className={`font-semibold text-base md:text-lg truncate ${
                            isFinished ? 'text-white' : 'text-gray-300'
                          }`}>
                            {entry.team_name}
                            {!isFinished && <span className="text-gray-400 text-sm ml-1">(Unfinished)</span>}
                          </div>
                          <div className={`text-xs md:text-sm ${isFinished ? 'text-white/60' : 'text-gray-400'}`}>
                            {entry.members} member{entry.members !== 1 ? 's' : ''} • 
                            {entry.skips} skip{entry.skips !== 1 ? 's' : ''}
                            {isFinished && entry.skips > 0 && (
                              <>
                                <br className="sm:hidden" />
                                <span className="text-orange-300"> (+{entry.skips * 20}min penalty)</span>
                              </>
                            )}
                          </div>
                          <div className={`text-xs ${isFinished ? 'text-white/50' : 'text-gray-500'}`}>
                            {isFinished ? `Completed ${entry.completedDate}` : `Started ${entry.completedDate}`}
                          </div>
                          {/* Show actual time if penalties were applied */}
                          {isFinished && entry.skips > 0 && (
                            <div className="text-xs text-white/50 mt-1">
                              Actual: {entry.actualTime}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Time - Better mobile placement */}
                      <div className={`font-mono font-bold text-lg md:text-xl self-end sm:self-center ${
                        isFinished ? 'text-white' : 'text-gray-400'
                      }`}>
                        {entry.time}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {leaderboard.length >= 50 && (
                <div className="text-center mt-4 md:mt-6 text-white/60 text-sm">
                  Showing up to 50 teams
                </div>
              )}
            </div>
          ) : (
            <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl md:rounded-2xl p-6 md:p-8 mb-6 md:mb-8 text-center">
              <div className="text-3xl md:text-4xl mb-4">🏁</div>
              <h3 className="text-lg md:text-xl font-semibold text-white mb-2">
                No teams yet!
              </h3>
              <p className="text-white/70 text-sm md:text-base">
                Be the first team to start this adventure.
              </p>
            </div>
          )}

          {/* Action buttons - Better mobile spacing */}
          <div className="space-y-3 md:space-y-4 px-2">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg md:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl">
              <BackButton />
            </div>
            
            <Link
              href="/locations"
              className="block w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-3 md:py-4 px-4 md:px-6 rounded-lg md:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-sm md:text-base"
            >
              🏠 Return to Riddle City
            </Link>
            
            <Link
              href={`/${cityName.toLowerCase()}`}
              className="block w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 md:py-4 px-4 md:px-6 rounded-lg md:rounded-xl transition-all duration-200 border border-white/20 hover:border-white/30 text-sm md:text-base"
            >
              🔄 Try Another Adventure
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}