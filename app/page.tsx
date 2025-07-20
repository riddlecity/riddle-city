// app/page.tsx
'use client'

import Image from "next/image";
import Link from "next/link";
import { useGroupSession } from "@/hooks/useGroupSession";

export default function Home() {
  const { loading, hasActiveGroup, currentRiddleId } = useGroupSession();

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

  // If user has active group, the hook will auto-redirect them
  // This content only shows for users without active groups
  
  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4 py-16">
      <Image
        src="/riddle-city-logo.png"
        alt="Riddle City Logo"
        width={300}
        height={300}
        className="mb-4 drop-shadow-xl" // reduced gap from image to headline
        priority
      />
      <h1 className="text-4xl sm:text-5xl font-extrabold mb-10 text-center tracking-tight">
        Your Mystery Awaits
      </h1>
      
      {/* Show resume button if user has active group but auto-redirect didn't work */}
      {hasActiveGroup && currentRiddleId && (
        <div className="mb-6 p-4 bg-green-600/20 border border-green-600/50 rounded-lg text-center">
          <p className="text-green-300 mb-3">You have an active adventure!</p>
          <Link
            href={`/riddle/${currentRiddleId}`}
            className="bg-green-600 hover:bg-green-500 transition-colors duration-200 text-white font-semibold px-6 py-3 rounded-full shadow-md"
          >
            Resume Your Adventure →
          </Link>
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