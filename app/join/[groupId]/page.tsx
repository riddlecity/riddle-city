// app/join/[groupId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";

export default function JoinGroupPage() {
  const router = useRouter();
  const params = useParams();
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string>("");

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

    const joinGroup = async () => {
      try {
        setIsJoining(true);
        setError(null);
        
        console.log('🔗 JOIN PAGE: Attempting to join group:', groupId);
        
        const res = await fetch("/api/join-group", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ groupId }),
        });

        console.log('📡 JOIN PAGE: Response status:', res.status);

        // Check if response is actually JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('❌ JOIN PAGE: Response is not JSON, content-type:', contentType);
          const textResponse = await res.text();
          console.error('❌ JOIN PAGE: Response text:', textResponse.substring(0, 500));
          setError("Server error - please try again");
          setIsJoining(false);
          return;
        }

        const data = await res.json();
        console.log('📡 JOIN PAGE: Join response data:', data);

        if (!res.ok) {
          console.error("❌ JOIN PAGE: Join group error:", data.error);
          setError(data.error || "Failed to join group");
          setIsJoining(false);
          return;
        }

        // Success! Extract the riddle ID
        let riddleId = data.nextRiddle || data.currentRiddleId || data.nextRiddleId;

        if (!riddleId) {
          console.error("❌ JOIN PAGE: No riddle ID returned:", data);
          setError("Group joined, but no starting riddle was found.");
          setIsJoining(false);
          return;
        }

        console.log('✅ JOIN PAGE: Success! Riddle ID:', riddleId);
        setSuccessMessage(data.message || "Successfully joined group!");
        setIsJoining(false);

        // Wait a moment to show success message, then redirect
        setTimeout(() => {
          console.log('🎯 JOIN PAGE: Redirecting to riddle:', riddleId);
          router.replace(`/riddle/${riddleId}`);
        }, 2000);
        
      } catch (err) {
        console.error("💥 JOIN PAGE: Unexpected error:", err);
        setError("Unexpected error joining group");
        setIsJoining(false);
      }
    };

    joinGroup();
  }, [groupId, router]);

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4">
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
            <h1 className="text-2xl md:text-3xl font-bold mb-4">Joining Group...</h1>
            <p className="text-white/70">Please wait while we add you to the team.</p>
          </>
        )}
        
        {successMessage && !isJoining && !error && (
          <>
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-2xl md:text-3xl font-bold mb-4 text-green-400">Success!</h1>
            <p className="text-white/80 mb-4">{successMessage}</p>
            <p className="text-white/60 text-sm">Redirecting you to the game...</p>
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
            
            {/* Debug info */}
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-white/60 text-sm border border-white/20 rounded px-3 py-2 hover:text-white/80 hover:border-white/40 transition-colors">
                Debug Info ▼
              </summary>
              <div className="mt-2 text-xs text-white/50 bg-black/20 rounded p-3 font-mono text-left">
                <div>Group ID: {groupId}</div>
                <div>Error: {error}</div>
                <div>Path: /join/{groupId}</div>
                <div>Timestamp: {new Date().toISOString()}</div>
              </div>
            </details>
          </>
        )}
      </div>
    </main>
  );
}