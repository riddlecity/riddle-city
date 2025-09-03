"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useLocationHours } from "../../hooks/useLocationHours";
import { getOverallTimeWarning } from "../../lib/timeWarnings";
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
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);

  // Load location hours for time warnings IMMEDIATELY when page loads 
  const dateTrackId = `date_${locationSlug}`;
  const pubTrackId = `standard_${locationSlug}`;
  const { locations: dateLocations, loading: dateLoading } = useLocationHours(dateTrackId);
  const { locations: pubLocations, loading: pubLoading } = useLocationHours(pubTrackId);

  // TIMEOUT: If data takes longer than 10 seconds, allow user to proceed anyway
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dateLoading || pubLoading) {
        console.log('🔍 Loading timeout - allowing user to proceed without waiting');
        setLoadTimeout(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timer);
  }, [dateLoading, pubLoading]);

  // PRELOAD: Start loading both tracks immediately for faster response
  useEffect(() => {
    console.log('🔍 Preloading location hours data for faster selection');
    console.log('🔍 Date track loading:', dateLoading, 'locations:', dateLocations.length);
    console.log('🔍 Pub track loading:', pubLoading, 'locations:', pubLocations.length);
  }, [dateLoading, pubLoading, dateLocations.length, pubLocations.length]);

  useEffect(() => {
    const supabase = createClient();

    const fetchLabels = async () => {
      // For Date Day Adventure
      const { data: dateData } = await supabase
        .from("tracks")
        .select("start_label")
        .eq("id", `date_${locationSlug}`)
        .maybeSingle();
      setDateStartLabel(String(dateData?.start_label || ''));

      // For Pub Crawl
      const { data: pubData } = await supabase
        .from("tracks")
        .select("start_label")
        .eq("id", `pub_${locationSlug}`)
        .maybeSingle();
      setPubStartLabel(String(pubData?.start_label || ''));
    };

    fetchLabels();
  }, [locationSlug]);

  const handleModeSelect = (mode: string) => {
    console.log('🔍 Adventure selected:', mode);
    
    // Determine which locations to check based on mode
    const locationsToCheck = mode === 'date' ? dateLocations : pubLocations;
    const isLoading = mode === 'date' ? dateLoading : pubLoading;
    
    console.log('🔍 Checking locations for warnings:', {
      mode,
      locationsCount: locationsToCheck.length,
      isLoading,
      loadTimeout,
      locations: locationsToCheck.map(loc => ({ name: loc.name, hasHours: !!loc.opening_hours }))
    });

    // PREVENT PROCEEDING IF STILL LOADING DATA (unless timeout occurred)
    if (isLoading && !loadTimeout) {
      console.log('🔍 Still loading location data, please wait...');
      return; // Don't proceed until data is loaded or timeout
    }

    // Check time warnings before proceeding (skip if timeout occurred)
    if (locationsToCheck.length > 0 && !loadTimeout) {
      const locationsWithHours = locationsToCheck
        .filter(loc => loc.opening_hours)
        .map(loc => ({
          name: loc.name,
          hours: loc.opening_hours!,
          riddle_order: loc.order
        }));

      console.log('🔍 Locations with hours:', locationsWithHours);

      if (locationsWithHours.length > 0) {
        const timeWarning = getOverallTimeWarning(locationsWithHours);
        console.log('🔍 Time warning result:', timeWarning);
        
        if (timeWarning.shouldWarn) {
          console.log('🔍 Showing time warning modal for mode:', mode);
          setSelectedMode(mode);
          setShowTimeWarning(true);
          return; // Stop here and show warning modal
        }
      }
    } else if (loadTimeout) {
      console.log('🔍 Proceeding without time warnings due to load timeout');
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
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">
                  💘 Date Day Adventure
                  {dateLoading && !loadTimeout && <span className="ml-2 text-sm">⏳</span>}
                  {loadTimeout && <span className="ml-2 text-sm">⚡</span>}
                </div>
                <div className="text-sm font-normal text-pink-100 mt-1">
                  {dateLoading && !loadTimeout 
                    ? 'Loading location data...' 
                    : loadTimeout 
                    ? 'Ready (time warnings may not be available)'
                    : 'Perfect for couples exploring together'
                  }
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">£15</div>
                <div className="text-xs font-normal text-pink-100">
                  per person
                </div>
              </div>
            </div>

            {/* Start Point */}
            {dateStartLabel && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <span className="text-xs uppercase tracking-wide text-white/70">
                  Start Point:
                </span>{" "}
                <span className="text-sm font-semibold">{dateStartLabel}</span>
                <div className="text-xs text-white/60 mt-1">
                </div>
              </div>
            )}
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
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">
                  🍻 Pub Crawl Adventure
                  {pubLoading && <span className="ml-2 text-sm">⏳</span>}
                </div>
                <div className="text-sm font-normal text-yellow-100 mt-1">
                  {pubLoading ? 'Loading location data...' : 'Explore local pubs and bars'}
                </div>
              </div>
              <div className="text-right">
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

            {/* Starting location */}
            {pubStartLabel && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <span className="text-xs uppercase tracking-wide text-white/70">
                  Starting location:
                </span>{" "}
                <span className="text-sm font-semibold">{pubStartLabel}</span>
                <div className="text-xs text-white/60 mt-1">
                  Head to <strong>{pubStartLabel}</strong> to be ready for your
                  adventure
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
      {showTimeWarning && selectedMode && (
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
          warning={(() => {
            const locationsToCheck = selectedMode === 'date' ? dateLocations : pubLocations;
            const locationsWithHours = locationsToCheck
              .filter(loc => loc.opening_hours)
              .map(loc => ({
                name: loc.name,
                hours: loc.opening_hours!
              }));
            return getOverallTimeWarning(locationsWithHours);
          })()}
        />
      )}
    </main>
  );
}
