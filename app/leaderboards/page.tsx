// app/leaderboards/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';

export default async function LeaderboardsPage() {
  const supabase = await createClient();
  
  // Fetch all available tracks
  const { data: tracks } = await supabase
    .from('tracks')
    .select('id, name, location, mode')
    .order('location')
    .order('mode');

  // Group tracks by location
  const tracksByLocation = tracks?.reduce((acc: any, track) => {
    if (!acc[track.location]) {
      acc[track.location] = [];
    }
    acc[track.location].push(track);
    return acc;
  }, {}) || {};

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center px-4 py-12">
      {/* Background logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <Image
          src="/riddle-city-logo2.png"
          alt=""
          width={600}
          height={600}
          className="w-[420px] h-[420px] md:w-[700px] md:h-[700px] object-contain"
        />
      </div>

      {/* Back button */}
      <div className="w-full max-w-4xl mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200"
        >
          <span>←</span>
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="w-full max-w-4xl relative z-10">
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Leaderboards
          </h1>
          <p className="text-white/70 text-lg">
            See the fastest teams in each adventure
          </p>
        </div>

        <div className="space-y-8">
          {Object.entries(tracksByLocation).map(([location, locationTracks]: [string, any]) => {
            const cityName = location.charAt(0).toUpperCase() + location.slice(1);
            
            return (
              <div key={location} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">
                  📍 {cityName}
                </h2>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  {locationTracks.map((track: any) => {
                    const adventureType = track.mode === 'date' 
                      ? 'Date Day Adventure' 
                      : track.mode === 'pub' 
                      ? 'Pub Crawl Adventure' 
                      : 'Adventure';
                    
                    const icon = track.mode === 'date' ? '💘' : track.mode === 'pub' ? '🍻' : '🎮';
                    
                    return (
                      <Link
                        key={track.id}
                        href={`/leaderboard/${track.id}`}
                        className="block bg-gradient-to-br from-purple-900/40 to-blue-900/40 hover:from-purple-800/50 hover:to-blue-800/50 border border-white/20 rounded-xl p-6 transition-all duration-200 hover:scale-105 hover:shadow-xl"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-3xl">{icon}</span>
                          <h3 className="text-lg font-semibold text-white">
                            {adventureType}
                          </h3>
                        </div>
                        <p className="text-white/60 text-sm">
                          View fastest completion times
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {Object.keys(tracksByLocation).length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/60 text-lg">
              No leaderboards available yet. Check back soon!
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
