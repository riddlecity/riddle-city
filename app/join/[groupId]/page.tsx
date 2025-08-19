// app/join/[groupId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface SessionData {
  groupId: string;
  userId: string;
  teamName: string;
}

export default function JoinGroupPage() {
  const router = useRouter();
  const params = useParams();
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("Checking your group status...");

  const groupId =
    typeof params?.groupId === "string"
      ? params.groupId
      : Array.isArray(params?.groupId)
      ? params.groupId[0]
      : "";

  // Helper functions for cookie management
  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
  };

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

  const parseSessionCookie = (): SessionData | null => {
    try {
      const sessionCookie = getCookie("riddlecity-session");
      if (!sessionCookie) return null;
      
      const decoded = Buffer.from(sessionCookie, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      
      if (parsed.groupId && parsed.userId) {
        return parsed;
      }
      return null;
    } catch (e) {
      console.warn("Failed to parse session cookie:", e);
      return null;
    }
  };

  const setSessionCookie = (sessionData: SessionData) => {
    try {
      const encoded = Buffer.from(JSON.stringify(sessionData)).toString('base64');
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
      setIsJoining(false);
      return;
    }

    const handleJoin = async () => {
      try {
        setIsJoining(true);
        setError(null);

        // Check for existing session
        const existingSession = parseSessionCookie();

        if (existingSession && existingSession.groupId === groupId) {
          setStatusMessage("Welcome back! Verifying your group membership...");

          try {
            const statusResponse = await fetch(
              `/api/check-active-game?userId=${existingSession.userId}&groupId=${groupId}`,
              { 
                method: "GET",
                headers: {
                  'Cache-Control': 'no-cache'
                }
              }
            );

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();

              if (statusData.isActive) {
                setStatusMessage("Rejoining your adventure...");
                setSuccessMessage("Welcome back to your group!");
                setIsJoining(false);

                // If game is started and has a current riddle, go there
                if (statusData.gameStarted && statusData.currentRiddleId) {
                  setTimeout(() => {
                    window.location.replace(`/riddle/${statusData.currentRiddleId}`);
                  }, 1200);
                } else {
                  // Otherwise go to waiting room
                  setTimeout(() => {
                    window.location.replace(`/waiting/${groupId}`);
                  }, 1200);
                }
                return;
              }
            } else {
              console.warn("Failed to check active game status:", statusResponse.status);
            }
          } catch (e) {
            console.warn("Error checking active game:", e);
            // Continue with fresh join flow
          }
        }

        // Clear any conflicting cookies before joining
        clearAllCookies();
        
        // Fresh join flow
        setStatusMessage("Joining your group...");

        const res = await fetch("/api/join-group", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({ groupId }),
        });

        // Parse the JSON response
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

        // Check if game has started
        if (data.gameStarted && data.nextRiddle) {
          setSuccessMessage(`Joining ${data.teamName} adventure in progress...`);
          setIsJoining(false);

          setTimeout(() => {
            window.location.replace(`/riddle/${data.nextRiddle}`);
          }, 1500);
        } else {
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

    handleJoin();
  }, [groupId, router]);

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
        {isJoining && (
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
                <div className="text-sm text-green-300">Taking you to the waiting room…</div>
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