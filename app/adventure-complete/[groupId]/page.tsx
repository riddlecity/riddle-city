// app/adventure-complete/[groupId]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function AdventureCompletePage({ params }: Props) {
  const { groupId } = await params;
  const cookieStore = await cookies();
  const supabase = await createClient(); // Added await here

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

  // Calculate completion time with skip penalty
  const startTime = new Date(group.created_at);
  const endTime = group.completed_at ? new Date(group.completed_at) : new Date();
  const actualTimeMs = endTime.getTime() - startTime.getTime();
  
  const skipsUsed = group.riddles_skipped || 0;
  const skipPenaltyMs = skipsUsed * 20 * 60 * 1000; // 20 minutes per skip
  const totalTimeMs = actualTimeMs + skipPenaltyMs;
  
  const totalMinutes = Math.floor(totalTimeMs / (1000 * 60));
  const totalSeconds = Math.floor((totalTimeMs % (1000 * 60)) / 1000);
  const formattedTime = `${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;

  // Also calculate actual time without penalty for display
  const actualMinutes = Math.floor(actualTimeMs / (1000 * 60));
  const actualSecondsOnly = Math.floor((actualTimeMs % (1000 * 60)) / 1000);
  const actualTimeFormatted = `${actualMinutes}:${actualSecondsOnly.toString().padStart(2, '0')}`;

  // Get track info to show adventure type
  const trackParts = group.track_id?.split('_') || [];
  const adventureType = trackParts[0] === 'date' ? 'Date Day Adventure' : 'Adventure';
  const cityName = trackParts[1] ? trackParts[1].charAt(0).toUpperCase() + trackParts[1].slice(1) : 'Unknown';

  const memberCount = group.group_members?.length || 0;

  // Create fun WhatsApp share message
  const funMessages = [
    `🎯 Just solved all the mysteries in Riddle City ${cityName}! We completed the ${adventureType} in ${formattedTime}${skipsUsed > 0 ? ` (okay, we might have needed ${skipsUsed} hint${skipsUsed > 1 ? 's' : ''} 😅)` : ' without any help! 💪'}. Think you and your squad can crack the codes? 🕵️‍♀️`,
    `🧩 MISSION ACCOMPLISHED! We just escaped Riddle City ${cityName} in ${formattedTime}! The ${adventureType} was epic${skipsUsed > 0 ? ` (we used ${skipsUsed} skip${skipsUsed > 1 ? 's' : ''} but who's counting? 😏)` : ' and we smashed it! 🔥'}. Your turn to solve the mystery! 🔍`,
    `🏆 Plot twist: WE WON! Just finished the ultimate ${adventureType} challenge in Riddle City ${cityName}! Took us ${formattedTime}${skipsUsed > 0 ? ` with ${skipsUsed} strategic skip${skipsUsed > 1 ? 's' : ''} 🎭` : ' of pure brain power! 🧠'}. Ready for your adventure? 🗺️`
  ];
  
  const randomMessage = funMessages[Math.floor(Math.random() * funMessages.length)];
  const shareMessage = `${randomMessage} ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/riddlecity/${cityName.toLowerCase()}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  // Get leaderboard data for this track
  const { data: leaderboardData } = await supabase
    .from("groups")
    .select("team_name, created_at, completed_at, riddles_skipped, group_members(user_id)")
    .eq("track_id", group.track_id)
    .eq("finished", true)
    .not("team_name", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);

  // Calculate times for leaderboard with skip penalties
  const leaderboard = leaderboardData?.map(entry => {
    const startTime = new Date(entry.created_at);
    const endTime = new Date(entry.completed_at || new Date());
    const actualTimeMs = endTime.getTime() - startTime.getTime();
    const skipPenaltyMs = (entry.riddles_skipped || 0) * 20 * 60 * 1000;
    const totalTimeMs = actualTimeMs + skipPenaltyMs;
    
    const minutes = Math.floor(totalTimeMs / (1000 * 60));
    const seconds = Math.floor((totalTimeMs % (1000 * 60)) / 1000);
    const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    return {
      team_name: entry.team_name,
      time: timeFormatted,
      totalTimeMs,
      skips: entry.riddles_skipped || 0,
      members: entry.group_members?.length || 0,
      isCurrentTeam: entry.team_name === group.team_name
    };
  }).sort((a, b) => a.totalTimeMs - b.totalTimeMs) || [];

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

      {/* Completion content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 relative z-10 max-w-4xl mx-auto">
        <div className="w-full text-center">
          {/* Celebration */}
          <div className="text-6xl md:text-8xl mb-6">🎉</div>
          
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Adventure Complete!
          </h1>
          
          <p className="text-lg md:text-xl text-white/70 mb-6">
            {group.team_name ? `Well done ${group.team_name}!` : 'Congratulations!'} You completed the {adventureType} in {cityName}!
          </p>

          {/* Stats */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-6 md:p-8 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Completion Time */}
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white mb-2">
                  ⏱️ {formattedTime}
                </div>
                <div className="text-white/60 text-sm">
                  Total Time
                  {skipsUsed > 0 && (
                    <div className="text-xs text-orange-300 mt-1">
                      (+{skipsUsed * 20}min penalty)
                    </div>
                  )}
                </div>
              </div>

              {/* Team Size */}
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white mb-2">
                  👥 {memberCount}
                </div>
                <div className="text-white/60 text-sm">
                  {memberCount === 1 ? 'Solo Explorer' : 'Team Members'}
                </div>
              </div>

              {/* Skips Used */}
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white mb-2">
                  ⏭️ {skipsUsed}
                </div>
                <div className="text-white/60 text-sm">
                  Riddle{skipsUsed !== 1 ? 's' : ''} Skipped
                </div>
              </div>

              {/* Adventure Type */}
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white mb-2">
                  💘 {adventureType === 'Date Day Adventure' ? 'Date' : '🎮 Adventure'}
                </div>
                <div className="text-white/60 text-sm">
                  Adventure Type
                </div>
              </div>
            </div>

            {/* Actual time if skips were used */}
            {skipsUsed > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10 text-center">
                <div className="text-white/70 text-sm">
                  Actual completion time: <span className="font-semibold">{actualTimeFormatted}</span>
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-6 md:p-8 mb-8">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center justify-center gap-2">
                🏆 {adventureType} Leaderboard
              </h3>
              <div className="space-y-3">
                {leaderboard.slice(0, 5).map((entry, index) => (
                  <div 
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                      entry.isCurrentTeam 
                        ? 'bg-yellow-500/20 border border-yellow-500/30' 
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`text-lg font-bold ${
                        index === 0 ? 'text-yellow-400' : 
                        index === 1 ? 'text-gray-300' : 
                        index === 2 ? 'text-orange-400' : 'text-white/70'
                      }`}>
                        {index + 1}.
                      </div>
                      <div>
                        <div className={`font-semibold ${entry.isCurrentTeam ? 'text-yellow-200' : 'text-white'}`}>
                          {entry.team_name} {entry.isCurrentTeam && '(You!)'}
                        </div>
                        <div className="text-xs text-white/60">
                          {entry.members} member{entry.members !== 1 ? 's' : ''} • {entry.skips} skip{entry.skips !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className={`font-mono font-bold ${entry.isCurrentTeam ? 'text-yellow-200' : 'text-white'}`}>
                      {entry.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-4">
            <Link
              href={`/leaderboard/${group.track_id}`}
              className="block w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🏆 View Full Leaderboard
            </Link>
            
            <Link
              href="/riddlecity"
              className="block w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🏠 Return to Riddle City
            </Link>
            
            <Link
              href={`/riddlecity/${cityName.toLowerCase()}`}
              className="block w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 border border-white/20 hover:border-white/30"
            >
              🔄 Try Another Adventure
            </Link>
          </div>

          {/* WhatsApp Share */}
          <div className="mt-8 p-4 bg-green-600/20 border border-green-500/30 rounded-lg">
            <p className="text-green-200 text-sm mb-3 text-center">
              💬 Share this epic adventure with friends!
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 text-center"
            >
              📱 Share on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}