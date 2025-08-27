// app/join/[groupId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useGroupSession } from "@/hooks/useGroupSession";

interface SessionData {
  groupId: string;
  userId: string;
  teamName: string;
}

export default function JoinGroupPage() {
  const router = useRouter();
  const params = useParams();
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("Checking your group status...");

  // Use the hook WITH auto-redirect enabled
  const { loading: sessionLoading, activeSession, error: sessionError } = useGroupSession(true);

  const groupId =
    typeof params?.groupId === "string"
      ? params.groupId
      : Array.isArray(params?.groupId)
      ? params.groupId[0]
      : "";

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
  };

  const setSessionCookie = (sessionData: SessionData) => {
    try {
      // Use btoa instead of Buffer for browser compatibility
      const encoded = btoa(JSON.stringify(sessionData));
      const maxAge = 48 * 60 * 60; // 48 hours
      const isProduction = window.location.hostname !== 'localhost';
      
      document.cookie = `riddlecity-session=${encoded}; max-age=${maxAge}; path=/; ${isProduction ? 'secure; ' : ''}samesite=lax`;
    } catch (e) {
      console.error("Failed to set session cookie:", e);
    }
  };

  useEffect(() => {
    if (!groupId) {
      setError("Invalid group ID. Please check your invite link.");
      return;
    }

    // If useGroupSession found an active session, it will auto-redirect
    // We just need to show appropriate loading/success messages
    if (sessionLoading) {
      setStatusMessage("Checking your group status...");
      return;
    }

    if (sessionError) {
      console.warn("Session error:", sessionError);
      // Continue with join flow
    }

    if (activeSession && activeSession.groupId === groupId) {
      // User already has an active session, useGroupSession will handle redirect
      setStatusMessage("Welcome back! Taking you to your adventure...");
      setSuccessMessage("Welcome back to your group!");
      return;
    }

    // If we get here, user needs to join the group
    const handleJoin = async () => {
      try {
        setIsJoining(true);
        setError(null);
        setStatusMessage("Joining your group...");

        // Clear any conflicting cookies before joining
        clearAllCookies();

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

        // Set session cookie for the new member
        const sessionData: SessionData = {
          groupId,
          userId: data.userId,
          teamName: data.teamName
        };
        
        setSessionCookie(sessionData);

        // Simple redirect logic - let the game flow handle the complexity
        if (data.gameStarted && data.nextRiddle) {
          // Game is active - go directly to current riddle
          setSuccessMessage(`Joining ${data.teamName} adventure in progress...`);
          setIsJoining(false);

          setTimeout(() => {
            router.replace(`/riddle/${data.nextRiddle}`);
          }, 1500);
        } else {
          // Game hasn't started - go to waiting room
          setSuccessMessage(`Successfully joined ${data.teamName}! Waiting for the leader to start…`);
          setIsJoining(false);

          setTimeout(() => {
            router.replace(`/waiting/${groupId}`);
          }, 1500);
        }

      } catch (err) {
        console.error("Unexpected error joining group:", err);
        setError("Connection error. Please check your internet and try again.");
        setIsJoining(false);
      }
    };

    // Only run join logic if we don't have an active session
    if (!activeSession) {
      handleJoin();
    }

  }, [groupId, router, sessionLoading, activeSession, sessionError]);

  // Show loading while checking session
  if (sessionLoading) {
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
            src="/riddle-city-logo2.png"
            alt=""
            width={400}
            height={400}
            className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] object-contain"
            priority={false}
          />
        </div>

        <div className="text-center z-10 max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-6"></div>
          <h1 className="text-2xl md:text-3xl font-bold mb-4">Loading your adventure...</h1>
          <p className="text-white/70">Checking your group status...</p>
        </div>
      </main>
    );
  }

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
          src="/riddle-city-logo2.png"
          alt=""
          width={400}
          height={400}
          className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] object-contain"
          priority={false}
        />
      </div>

      {/* Center logo */}
      <div className="mb-8 z-10">
        <Image
          src="/riddle-city-logo.png"
          alt="Riddle City Logo"
          width={120}
          height={120}
          className="drop-shadow-lg"
          priority
        />
      </div>

      <div className="text-center z-10 max-w-md">
        {(isJoining || (activeSession && activeSession.groupId === groupId)) && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-6"></div>
            <h1 className="text-2xl md:text-3xl font-bold mb-4">
              {statusMessage.includes("Welcome back") ? "Welcome Back!" : "Joining Group..."}
            </h1>
            <p className="text-white/70">{statusMessage}</p>
          </>
        )}

        {successMessage && !isJoining && !error && (
          <>
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-2xl md:text-3xl font-bold mb-4 text-green-400">
              {successMessage.includes("Welcome back") ? "Welcome Back!" : "Success!"}
            </h1>
            <p className="text-white/80 mb-4">{successMessage}</p>
            <p className="text-white/60 text-sm">Redirecting you now…</p>
            <div className="mt-4">
              <div className="animate-pulse bg-green-500/20 rounded-lg p-2">
                <div className="text-sm text-green-300">Taking you to the adventure…</div>
              </div>
            </div>
          </>
        )}

        {error && !isJoining && (
          <>
            <div className="text-6xl mb-6">❌</div>
            <h1 className="text-2xl md:text-3xl font-bold mb-4 text-red-400">Could Not Join Group</h1>
            <p className="text-white/80 mb-8">{error}</p>

            <div className="space-y-4">
              <button
                onClick={() => {
                  clearAllCookies();
                  window.location.reload();
                }}
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Clear Data & Try Again
              </button>

              <button
                onClick={() => router.push("/locations")}
                className="block w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Go to Riddle City
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}