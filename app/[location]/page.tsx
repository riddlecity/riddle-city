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

  const [dateStartLabel, setDateStartLabel] = useState<string | null>(null);
  const [pubStartLabel, setPubStartLabel] = useState<string | null>(null);
  const [dateStartTime, setDateStartTime] = useState<string | null>(null);
  const [pubStartTime, setPubStartTime] = useState<string | null>(null);
  const [dateRiddleCount, setDateRiddleCount] = useState<number>(0);
  const [pubRiddleCount, setPubRiddleCount] = useState<number>(0);
  const [trackMetadataLoading, setTrackMetadataLoading] = useState(true);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [timeWarningData, setTimeWarningData] = useState<{
    shouldWarn: boolean;
    closedCount: number;
    closingSoonCount: number;
    isBankHoliday: boolean;
    message: string;
    severity: 'high' | 'medium' | 'low';
    closingSoonDetails: Array<{ riddleNumber: string; closingTime: string; hoursLeft?: number }>;
    closedDetails: Array<{ riddleNumber: string; hoursUntilOpen?: number; opensAt?: string }>;
  } | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);

  // DEBUG: Log when component mounts
  useEffect(() => {
    console.log('🔍 [CLIENT] LocationPage component mounted for location:', locationSlug);
  }, []);

  // Load location hours for time warnings IMMEDIATELY when page loads 
  const dateTrackId = `date_${locationSlug}`;
  const pubTrackId = `standard_${locationSlug}`;
  const { locations: dateLocations, loading: dateLoading } = useLocationHours(dateTrackId);
  const { locations: pubLocations, loading: pubLoading } = useLocationHours(pubTrackId);

  // TIMEOUT: If data takes longer than 10 seconds, allow user to proceed anyway
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dateLoading || pubLoading) {
        setLoadTimeout(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timer);
  }, [dateLoading, pubLoading]);

  // PRELOAD: Start loading both tracks immediately for faster response
  useEffect(() => {
    // Preload location hours data for faster selection
  }, [dateLoading, pubLoading, dateLocations.length, pubLocations.length]);

  // OPTIMIZATION: Load track metadata immediately alongside location hours
  useEffect(() => {
    const fetchLabels = async () => {
      setTrackMetadataLoading(true);
      
      try {
        // SPEED OPTIMIZATION: Use dedicated API endpoint for faster server-side query
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
        const { dateTrack, pubTrack } = data;

        if (dateTrack) {
          setDateStartLabel(String(dateTrack.start_label || ''));
          setDateStartTime(String(dateTrack.start_time || '') || null);
          setDateRiddleCount(dateTrack.riddle_count || 0);
        }

        if (pubTrack) {
          setPubStartLabel(String(pubTrack.start_label || ''));
          setPubStartTime(String(pubTrack.start_time || '') || null);
          setPubRiddleCount(pubTrack.riddle_count || 0);
        }

      } catch (error) {
        console.error('Error loading track metadata:', error);
      } finally {
        setTrackMetadataLoading(false);
      }
    };

    fetchLabels();
  }, [locationSlug]);

  const handleModeSelect = async (mode: string) => {
    // Determine which locations to check based on mode
    const isLoading = mode === 'date' ? dateLoading : pubLoading;

    // PREVENT PROCEEDING IF STILL LOADING DATA (unless timeout occurred)
    if (isLoading && !loadTimeout) {
      return; // Don't proceed until data is loaded or timeout
    }

    // Check time warnings before proceeding (skip if timeout occurred)
    if (!loadTimeout) {
      try {
        const trackId = mode === 'date' ? dateTrackId : pubTrackId;
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
      } catch (error) {
        console.error('Error checking time warnings:', error);
        // Continue anyway if API fails
      }
    }

    // Proceed to adventure setup page
    router.push(`/${resolvedParams.location}/${mode}`);
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
        <p className="text-lg text-white/80 mb-12">Choose Your Adventure</p>

        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Date Day Adventure */}
          <button
            onClick={() => handleModeSelect("date")}
            disabled={dateLoading && !loadTimeout}
            className={`w-full ${
              dateLoading && !loadTimeout
                ? 'bg-gray-600/50 cursor-wait opacity-70' 
                : 'bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 cursor-pointer'
            } text-white font-semibold py-6 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 group text-left`}
          >
            {/* Header row with title and price */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="text-lg font-bold flex items-center gap-2 mb-2">
                  💘 Date Day Adventure
                  {dateLoading && !loadTimeout && <span className="text-sm">⏳</span>}
                  {loadTimeout && <span className="text-sm">⚡</span>}
                </div>
                {dateRiddleCount > 0 && !dateLoading && (
                  <div className="bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-bold inline-block">
                    {dateRiddleCount} Riddles
                  </div>
                )}
              </div>
              <div className="text-right ml-4">
                <div className="text-xl font-bold">£15</div>
                <div className="text-xs font-normal text-pink-100">
                  per person
                </div>
              </div>
            </div>
            
            {/* Description */}
            <div className="text-sm font-normal text-pink-100">
              {dateLoading && !loadTimeout 
                ? 'Loading location data...' 
                : loadTimeout 
                ? 'Ready (time warnings may not be available)'
                : 'Perfect for couples exploring together'
              }
            </div>

            {/* Start Point */}
            <div className="mt-3 pt-3 border-t border-white/20">
              <span className="text-xs uppercase tracking-wide text-white/70">
                Start Point:
              </span>{" "}
              <span className="text-sm font-semibold">
                {trackMetadataLoading 
                  ? 'Loading...' 
                  : dateStartLabel 
                  ? dateStartLabel 
                  : 'Not configured'
                }
              </span>
              {dateStartTime && !trackMetadataLoading && (
                <div className="mt-2">
                  <span className="text-xs uppercase tracking-wide text-white/70">
                    Recommended Start Time:
                  </span>{" "}
                  <span className="text-sm font-semibold">{dateStartTime}</span>
                </div>
              )}
              <div className="text-xs text-white/60 mt-1">
              </div>
            </div>
          </button>

          {/* Pub Crawl Adventure */}
          <div
            className={`w-full ${
              pubStartLabel && !pubLoading
                ? "bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 cursor-pointer"
                : pubLoading
                ? "bg-gray-600/50 cursor-wait opacity-70"
                : "bg-gray-600/30 cursor-not-allowed"
            } text-white font-semibold py-6 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-left`}
            onClick={() =>
              pubStartLabel && !pubLoading ? handleModeSelect("standard") : null
            }
          >
            {/* Header row with title and price */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="text-lg font-bold flex items-center gap-2 mb-2">
                  🍻 Pub Crawl Adventure
                  {pubLoading && <span className="text-sm">⏳</span>}
                </div>
                {pubRiddleCount > 0 && !pubLoading && (
                  <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold inline-block">
                    {pubRiddleCount} Riddles
                  </div>
                )}
              </div>
              <div className="text-right ml-4">
                {pubStartLabel && !pubLoading ? (
                  <>
                    <div className="text-xl font-bold">£20</div>
                    <div className="text-xs font-normal text-yellow-100">
                      per person
                    </div>
                  </>
                ) : pubLoading ? (
                  <div className="text-lg font-bold text-gray-300">
                    Loading...
                  </div>
                ) : (
                  <div className="text-lg font-bold text-gray-500">
                    Coming Soon
                  </div>
                )}
              </div>
            </div>
            
            {/* Description */}
            <div className="text-sm font-normal text-yellow-100">
              {pubLoading ? 'Loading location data...' : 'Explore local pubs and bars'}
            </div>

            {/* Starting location */}
            {(pubStartLabel || trackMetadataLoading) && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <span className="text-xs uppercase tracking-wide text-white/70">
                  Starting location:
                </span>{" "}
                <span className="text-sm font-semibold">
                  {trackMetadataLoading ? 'Loading...' : pubStartLabel}
                </span>
                {pubStartTime && !trackMetadataLoading && (
                  <div className="mt-2">
                    <span className="text-xs uppercase tracking-wide text-white/70">
                      Recommended Start Time:
                    </span>{" "}
                    <span className="text-sm font-semibold text-yellow-200">{pubStartTime}</span>
                  </div>
                )}
                <div className="text-xs text-white/60 mt-1">
                  {!trackMetadataLoading && pubStartLabel && (
                    <>Head to <strong>{pubStartLabel}</strong> to be ready for your adventure</>
                  )}
                </div>
              </div>
            )}
          </div>
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
