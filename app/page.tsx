// app/page.tsx
'use client'

import Image from "next/image";
import Link from "next/link";
import { useGroupSession } from "@/hooks/useGroupSession";

export default function Home() {
  const { loading, hasActiveGroup, currentRiddleId, groupId } = useGroupSession();

  // Show loading state while checking session
  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4">
        <Image
          src="/riddle-city-logo.png"
          alt="Riddle City Logo"
          width={120}
          height={120}
          className="mb-6 drop-shadow-lg animate-pulse"
          priority
        />
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white/70 text-center">Checking your session...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4 py-16">
      <Image
        src="/riddle-city-logo.png"
        alt="Riddle City Logo"
        width={300}
        height={300}
        className="mb-4 drop-shadow-xl"
        priority
      />
      <h1 className="text-4xl sm:text-5xl font-extrabold mb-10 text-center tracking-tight">
        Your Mystery Awaits
      </h1>
      
      {/* Show rejoin options if user has active group - NO AUTO-REDIRECT */}
      {hasActiveGroup && currentRiddleId && (
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl text-center max-w-md w-full">
          <div className="text-3xl mb-3">🎮</div>
          <h3 className="text-lg font-bold text-blue-200 mb-2">Welcome Back, Detective!</h3>
          <p className="text-blue-200/80 text-sm mb-4">
            You have an ongoing adventure waiting for you
          </p>
          <div className="space-y-3">
            <Link
              href={`/riddle/${currentRiddleId}`}
              className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🔍 Resume Adventure
            </Link>
            <button
              onClick={() => {
                // Clear cookies to start fresh
                document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                document.cookie = 'group_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                window.location.reload();
              }}
              className="block w-full bg-gray-600/50 hover:bg-gray-600/70 text-white/90 font-medium py-2 px-6 rounded-lg transition-all duration-200 text-sm border border-gray-500/30"
            >
              🆕 Start Fresh Instead
            </button>
          </div>
        </div>
      )}
      
      <Link
        href="/riddlecity"
        className="bg-red-600 hover:bg-red-500 transition-colors duration-200 text-white font-semibold px-6 py-3 rounded-full shadow-md mb-12"
      >
        See Locations →
      </Link>
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center">What is Riddle City?</h2>
      <p className="text-lg sm:text-xl text-neutral-300 text-center max-w-2xl">
        Riddle City is a puzzle-based adventure through your town or city.  
        Scan QR codes, solve unique riddles, and uncover your next destination.  
        Whether you're planning a creative date or exploring the pub scene with friends, each trail collaborates with local businesses to make the journey unforgettable.
      </p>
    </main>
  );
}