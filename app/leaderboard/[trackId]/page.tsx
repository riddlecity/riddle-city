// app/leaderboard/[trackId]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";

interface Props {
  params: Promise<{ trackId: string }>;
}

export default async function LeaderboardPage({ params }: Props) {
  const { trackId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient();

  // Get track info to show what leaderboard this is for
  const { data: track, error: trackError } = await supabase
    .from("tracks")
    .select("name, location, mode")
    .eq("id", trackId)
    .single();

  if (trackError || !track) {
    notFound();
  }

  // Get current user's group ID from cookies to highlight their entry
  const currentGroupId = cookieStore.get("group_id")?.value;

  // Get leaderboard data for this track
  const { data: leaderboardData } = await supabase
    .from("groups")
    .select(`
      id,
      team_name, 
      created_at, 
      riddles_skipped,
      group_members(user_id)
    `)
    .eq("track_id", trackId)
    .eq("finished", true)
    .not("team_name", "is", null)
    .order("created_at", { ascending: false })
    .limit(50); // Show top 50 teams

  // Calculate times for leaderboard with skip penalties
  const leaderboard = leaderboardData?.map(entry => {
    // For finished groups, we need to calculate completion time
    // Since we don't have completed_at, we'll estimate based on average completion time per riddle
    const startTime = new Date(entry.created_at);
    
    // Get total riddles for this track to estimate completion time
    // For now, we'll use a base completion time estimate
    const baseCompletionMinutes = 45; // Estimate 45 minutes for completing all riddles
    const estimatedCompletionTime = new Date(startTime.getTime() + (baseCompletionMinutes * 60 * 1000));
    
    const actualTimeMs = estimatedCompletionTime.getTime() - startTime.getTime();
    const skipPenaltyMs = (entry.riddles_skipped || 0) * 20 * 60 * 1000; // 20 min per skip
    const totalTimeMs = actualTimeMs + skipPenaltyMs;
    
    const minutes = Math.floor(totalTimeMs / (1000 * 60));
    const seconds = Math.floor((totalTimeMs % (1000 * 60)) / 1000);
    const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    return {
      id: entry.id,
      team_name: entry.team_name,
      time: timeFormatted,
      totalTimeMs,
      skips: entry.riddles_skipped || 0,
      members: entry.group_members?.length || 0,
      isCurrentTeam: entry.id === currentGroupId,
      completedDate: new Date(entry.created_at).toLocaleDateString()
    };
  }).sort((a, b) => a.totalTimeMs - b.totalTimeMs) || [];

  // Parse track info for display
  const adventureType = track.mode === 'date' ? 'Date Day Adventure' : 'Adventure';
  const cityName = track.location.charAt(0).toUpperCase() + track.location.slice(1);

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col px-4 py-8 relative overflow-hidden">
      {/* Background maze logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <Image
          src="/riddle-city-logo2.png"
          alt=""
          width={600}
          height={600}
          className="w-[500px] h-[500px] md:w-[700px] md:h-[700px] object-contain"
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

      {/* Back button */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
        <Link
          href="/riddlecity"
          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 hover:border-white/30 rounded-lg px-4 py-2 text-white/70 hover:text-white transition-all duration-200 text-sm"
        >
          ← Back to Riddle City
        </Link>
      </div>

      {/* Leaderboard content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 relative z-10 max-w-4xl mx-auto pt-20">
        <div className="w-full text-center">
          {/* Header */}
          <div className="text-4xl md:text-6xl mb-4">🏆</div>
          
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 leading-tight">
            Leaderboard
          </h1>
          
          <p className="text-lg md:text-xl text-white/70 mb-8">
            {adventureType} - {cityName}
          </p>

          {/* Leaderboard */}
          {leaderboard.length > 0 ? (
            <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-6 md:p-8 mb-8">
              <div className="space-y-3">
                {leaderboard.map((entry, index) => {
                  const isTopThree = index < 3;
                  const medals = ['🥇', '🥈', '🥉'];
                  
                  return (
                    <div 
                      key={entry.id}
                      className={`flex items-center justify-between p-4 rounded-lg transition-all duration-200 ${
                        entry.isCurrentTeam 
                          ? 'bg-yellow-500/20 border border-yellow-500/30 scale-[1.02]' 
                          : isTopThree
                          ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-bold min-w-[3rem] ${
                          isTopThree ? 'text-yellow-400' : 'text-white/70'
                        }`}>
                          {isTopThree ? medals[index] : `${index + 1}.`}
                        </div>
                        <div className="text-left">
                          <div className={`font-semibold text-lg ${
                            entry.isCurrentTeam ? 'text-yellow-200' : 'text-white'
                          }`}>
                            {entry.team_name} {entry.isCurrentTeam && '(You!)'}
                          </div>
                          <div className="text-sm text-white/60">
                            {entry.members} member{entry.members !== 1 ? 's' : ''} • 
                            {entry.skips} skip{entry.skips !== 1 ? 's' : ''} • 
                            Completed {entry.completedDate}
                          </div>
                        </div>
                      </div>
                      <div className={`font-mono font-bold text-xl ${
                        entry.isCurrentTeam ? 'text-yellow-200' : 'text-white'
                      }`}>
                        {entry.time}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {leaderboard.length >= 50 && (
                <div className="text-center mt-6 text-white/60 text-sm">
                  Showing top 50 teams
                </div>
              )}
            </div>
          ) : (
            <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-8 text-center">
              <div className="text-4xl mb-4">🏁</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No completed adventures yet!
              </h3>
              <p className="text-white/70">
                Be the first team to complete this adventure and claim the top spot.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-4">
            <Link
              href={`/riddlecity/${cityName.toLowerCase()}`}
              className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🎮 Play This Adventure
            </Link>
            
            <Link
              href="/riddlecity"
              className="block w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 border border-white/20 hover:border-white/30"
            >
              🏠 Back to Riddle City
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}