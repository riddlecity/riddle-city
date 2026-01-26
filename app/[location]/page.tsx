"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocationHours } from "../../hooks/useLocationHours";
// TODO: Re-implement with new database system
// import { getOverallTimeWarning } from "../../lib/timeWarnings";
import TimeWarningModal from "../../components/TimeWarningModal";

interface Props {
  params: Promise<{ location: string }>;
}

export default function LocationPage({ params }: Props) {
  const resolvedParams = use(params);
  const router = useRouter();
  const locationSlug = resolvedParams.location; // e.g. "barnsley"
  const location =
    locationSlug.charAt(0).toUpperCase() + locationSlug.slice(1);

  const [tracks, setTracks] = useState<Array<{
    id: string;
    name: string;
    start_label: string | null;
    start_time: string | null;
    mode: string;
    color: string;
    riddle_count: number;
  }>>([]);
  const [trackMetadataLoading, setTrackMetadataLoading] = useState(true);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [timeWarningData, setTimeWarningData] = useState<{
    shouldWarn: boolean;
    closedCount: number;
    closingSoonCount: number;
    openingSoonCount: number;
    isBankHoliday: boolean;
    message: string;
    severity: 'high' | 'medium' | 'low';
    closingSoonDetails: Array<{ riddleNumber: string; closingTime: string; hoursLeft?: number }>;
    closedDetails: Array<{ riddleNumber: string; hoursUntilOpen?: number; opensAt?: string; closedToday?: boolean }>;
    openingSoonDetails: Array<{ riddleNumber: string; opensAt: string; hoursUntilOpen?: number }>;
  } | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);

  // DEBUG: Log when component mounts
  useEffect(() => {
    console.log('🔍 [CLIENT] LocationPage component mounted for location:', locationSlug);
  }, [locationSlug]);

  // Load location hours for time warnings - we'll check per track when user clicks
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const { locations, loading: locationsLoading } = useLocationHours(selectedTrackId || '');

  // TIMEOUT: If data takes longer than 10 seconds, allow user to proceed anyway
  useEffect(() => {
    const timer = setTimeout(() => {
      if (locationsLoading) {
        setLoadTimeout(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timer);
  }, [locationsLoading]);

  // PRELOAD: Start loading both tracks immediately for faster response
  useEffect(() => {
    // Preload location hours data for faster selection
  }, [locationsLoading, locations.length]);

  // OPTIMIZATION: Load track metadata immediately alongside location hours
  useEffect(() => {
    const fetchLabels = async () => {
      setTrackMetadataLoading(true);
      
      try {
        // SPEED OPTIMIZATION: Use dedicated API endpoint for faster server-side query
        console.log('🔍 Fetching tracks for location:', locationSlug);
        const response = await fetch(`/api/tracks/${locationSlug}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          console.error('Failed to fetch track metadata:', response.status);
          setTrackMetadataLoading(false);
          return;
        }

        const data = await response.json();
        console.log('🔍 API Response:', data);
        const { tracks: fetchedTracks } = data;
        console.log('🔍 Fetched tracks:', fetchedTracks);

        setTracks(fetchedTracks || []);
        console.log('🔍 Tracks set in state');

      } catch (error) {
        console.error('Error loading track metadata:', error);
      } finally {
        setTrackMetadataLoading(false);
      }
    };

    fetchLabels();
  }, [locationSlug]);

  const handleModeSelect = async (trackId: string, mode: string) => {
    console.log("🎯 Mode selected:", mode, "trackId:", trackId);
    
    // Set the selected track ID for location hours hook
    setSelectedTrackId(trackId);

    const isLoading = trackMetadataLoading || locationsLoading;

    // PREVENT PROCEEDING IF STILL LOADING DATA (unless timeout occurred)
    if (isLoading && !loadTimeout) {
      return; // Don't proceed until data is loaded or timeout
    }

    // Check time warnings before proceeding (skip if timeout occurred)
    if (!loadTimeout) {
      try {
        if (!trackId) {
          console.warn('No track ID available, skipping time warning check');
        } else {
          const response = await fetch(`/api/track-warnings?trackId=${trackId}`);
        
          if (response.ok) {
            const timeWarning = await response.json();
            
            if (timeWarning.shouldWarn) {
              setSelectedMode(mode);
              setTimeWarningData(timeWarning);
              setShowTimeWarning(true);
              return; // Stop here and show warning modal
            }
          }
        }
      } catch (error) {
        console.error('Error checking time warnings:', error);
        // Continue anyway if API fails
      }
    }

    // Proceed to adventure setup page - mode now directly matches URL
    router.push(`/${resolvedParams.location}/${mode}`);
  };

  // Helper to get color classes
  const getColorClasses = (color: string, hasStartLabel: boolean) => {
    if (!hasStartLabel) {
      return 'bg-gray-600/30 cursor-not-allowed';
    }
    
    const colorMap: Record<string, string> = {
      pink: 'bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 cursor-pointer',
      yellow: 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 cursor-pointer',
      blue: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 cursor-pointer',
      green: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 cursor-pointer',
      purple: 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 cursor-pointer',
    };
    
    return colorMap[color] || colorMap['pink'];
  };

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4 py-16 relative">
      {/* Logo */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
        <Link href="/">
          <Image
            src="/riddle-city-logo.png"
            alt="Riddle City Logo"
            width={60}
            height={60}
            className="md:w-[80px] md:h-[80px] drop-shadow-lg hover:scale-105 transition-transform duration-200"
            priority
          />
        </Link>
      </div>

      {/* Back link */}
      <div className="absolute top-6 right-6">
        <Link
          href="/locations"
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium"
        >
          <span className="text-lg">←</span>
          <span className="hidden sm:inline">Back to Cities</span>
          <span className="sm:hidden">Back</span>
        </Link>
      </div>

      {/* Main content */}
      <div className="w-full text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 text-center tracking-tight leading-tight">
          Riddle City {location}
        </h1>
        <p className="text-lg text-white/80 mb-2">Choose Your Adventure</p>
        {tracks.length > 0 && !trackMetadataLoading && (
          <p className="text-sm text-white/70 mb-2">
            {tracks.length} {tracks.length === 1 ? 'route' : 'routes'} available
          </p>
        )}
        <p className="text-sm text-white/60 mb-12">📍 Head to your start point before you begin!</p>

        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Dynamic Track Display */}
          {tracks.length === 0 && !trackMetadataLoading && (
            <div className="text-white/60 text-center py-8">
              No adventures available yet for this location.
            </div>
          )}
          
          {tracks.map((track) => {
            console.log('🎨 Rendering track:', track);
            const hasStartLabel = !!track.start_label;
            const colorClasses = getColorClasses(track.color || (track.mode === 'date' ? 'pink' : 'yellow'), hasStartLabel);
            
            // Determine colors based on track color
            const badgeColor = track.color === 'pink' ? 'bg-pink-500' : 
                              track.color === 'yellow' ? 'bg-yellow-500 text-black' :
                              track.color === 'blue' ? 'bg-blue-500' :
                              track.color === 'green' ? 'bg-green-500' :
                              track.color === 'purple' ? 'bg-purple-500' :
                              'bg-pink-500';
            
            const textAccent = track.color === 'pink' ? 'text-pink-100' :
                             track.color === 'yellow' ? 'text-yellow-100' :
                             track.color === 'blue' ? 'text-blue-100' :
                             track.color === 'green' ? 'text-green-100' :
                             track.color === 'purple' ? 'text-purple-100' :
                             'text-pink-100';
            
            const description = track.mode === 'date' 
              ? 'Perfect for couples on a romantic adventure'
              : 'Explore local pubs and bars';
            
            return (
              <button
                key={track.id}
                onClick={() => hasStartLabel ? handleModeSelect(track.id, track.mode) : null}
                disabled={!hasStartLabel}
                className={`w-full ${colorClasses} text-white font-semibold py-6 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 group text-left`}
              >
                {/* Header row with title and price */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="text-lg font-bold flex items-center gap-2 mb-2">
                      {track.name || (track.mode === 'date' ? '💘 Date Day Adventure' : '🍻 Pub Crawl Adventure')}
                      {trackMetadataLoading && !loadTimeout && <span className="text-sm">⏳</span>}
                      {loadTimeout && <span className="text-sm">⚡</span>}
                    </div>
                    {track.riddle_count > 0 && !trackMetadataLoading && (
                      <div className={`${badgeColor} text-white px-3 py-1 rounded-full text-sm font-bold inline-block`}>
                        {track.riddle_count} Riddles
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    {hasStartLabel ? (
                      <>
                        <div className="text-xl font-bold">£12.99</div>
                        <div className={`text-xs font-normal ${textAccent}`}>
                          per person
                        </div>
                      </>
                    ) : (
                      <div className="text-lg font-bold text-gray-500">
                        Coming Soon
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Description */}
                <div className={`text-sm font-normal ${textAccent}`}>
                  {hasStartLabel ? description : 'Coming soon to this location'}
                </div>

                {/* Start Point */}
                {hasStartLabel && (
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <span className="text-xs uppercase tracking-wide text-white/70">
                      Start Point:
                    </span>{" "}
                    <span className="text-sm font-semibold">
                      {trackMetadataLoading ? 'Loading...' : track.start_label}
                    </span>
                    {track.start_time && (
                      <div className="mt-2">
                        <span className="text-xs uppercase tracking-wide text-white/70">
                          Recommended Start Time:
                        </span>{" "}
                        <span className={`text-sm font-semibold ${textAccent}`}>
                          {track.start_time}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Extra info */}
        <div className="mt-8 text-center text-white/60 text-sm max-w-lg mx-auto">
          <p>
            🎯 Solve riddles, scan QR codes, and explore {location} in a whole
            new way!
          </p>
        </div>
      </div>

      {/* Time Warning Modal */}
      {showTimeWarning && selectedMode && timeWarningData && (
        <TimeWarningModal
          isOpen={showTimeWarning}
          onClose={() => {
            setShowTimeWarning(false);
            setSelectedMode(null);
          }}
          onContinue={() => {
            setShowTimeWarning(false);
            router.push(`/${resolvedParams.location}/${selectedMode}`);
            setSelectedMode(null);
          }}
          warning={timeWarningData}
        />
      )}
    </main>
  );
}
