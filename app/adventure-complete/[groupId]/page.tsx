// app/adventure-complete/[groupId]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
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
          console.log('🧹 ADVENTURE COMPLETE: Cleared user session cookies');
        `,
      }}
    />
  );
}

export default async function AdventureCompletePage({ params }: Props) {
  const { groupId } = await params;
  const cookieStore = await cookies();
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
    console.error('Adventure complete page - group not found:', groupError);
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
      console.log('🔒 ADVENTURE COMPLETE: Auto-closing group after 15 minutes');
      
      try {
        await supabase
          .from('groups')
          .update({ 
            active: false,
            closed_at: now.toISOString()
          })
          .eq('id', groupId);
          
        console.log('✅ ADVENTURE COMPLETE: Group marked as inactive');
      } catch (error) {
        console.error('❌ ADVENTURE COMPLETE: Failed to close group:', error);
      }
    }
  }

  console.log('Adventure complete - group data:', {
    finished: group.finished,
    completed_at: group.completed_at,
    created_at: group.created_at,
    riddles_skipped: group.riddles_skipped,
    active: group.active
  });

  // Calculate completion time with skip penalty
  const startTime = new Date(group.created_at);
  let endTime: Date;
  let timeCalculationNote = '';

  if (group.completed_at) {
    // Use stored completion time
    endTime = new Date(group.completed_at);
    timeCalculationNote = 'Final completion time';
    console.log('Using stored completion time:', group.completed_at);
  } else {
    // Group finished but no completion time stored - mark it now and use current time
    const now = new Date();
    endTime = now;
    timeCalculationNote = 'Completion time (calculated now)';
    console.log('No completion time stored, using current time');
    
    // Update the group with completion timestamp
    try {
      const { error: updateError } = await supabase
        .from('groups')
        .update({ 
          completed_at: now.toISOString(),
          finished: true 
        })
        .eq('id', groupId);
        
      if (updateError) {
        console.error('Failed to update completion time:', updateError);
      } else {
        console.log('Updated group with completion timestamp');
      }
    } catch (error) {
      console.error('Error updating completion time:', error);
    }
  }

  const actualTimeMs = endTime.getTime() - startTime.getTime();
  const skipsUsed = group.riddles_skipped || 0;
  const skipPenaltyMs = skipsUsed * 20 * 60 * 1000; // 20 minutes per skip
  const totalTimeMs = actualTimeMs + skipPenaltyMs;

  // Format times properly
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

  const formattedTime = formatTime(totalTimeMs);
  const actualTimeFormatted = formatTime(actualTimeMs);

  console.log('Time calculations:', {
    actualTimeMs,
    skipPenaltyMs,
    totalTimeMs,
    formattedTime,
    actualTimeFormatted
  });

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
    .not("completed_at", "is", null) // Only include groups with completion times
    .order("created_at", { ascending: false })
    .limit(20); // Get more entries for better leaderboard

  // Calculate times for leaderboard with skip penalties
  const leaderboard = leaderboardData?.map(entry => {
    if (!entry.completed_at) return null; // Skip entries without completion time
    
    const startTime = new Date(entry.created_at);
    const endTime = new Date(entry.completed_at);
    const actualTimeMs = endTime.getTime() - startTime.getTime();
    const skipPenaltyMs = (entry.riddles_skipped || 0) * 20 * 60 * 1000;
    const totalTimeMs = actualTimeMs + skipPenaltyMs;
    
    return {
      team_name: entry.team_name,
      time: formatTime(totalTimeMs),
      totalTimeMs,
      skips: entry.riddles_skipped || 0,
      members: entry.group_members?.length || 0,
      isCurrentTeam: entry.team_name === group.team_name
    };
  })
  .filter(entry => entry !== null) // Remove null entries
  .sort((a, b) => a!.totalTimeMs - b!.totalTimeMs) || [];

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col px-4 py-8 relative overflow-hidden">
      {/* Clear cookies when page loads */}
      <CookieCleaner />
      
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
          
          {/* Show session cleanup notice */}
          <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3 mb-6">
            <p className="text-blue-200 text-sm">
              🧹 Your session has been cleared! You can now start a new adventure.
            </p>
          </div>
          
          <p className="text-lg md:text-xl text-white/70 mb-6">
            {group.team_name ? `Well done ${group.team_name}!` : 'Congratulations!'} You completed the {adventureType} in {cityName}!
          </p>

          {/* Stats */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-6 md:p-8 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Final Completion Time */}
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white mb-2">
                  ⏱️ {formattedTime}
                </div>
                <div className="text-white/60 text-sm">
                  {timeCalculationNote}
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
                  {adventureType === 'Date Day Adventure' ? '💘' : '🎮'}
                </div>
                <div className="text-white/60 text-sm">
                  {adventureType === 'Date Day Adventure' ? 'Date Day' : 'Adventure'}
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
                🏆 {adventureType} Leaderboard - {cityName}
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
              {leaderboard.length > 5 && (
                <div className="mt-4 text-center">
                  <Link
                    href={`/leaderboard/${group.track_id}?from_group=${groupId}`}
                    className="text-white/60 hover:text-white/80 text-sm underline"
                  >
                    View all {leaderboard.length} teams →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-4">
            <Link
              href="/riddlecity"
              className="block w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🚀 Start New Adventure
            </Link>
            
            <Link
              href={`/leaderboard/${group.track_id}`}
              className="block w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🏆 View Full Leaderboard
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

          {/* Debug info for development */}
          <details className="mt-6 text-left">
            <summary className="text-white/40 text-xs cursor-pointer">Debug Info</summary>
            <div className="mt-2 text-xs text-white/30 bg-black/20 rounded p-3 font-mono">
              <div>Group ID: {groupId}</div>
              <div>Finished: {group.finished ? 'Yes' : 'No'}</div>
              <div>Completed At: {group.completed_at || 'Not set'}</div>
              <div>Riddles Skipped: {skipsUsed}</div>
              <div>Time Calculation: {timeCalculationNote}</div>
            </div>
          </details>
        </div>
      </div>
    </main>
  );
}