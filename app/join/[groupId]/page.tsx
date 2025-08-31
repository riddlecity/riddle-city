// app/join/[groupId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useGroupSession } from "@/hooks/useGroupSession";
import { SessionData } from "@/types/group";

export default function JoinGroupPage() {
  const router = useRouter();
  const params = useParams();
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("Checking your group status...");
  const [forceJoin, setForceJoin] = useState(false);

  // Use the hook WITH auto-redirect enabled
  const { loading: sessionLoading, activeSession, error: sessionError } = useGroupSession(true);

  const groupId =
    typeof params?.groupId === "string"
      ? params.groupId
      : Array.isArray(params?.groupId)
      ? params.groupId[0]
      : "";

  console.log("🔍 JOIN PAGE STATE:", {
    groupId,
    sessionLoading,
    activeSession: activeSession?.groupId,
    isJoining,
    sessionError
  });

  // Helper functions for cookie management
  const clearAllCookies = () => {
    const cookiesToClear = [
      "riddlecity-session",
      "user_id", 
      "group_id", 
      "team_name"
    ];
    
    // Clear cookies with all possible paths and domains
    cookiesToClear.forEach(cookieName => {
      // Root path
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
      // With domain
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
      // Without secure flag
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; samesite=lax`;
    });
    console.log("🧹 JOIN: Cleared all session cookies");
  };

  const setSessionCookie = (sessionData: SessionData) => {
    try {
      // Set new format cookie
      const encoded = btoa(JSON.stringify(sessionData));
      const maxAge = 48 * 60 * 60; // 48 hours
      const isProduction = window.location.hostname !== 'localhost';
      
      document.cookie = `riddlecity-session=${encoded}; max-age=${maxAge}; path=/; ${isProduction ? 'secure; ' : ''}samesite=lax`;
      
      // ALSO set legacy cookies for backward compatibility
      document.cookie = `group_id=${sessionData.groupId}; max-age=${maxAge}; path=/; ${isProduction ? 'secure; ' : ''}samesite=lax`;
      document.cookie = `user_id=${sessionData.userId}; max-age=${maxAge}; path=/; ${isProduction ? 'secure; ' : ''}samesite=lax`;
      document.cookie = `team_name=${sessionData.teamName}; max-age=${maxAge}; path=/; ${isProduction ? 'secure; ' : ''}samesite=lax`;
      
      console.log("✅ JOIN: Set both new and legacy cookies for compatibility");
    } catch (e) {
      console.error("Failed to set session cookie:", e);
    }
  };

  useEffect(() => {
    if (!groupId) {
      setError("Invalid group ID. Please check your invite link.");
      return;
    }

    let sessionTimeout: NodeJS.Timeout;

    // Add timeout to prevent infinite loading from useGroupSession
    if (sessionLoading && !forceJoin) {
      setStatusMessage("Checking your group status...");
      sessionTimeout = setTimeout(() => {
        console.warn("⏰ JOIN: Session loading timeout, proceeding with join");
        setForceJoin(true);
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(sessionTimeout);
    }

    // If useGroupSession found an active session for THIS group, let it auto-redirect
    if (activeSession && activeSession.groupId === groupId) {
      setStatusMessage("Welcome back! Taking you to your adventure...");
      setSuccessMessage("Welcome back to your group!");
      // useGroupSession will handle the redirect, don't interfere
      return () => {};
    }

    // If user has a different active session, clear it first
    if (activeSession && activeSession.groupId !== groupId) {
      console.log("🔄 JOIN: Clearing different active session before joining new group");
      clearAllCookies();
      // Continue to join new group
    }

    // If we get here, user needs to join this specific group
    const handleJoin = async () => {
      try {
        setIsJoining(true);
        setError(null);
        setStatusMessage("Joining your group...");

        // Clear any conflicting cookies before joining (ensure clean state)
        clearAllCookies();

        // Small delay to ensure cookies are cleared
        await new Promise(resolve => setTimeout(resolve, 100));

        const res = await fetch("/api/join-group", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({ groupId }),
        });

        let data;
        
        try {
          data = await res.json();
        } catch (parseError) {
          console.error("Failed to parse response:", parseError);
          setError("Server communication error. Please try again.");
          setIsJoining(false);
          return;
        }

        if (!res.ok) {
          const errorMessage = data?.error || `Server error (${res.status}). Please try again.`;
          console.error("Join group failed:", res.status, errorMessage);
          setError(errorMessage);
          setIsJoining(false);
          return;
        }

        // Validate response data
        if (!data.userId || !data.teamName) {
          console.error("Invalid join response data:", data);
          setError("Invalid server response. Please try again.");
          setIsJoining(false);
          return;
        }

        // Set session cookie for immediate client-side access
        const sessionData: SessionData = {
          groupId,
          userId: data.userId,
          teamName: data.teamName
        };
        
        setSessionCookie(sessionData);
        console.log("✅ JOIN: Set client-side session cookie for immediate access");

        // Always redirect to waiting page first, let the waiting page handle game-started redirects
        setSuccessMessage(`Successfully joined ${data.teamName}! ${data.gameStarted ? 'Joining adventure in progress...' : 'Waiting for the leader to start…'}`);
        
        setTimeout(() => {
          router.replace(`/waiting/${groupId}`);
        }, 1500);

      } catch (err) {
        console.error("Unexpected error joining group:", err);
        setError("Connection error. Please check your internet and try again.");
        setIsJoining(false);
      }
    };

    // Only run join logic if:
    // 1. We don't have an active session for this group
    // 2. We're not already in the joining process
    // 3. useGroupSession is not loading (or we forced join due to timeout)
    if ((!sessionLoading || forceJoin) && !isJoining && (!activeSession || activeSession.groupId !== groupId)) {
      handleJoin();
    }

    return () => {}; // Cleanup function

  }, [groupId, router, sessionLoading, activeSession, sessionError, isJoining, forceJoin]);

  // Show loading while checking session or joining
  if (sessionLoading && !forceJoin) {
    return (
      <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4 relative">
        {/* Logo in consistent top-left position */}
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

        {/* Background logo */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <Image
            src="/riddle-city-logo.png"
            alt="Background Logo"
            width={400}
            height={400}
            className="max-w-[80vw] max-h-[80vh]"
            priority
          />
        </div>

        <div className="z-10 max-w-md w-full text-center space-y-6">
          <div className="text-6xl animate-spin mb-4">🔍</div>
          <h1 className="text-2xl font-bold">Joining Your Team</h1>
          <p className="text-white/70 mb-6">{statusMessage}</p>
          
          {/* Manual join button as fallback */}
          <button
            onClick={() => setForceJoin(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
          >
            Having trouble? Click to continue
          </button>
        </div>
      </main>
    );
  }

  // Show joining/loading state
  if (isJoining) {
    return (
      <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4 relative">
        {/* Logo in consistent top-left position */}
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

        {/* Background logo */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <Image
            src="/riddle-city-logo.png"
            alt="Background Logo"
            width={400}
            height={400}
            className="max-w-[80vw] max-h-[80vh]"
            priority
          />
        </div>

        <div className="text-center z-10 max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-6"></div>
          <h1 className="text-2xl md:text-3xl font-bold mb-4">{successMessage || statusMessage}</h1>
          <p className="text-white/70">Please wait...</p>
        </div>
      </main>
    );
  }

  // Show error state
  if (error) {
    return (
      <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4 relative">
        {/* Logo in consistent top-left position */}
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

        {/* Background logo */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <Image
            src="/riddle-city-logo.png"
            alt="Background Logo"
            width={400}
            height={400}
            className="max-w-[80vw] max-h-[80vh]"
            priority
          />
        </div>

        <div className="text-center z-10 max-w-md space-y-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-400">Join Failed</h1>
          <p className="text-white/70 mb-6">{error}</p>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                setError(null);
                setForceJoin(true);
              }}
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Try Again
            </button>
            
            <Link
              href="/"
              className="block w-full bg-gray-600/50 hover:bg-gray-600/70 text-white/90 font-medium py-2 px-6 rounded-lg transition-colors duration-200 text-sm border border-gray-500/30"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Default loading state (should rarely be seen)
  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4 relative">
      {/* Logo in consistent top-left position */}
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

      {/* Background logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <Image
          src="/riddle-city-logo.png"
          alt="Background Logo"
          width={400}
          height={400}
          className="max-w-[80vw] max-h-[80vh]"
          priority
        />
      </div>

      <div className="text-center z-10 max-w-md">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-6"></div>
        <h1 className="text-2xl md:text-3xl font-bold mb-4">Loading...</h1>
        <p className="text-white/70">Please wait...</p>
      </div>
    </main>
  );
}
