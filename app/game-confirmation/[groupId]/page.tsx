import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function GameConfirmationPage({ params }: Props) {
  const { groupId } = await params;
  const supabase = await createClient();

  // Get group details
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select(`
      *,
      group_members (
        user_id,
        is_leader
      ),
      tracks (
        name,
        location,
        mode
      )
    `)
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    console.error('Game confirmation - group not found:', groupError);
    notFound();
  }

  // Check if payment was successful
  if (!group.paid) {
    redirect(`/riddlecity/${group.tracks?.location || 'barnsley'}/${group.tracks?.mode || 'date'}`);
  }

  // Check if game has already started
  if (group.game_started) {
    redirect(`/riddle/${group.current_riddle_id}`);
  }

  // Calculate time remaining
  const paidAt = group.paid_at ? new Date(group.paid_at) : new Date(group.created_at);
  const expiresAt = group.expires_at ? new Date(group.expires_at) : new Date(paidAt.getTime() + (48 * 60 * 60 * 1000));
  const now = new Date();
  const timeRemaining = expiresAt.getTime() - now.getTime();
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  // Check if game has expired
  if (timeRemaining <= 0) {
    return (
      <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">⏰</div>
          <h1 className="text-2xl font-bold mb-4 text-red-400">Game Session Expired</h1>
          <p className="text-white/70 mb-6">
            This game session expired 48 hours after payment. Please purchase a new adventure to play.
          </p>
          <Link
            href="/riddlecity"
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Book New Adventure
          </Link>
        </div>
      </main>
    );
  }

  const adventureType = group.tracks?.mode === 'date' ? 'Date Day Adventure' : 'Adventure';
  const cityName = group.tracks?.location ? 
    group.tracks.location.charAt(0).toUpperCase() + group.tracks.location.slice(1) : 'Unknown';

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4 py-8">
      {/* Background logo */}
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

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 max-w-2xl mx-auto text-center">
        {/* Success celebration */}
        <div className="text-6xl md:text-8xl mb-6">🎉</div>
        
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
          Payment Successful!
        </h1>
        
        <p className="text-lg md:text-xl text-white/80 mb-8">
          Your {adventureType} in {cityName} is ready to begin
        </p>

        {/* Game details */}
        <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-6 md:p-8 mb-8 w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400 mb-2">
                {group.group_members?.length || 1}
              </div>
              <div className="text-white/60 text-sm">
                {(group.group_members?.length || 1) === 1 ? 'Player' : 'Players'}
              </div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-blue-400 mb-2">
                {hoursRemaining}h {minutesRemaining}m
              </div>
              <div className="text-white/60 text-sm">
                Time Remaining
              </div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-purple-400 mb-2">
                {group.team_name || 'Your Team'}
              </div>
              <div className="text-white/60 text-sm">
                Team Name
              </div>
            </div>
          </div>
        </div>

        {/* Important notice */}
        <div className="bg-amber-600/20 border border-amber-500/30 rounded-lg p-4 mb-8 w-full">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⏰</div>
            <div className="text-left">
              <h3 className="font-semibold text-amber-200 mb-2">Important: 48-Hour Game Window</h3>
              <p className="text-amber-200/80 text-sm">
                Your adventure must be started and completed within 48 hours of payment. 
                After this time, your game session will expire and you'll need to purchase a new adventure.
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-4 w-full max-w-md">
          <form action="/api/start-game" method="POST" className="w-full">
            <input type="hidden" name="groupId" value={groupId} />
            <button
              type="submit"
              className="block w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
            >
              🚀 Start Adventure Now
            </button>
          </form>
          
          <Link
            href={`/group-invite/${groupId}`}
            className="block w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 hover:text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 border border-blue-500/30 hover:border-blue-500/50"
          >
            📤 Share Group Link First
          </Link>
          
          <div className="text-center pt-4">
            <p className="text-white/50 text-sm">
              You can start your adventure anytime within the next {hoursRemaining} hours and {minutesRemaining} minutes
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}