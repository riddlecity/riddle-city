"use client";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocationHours } from "../../../hooks/useLocationHours";
// TODO: Re-implement with new database system
// import { getOverallTimeWarning } from "../../../lib/timeWarnings";
import TimeWarningModal from "../../../components/TimeWarningModal";

export default function PreferencesPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const location = (params?.location as string) || "unknown";
  const mode = (params?.mode as string) || "unknown";
  const trackId = `${mode}_${location}`; // e.g., "date_barnsley"
  
  const [players, setPlayers] = useState(2);
  const [teamName, setTeamName] = useState("");
  const [emails, setEmails] = useState<string[]>(["", ""]);
  const [loading, setLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showEmails, setShowEmails] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
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
  
  // Load location hours for time warnings
  const { locations, loading: locationsLoading } = useLocationHours(trackId);
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debug: Log locations data
  useEffect(() => {
    console.log('🔍 Debug locations:', { trackId, locations, locationsLoading });
  }, [trackId, locations, locationsLoading]);

  // Function to capitalize first letter
  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Content filtering for team names - only the most offensive terms
  const offensiveWords = [
    // Major swear words only
    'fuck', 'fucking', 'fucked', 'fucker', 'shit', 'shitting', 'bitch', 'bitches', 
    'bastard', 'bastards', 'cocksucker', 'motherfucker', 'cunt', 'cunts',
    // Hateful/discriminatory terms
    'hitler', 'nazi', 'nazis', 'nigger', 'nigga', 'faggot', 'faggots',
    // Most explicit sexual terms
    'pussy', 'cock', 'dick', 'porn', 'pornhub',
    // Common substitutions for major swears
    'f*ck', 'sh*t', 'b*tch', 'f**k', 's**t', 'fck', 'sht'
  ];

  const containsOffensiveContent = (text: string): boolean => {
    const lowerText = text.toLowerCase().replace(/[^a-z0-9\s]/g, ''); // Keep spaces for word boundary checking
    
    return offensiveWords.some(word => {
      // Use word boundaries to match whole words only
      const wordRegex = new RegExp(`\\b${word.replace(/[^a-z0-9]/g, '')}\\b`, 'i');
      return wordRegex.test(lowerText);
    });
  };

  const handleTeamNameChange = (value: string, isRandomSuggestion = false) => {
    setTeamName(value);
    
    // Clear any existing timeout when setting a new name
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = null;
    }
    
    // If this is a random suggestion, we know it's clean - skip all checks
    if (isRandomSuggestion) {
      setDuplicateWarning(null);
      return;
    }
    
    // Only check for offensive content if it's NOT a random suggestion
    if (value.trim() && containsOffensiveContent(value)) {
      setDuplicateWarning("Please choose a family-friendly team name");
      
      // Set timeout to clear the offensive name
      clearTimeoutRef.current = setTimeout(() => {
        setTeamName('');
        setDuplicateWarning(null);
        clearTimeoutRef.current = null;
      }, 2500);
    } else {
      setDuplicateWarning(null);
    }
  };

  // Expanded team name suggestions - all family-friendly and filter-safe
  const teamSuggestions = [
    'Mystery Masters', 'The Puzzle Squad', 'Riddle Runners', 'Code Crackers',
    'Date Detectives', 'Adventure Squad', 'The Explorers', 'Barnsley Bunch',
    'Riddle Rebels', 'Mystery Makers', 'Puzzle Partners', 'The Think Tank',
    'Dream Team', 'The Sleuths', 'Quest Squad', 'Brain Trust',
    'Clue Crew', 'The Masterminds', 'Secret Solvers', 'Enigma Engineers',
    'Detective Duo', 'Puzzle Pirates', 'The Riddlers', 'Mystery Machine',
    'Code Breakers', 'The Hunters', 'Adventure Angels', 'Treasure Trackers',
    'The Investigators', 'Riddle Raiders', 'Mystery Maniacs', 'Puzzle Pros',
    'The Deciphers', 'Clue Crushers', 'Adventure Addicts', 'The Seekers',
    'Mystery Mavericks', 'Puzzle Panthers', 'The Challengers', 'Quest Queens',
    'Riddle Rockstars', 'The Game Changers', 'Mystery Ninjas', 'Puzzle Wizards',
    'The Escape Artists', 'Adventure Alliance', 'Mystery Squad', 'The Solvers',
    // Additional creative suggestions
    'Cipher Champions', 'Riddle Royalty', 'The Brain Squad', 'Puzzle Pioneers',
    'Mystery Moguls', 'Clue Collectors', 'The Enigma Elite', 'Adventure Aces',
    'Riddle Rangers', 'Puzzle Powerhouse', 'The Code Crushers', 'Mystery Mavens',
    'Quest Crusaders', 'The Puzzle Patrol', 'Riddle Revolution', 'Mystery Misfits',
    'The Logic League', 'Puzzle Perfection', 'Riddle Racers', 'The Brain Brigade',
    'Mystery Masters United', 'Puzzle Palace', 'The Riddle Realm', 'Code Command',
    'Adventure Architects', 'The Puzzle Pursuit', 'Riddle Republic', 'Mystery Matrix',
    'Quest Quartet', 'The Puzzle Pack', 'Riddle Rush', 'Adventure Assembly',
    'The Mystery Machine 2.0', 'Puzzle Paradise', 'Riddle Renaissance', 'Code Collective',
    'The Brain Bunch', 'Mystery Momentum', 'Puzzle Phenomena', 'Riddle Rampage',
    'The Quest Crew', 'Adventure Academy', 'Mystery Mayhem', 'Puzzle Pursuit Force',
    'Riddle Riot Squad', 'The Code Commandos', 'Mystery Mirage', 'Puzzle Power Rangers',
    'Riddle Resistance', 'The Brain Busters', 'Adventure Avengers', 'Mystery Moon Squad',
    'Puzzle Prodigies', 'Riddle Renegades', 'The Code Conjurers', 'Mystery Magnets',
    'Puzzle Phantoms', 'Riddle Rebels United', 'The Logic Lords', 'Adventure Assassins',
    'Mystery Mechanics', 'Puzzle Predators', 'Riddle Revolutionaries', 'The Code Craft',
    'Adventure Arsenal', 'Mystery Militia', 'Puzzle Pioneers Plus', 'Riddle Regiment',
    // Extra creative additions
    'The Puzzle Pros', 'Mystery Legends', 'Code Creators', 'Adventure Champions',
    'Riddle Experts', 'The Mystery Crew', 'Puzzle Legends', 'Code Warriors',
    'Adventure Experts', 'Mystery Pros', 'Riddle Champions', 'The Code Masters',
    'Puzzle Experts', 'Adventure Legends', 'Mystery Warriors', 'The Riddle Pros',
    'Code Legends', 'Puzzle Warriors', 'Adventure Pros', 'Mystery Experts'
  ];

  const getRandomSuggestion = () => {
    // Ensure true randomization by using current timestamp as additional entropy
    const timestamp = Date.now();
    const randomIndex = Math.floor((Math.random() + timestamp * 0.000001) % 1 * teamSuggestions.length);
    const randomSuggestion = teamSuggestions[randomIndex];
    // Pass true to indicate this is a random suggestion - this will NOT trigger the clear timeout
    handleTeamNameChange(randomSuggestion, true);
  };

  // 🔧 Check for admin mode on page load
  useEffect(() => {
    const adminParam = searchParams?.get('admin');
    if (adminParam) {
      setIsAdminMode(true);
      console.log('🔧 Admin mode detected');
    }

    // Check if we're returning from successful payment
    const sessionId = searchParams?.get('session_id');
    const success = searchParams?.get('success');

    if (sessionId && success === 'true') {
      handlePaymentSuccess(sessionId);
    }
  }, [searchParams]);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
    };
  }, []);

  const handlePaymentSuccess = async (_sessionId: string) => {
    setIsProcessingPayment(true);
    try {
      // Create the group after successful payment
      const createGroupRes = await fetch("/api/create-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          track_id: `${mode}_${location}`, // e.g., "date_barnsley"
          player_limit: players,
          team_name: teamName.trim() // Include team name
        }),
      });

      if (!createGroupRes.ok) {
        throw new Error("Failed to create group");
      }

      const { groupId, userId, success } = await createGroupRes.json();
      
      if (!success || !groupId || !userId) {
        throw new Error("Invalid response from create-group");
      }

      // Set cookies manually (since we're on client side)
      const expires = new Date(Date.now() + 86400000); // 1 day
      document.cookie = `group_id=${groupId}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
      document.cookie = `user_id=${userId}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;

      console.log("✅ Group created successfully:", { groupId, userId });

      // Get the starting riddle
      const groupRes = await fetch(`/api/groups/${groupId}`);
      if (groupRes.ok) {
        const groupData = await groupRes.json();
        if (groupData.current_riddle_id) {
          // Redirect to the first riddle
          router.push(`/riddle/${groupData.current_riddle_id}`);
          return;
        }
      }

      // Fallback: redirect to a default riddle or error page
      console.error("Could not get starting riddle");
      alert("Group created but couldn't get starting riddle. Please try again.");
      
    } catch (error) {
      console.error("❌ Payment success handling error:", error);
      alert("Payment succeeded but group creation failed. Please contact support.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleStart = async () => {
    // Validate team name
    if (!teamName.trim()) {
      alert('Please enter a team name to continue!');
      return;
    }

    console.log('🔍 Debug handleStart:', { 
      locationsLoading, 
      locationsCount: locations.length,
      locations: locations.map(loc => ({ name: loc.name, hasHours: !!loc.opening_hours }))
    });

    // Check time warnings before proceeding
    try {
      const trackId = `${mode}_${location.toLowerCase()}`;
      const response = await fetch(`/api/track-warnings?trackId=${trackId}`);
      
      if (response.ok) {
        const timeWarning = await response.json();
        console.log('🔍 Time warning result:', timeWarning);
        
        if (timeWarning.shouldWarn) {
          console.log('🔍 Showing time warning modal');
          setTimeWarningData(timeWarning);
          setShowTimeWarning(true);
          return; // Stop here and show warning modal
        }
      }
    } catch (error) {
      console.error('Error checking time warnings:', error);
      // Continue anyway if API fails
    }

    // Proceed with normal payment flow
    await proceedWithPayment();
  };

  const proceedWithPayment = async () => {
    setLoading(true);
    try {
      // 🔧 Check for admin parameter
      const adminParam = searchParams?.get('admin');
      
      const payload = {
        location, 
        mode, 
        players, 
        emails, 
        teamName: teamName.trim(),
        ...(adminParam && { adminKey: adminParam }) // 🔧 Add admin key if present
      };

      const res = await fetch("/api/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ Non-OK response from API:", errorText);
        throw new Error("Checkout session failed");
      }

      const body = await res.json();
      console.log("✅ Response from /api/checkout-session:", body);

      // 🔧 Handle admin test response
      if (body.adminTest) {
        console.log('🔧 Admin test created, redirecting to game...');
        router.push(body.directUrl);
        return;
      }

      // 💳 Handle regular Stripe response
      const { sessionUrl, error } = body;

      if (error) {
        console.error("❌ API returned error:", error);
        throw new Error(`API error: ${error}`);
      }

      if (!sessionUrl || typeof sessionUrl !== "string") {
        console.error("❌ Invalid sessionUrl in response:", body);
        throw new Error("Invalid sessionUrl returned from /api/checkout-session");
      }

      // Redirect to Stripe checkout
      window.location.href = sessionUrl;
    } catch (err) {
      console.error("❌ Checkout error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Enhanced email change handler with duplicate prevention
  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    
    // Check for duplicates (case-insensitive)
    if (value.trim()) {
      const normalizedValue = value.trim().toLowerCase();
      const duplicateIndex = newEmails.findIndex((email, i) => 
        i !== index && email.trim().toLowerCase() === normalizedValue
      );
      
      if (duplicateIndex !== -1) {
        setDuplicateWarning(`This email is already entered for Player ${duplicateIndex + 1}`);
        // Clear the duplicate after a short delay
        setTimeout(() => {
          const clearedEmails = [...newEmails];
          clearedEmails[index] = "";
          setEmails(clearedEmails);
          setDuplicateWarning(null);
        }, 2000);
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
    
    setEmails(newEmails);
  };

  const handlePlayerChange = (value: number) => {
    setPlayers(value);
    setEmails((prev) => {
      const updated = [...prev];
      while (updated.length < value) updated.push("");
      return updated.slice(0, value);
    });
    // Clear duplicate warning when player count changes
    setDuplicateWarning(null);
  };

  // Check if there are any duplicate emails
  const hasDuplicateEmails = (): boolean => {
    const filledEmails = emails.filter(email => email.trim());
    const normalizedEmails = filledEmails.map(email => email.trim().toLowerCase());
    return normalizedEmails.length !== new Set(normalizedEmails).size;
  };

  // Show processing state when handling payment success
  if (isProcessingPayment) {
    return (
      <main className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-6">Payment Successful!</h1>
          <p className="text-lg mb-4">Creating your adventure...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-3 py-8 relative">
      {/* Logo in top-left with homepage link */}
      <div className="absolute top-3 left-3 md:top-6 md:left-6 z-10">
        <Link href="/" className="block hover:opacity-80 transition-opacity duration-200">
          <Image
            src="/riddle-city-logo.png"
            alt="Riddle City Logo"
            width={50}
            height={50}
            className="md:w-[80px] md:h-[80px] drop-shadow-lg"
            priority
          />
        </Link>
      </div>

      {/* Back to Choose Adventure link */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6">
        <Link
          href={`/${location}`}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium"
        >
          <span className="text-lg">←</span>
          <span className="hidden sm:inline">Back to Choose Adventure</span>
          <span className="sm:hidden">Back</span>
        </Link>
      </div>

      {/* 🔧 Admin Mode Indicator */}
      {isAdminMode && (
        <div className="w-full max-w-lg mb-4 bg-yellow-600/20 border border-yellow-500/50 rounded-xl p-3 text-center">
          <h2 className="text-yellow-300 font-bold text-sm">🔧 ADMIN TEST MODE</h2>
          <p className="text-yellow-200 text-xs">Bypass payment for testing</p>
        </div>
      )}

      {/* Main heading with better spacing */}
      <div className="w-full text-center mt-4 sm:mt-4 mb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-center tracking-tight leading-tight">
          Start your {mode} in {capitalize(location)}
        </h1>
      </div>
      
      <div className="w-full max-w-lg space-y-4">
        {/* Number of players with friendly messaging - Side by side layout */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3 items-center">
            {/* Friends message */}
            <div className="text-center sm:text-left">
              <h3 className="text-sm sm:text-base font-medium text-white mb-1">
                👥 This adventure is better with friends!
              </h3>
              <p className="text-xs text-white/60 mb-2">
                (2 Player Minimum)
              </p>
              <p className="text-xs text-white/70 leading-relaxed">
                You can only share the game session to the number of players you select! This cannot be changed later.
              </p>
            </div>
            
            {/* Player selection */}
            <div className="text-center">
              <label className="block text-base font-medium mb-3">
                Number of players:
              </label>
              <select
                value={players}
                onChange={(e) => handlePlayerChange(parseInt(e.target.value))}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full max-w-[200px] text-center"
              >
                {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
                  <option key={n} value={n} className="bg-neutral-800 text-center">
                    {n} players
                  </option>
                ))}
              </select>
              
              {/* Dynamic pricing display */}
              <div className="mt-2 text-center">
                {/\(testing\)/i.test(teamName) ? (
                  <div className="inline-block px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-lg">
                    <p className="text-green-400 text-sm font-semibold">
                      🧪 Testing Mode - FREE (£0.00)
                    </p>
                  </div>
                ) : (
                  <p className="text-white/60 text-xs">
                    Total cost: <span className="text-white font-semibold">£{(players * 12.99).toFixed(2)}</span>
                    {players > 2 && (
                      <span className="text-white/50"> ({players} players × £12.99 each)</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Team Name - Required with purple styling */}
        <div>
          <label className="block text-base font-medium mb-2">
            Team Name: <span className="text-red-400">*</span>
          </label>
          <div className="space-y-2">
            <div className={`border-2 rounded-lg transition-colors duration-200 ${
              teamName.trim() 
                ? 'border-purple-500 bg-purple-500/10' 
                : 'border-red-400 bg-red-400/10'
            }`}>
              <input
                type="text"
                value={teamName}
                onChange={(e) => handleTeamNameChange(e.target.value)}
                placeholder="Enter your team name to proceed..."
                maxLength={30}
                className="w-full bg-transparent px-4 py-3 text-white text-base placeholder:text-white/50 focus:outline-none min-h-[48px]"
                required
                autoComplete="off"
                autoCapitalize="words"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={getRandomSuggestion}
                className="text-xs sm:text-sm text-purple-400 hover:text-purple-300 active:scale-95 transition-all duration-200 min-h-[36px] px-2 py-1 rounded hover:bg-purple-400/10"
              >
                💡 Random name suggestion
              </button>
              <span className="text-xs sm:text-sm text-white/50 tabular-nums">
                {teamName.length}/30
              </span>
            </div>
          </div>
        </div>

        {/* Email invitation section with clearer messaging */}
        <div className="space-y-3">
          <div className="text-center bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="text-base font-medium text-white mb-2">
              📧 Invite Your Team
            </h3>
            <p className="text-xs sm:text-sm text-white/70 mb-3">
              You can share the game link later, or enter player emails below to send invites now:
            </p>
            <button
              type="button"
              onClick={() => setShowEmails(!showEmails)}
              className="flex items-center justify-center gap-2 text-sm sm:text-base font-medium text-purple-400 hover:text-purple-300 active:scale-95 transition-all duration-200 mx-auto min-h-[44px] px-4 py-2 rounded-lg hover:bg-purple-400/10"
            >
              <span className={`transform transition-transform duration-200 ${showEmails ? 'rotate-90' : 'rotate-0'}`}>
                ▶
              </span>
              {showEmails ? 'Hide Email Fields' : 'Enter Player Emails'}
            </button>
          </div>
          
          {showEmails && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
              {/* Duplicate warning */}
              {duplicateWarning && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 text-xs sm:text-sm animate-in slide-in-from-top-2 duration-200">
                  ⚠️ {duplicateWarning}
                </div>
              )}
              
              {emails.map((email, index) => {
                // Check if this email is a duplicate
                const normalizedEmail = email.trim().toLowerCase();
                const isDuplicate = email.trim() && emails.some((otherEmail, otherIndex) => 
                  otherIndex !== index && otherEmail.trim().toLowerCase() === normalizedEmail
                );
                
                return (
                  <div key={index} className="relative">
                    <input
                      type="email"
                      inputMode="email"
                      placeholder={`Email for Player ${index + 1}`}
                      value={email}
                      onChange={(e) => handleEmailChange(index, e.target.value)}
                      className={`w-full rounded-lg px-4 py-3 text-white text-base placeholder:text-white/50 focus:outline-none focus:ring-2 transition-all duration-200 min-h-[48px] ${
                        isDuplicate 
                          ? 'bg-red-500/10 border-2 border-red-500/50 focus:ring-red-500' 
                          : 'bg-white/10 border-2 border-white/20 focus:ring-purple-500 focus:border-transparent'
                      }`}
                      autoComplete="email"
                      autoCapitalize="off"
                    />
                    {isDuplicate && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <span className="text-red-400 text-lg">⚠️</span>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Helpful tip */}
              <div className="text-xs sm:text-sm text-white/50 text-center bg-white/5 rounded-lg p-2">
                💡 Each email can only be used once per team
              </div>
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          onClick={handleStart}
          disabled={
            loading || 
            !teamName.trim() || 
            hasDuplicateEmails() || 
            (teamName.trim() !== '' && containsOffensiveContent(teamName))
          }
          className={`w-full font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg text-base sm:text-lg min-h-[52px] active:scale-[0.98] ${
            loading || !teamName.trim() || hasDuplicateEmails() || (teamName.trim() !== '' && containsOffensiveContent(teamName))
              ? 'bg-gray-600 cursor-not-allowed opacity-50'
              : isAdminMode
              ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 hover:shadow-xl'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:shadow-xl'
          } text-white`}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>{isAdminMode ? 'Creating Test Game...' : 'Processing...'}</span>
            </div>
          ) : (
            <>
              {isAdminMode ? '🔧 Create Test Game' : '💳 Pay & Start Adventure'}
            </>
          )}
        </button>
        
        {/* Show warnings */}
        {hasDuplicateEmails() && (
          <div className="text-center text-red-400 text-sm sm:text-base font-medium bg-red-400/10 rounded-lg p-3 border border-red-400/30 animate-in slide-in-from-top-2 duration-200">
            ⚠️ Please remove duplicate emails before continuing
          </div>
        )}
        
        {teamName.trim() !== '' && containsOffensiveContent(teamName) && (
          <div className="text-center text-red-400 text-sm sm:text-base font-medium bg-red-400/10 rounded-lg p-3 border border-red-400/30 animate-in slide-in-from-top-2 duration-200">
            ⚠️ Please choose a more appropriate team name
          </div>
        )}
      </div>

      {/* Time Warning Modal */}
      {showTimeWarning && timeWarningData && (
        <TimeWarningModal
          isOpen={showTimeWarning}
          onClose={() => setShowTimeWarning(false)}
          onContinue={() => {
            setShowTimeWarning(false);
            proceedWithPayment();
          }}
          warning={timeWarningData}
        />
      )}
    </main>
  );
}