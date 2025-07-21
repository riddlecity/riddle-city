// app/join/[groupId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

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

  useEffect(() => {
    if (!groupId) {
      setError("Invalid group ID");
      setIsJoining(false);
      return;
    }

    const handleJoin = async () => {
      try {
        setIsJoining(true);
        setError(null);
        
        // First check if user already has cookies for this group
        const getCookie = (name: string) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(';').shift();
          return null;
        }
        
        const existingUserId = getCookie('user_id')
        const existingGroupId = getCookie('group_id')
        
        if (existingUserId && existingGroupId === groupId) {
          // User has cookies for this group - verify they're still valid
          setStatusMessage('Welcome back! Verifying your group membership...')
          
          const statusResponse = await fetch(`/api/check-active-game?userId=${existingUserId}&groupId=${groupId}`, {
            method: 'GET'
          })
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            
            if (statusData.isActive && statusData.currentRiddleId) {
              // Valid session - redirect to current riddle
              setStatusMessage('Rejoining your adventure...')
              setSuccessMessage('Welcome back to your group!')
              setIsJoining(false)
              
              // Small delay to show success message
              setTimeout(() => {
                router.replace(`/riddle/${statusData.currentRiddleId}`);
              }, 1500);
              return
            } else {
              // Invalid session - clear cookies and proceed with fresh join
              document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
              document.cookie = 'group_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
            }
          }
        }

        // Proceed with joining the group (new or fresh join)
        setStatusMessage('Joining your group...')
        
        const res = await fetch("/api/join-group", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ groupId }),
        });

        // Check if response is actually JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          setError("Server error - please try again");
          setIsJoining(false);
          return;
        }

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to join group");
          setIsJoining(false);
          return;
        }

        // Success! Extract the riddle ID
        let riddleId = data.nextRiddle || data.currentRiddleId || data.nextRiddleId;

        if (!riddleId) {
          setError("Group joined, but no starting riddle was found.");
          setIsJoining(false);
          return;
        }
        
        const welcomeMessage = data.isRejoining ? 'Welcome back!' : 'Successfully joined!'
        setSuccessMessage(`${welcomeMessage} ${data.message || ''}`.trim())
        setIsJoining(false);

        // Wait a moment to show success message, then redirect
        setTimeout(() => {
          router.replace(`/riddle/${riddleId}`);
        }, 2000);
        
      } catch (err) {
        setError("Unexpected error joining group");
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
      
      {/* Logo */}
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
              {statusMessage.includes('Welcome back') ? 'Welcome Back!' : 'Joining Group...'}
            </h1>
            <p className="text-white/70">{statusMessage}</p>
          </>
        )}
        
        {successMessage && !isJoining && !error && (
          <>
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-2xl md:text-3xl font-bold mb-4 text-green-400">
              {successMessage.includes('Welcome back') ? 'Welcome Back!' : 'Success!'}
            </h1>
            <p className="text-white/80 mb-4">{successMessage}</p>
            <p className="text-white/60 text-sm">
              {successMessage.includes('Welcome back') ? 'Returning to your adventure...' : 'Redirecting you to the game...'}
            </p>
            <div className="mt-4">
              <div className="animate-pulse bg-green-500/20 rounded-lg p-2">
                <div className="text-sm text-green-300">Taking you to your riddle...</div>
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
                onClick={() => window.location.reload()}
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Try Again
              </button>
              
              <button
                onClick={() => router.push('/riddlecity')}
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