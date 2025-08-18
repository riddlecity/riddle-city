'use client'
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useGroupSession } from "@/hooks/useGroupSession";

export default function Home() {
  const { loading, hasActiveGroup, currentRiddleId, groupId, clearSession } = useGroupSession();
  const [showInfo, setShowInfo] = useState(false);

  // WhatsApp share function
  const shareOnWhatsApp = () => {
    const messages = [
      "Hey! Found this cool puzzle adventure where you solve riddles around the city 🕵️‍♀️ riddlecity.co.uk",
      "Check this out - it's like a treasure hunt with riddles and QR codes! Perfect for a fun day out 🧩 riddlecity.co.uk",
      "Discovered RiddleCity - puzzle adventures through real locations. Looks amazing! 🎯 riddlecity.co.uk",
      "Found the perfect activity for us! It's called RiddleCity - solve riddles while exploring the city 🏙️ riddlecity.co.uk"
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(randomMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Handle starting fresh - use the clearSession method from the hook
  const handleStartFresh = async () => {
    await clearSession();
    window.location.reload();
  };

  // Show loading state while checking session
  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4">
        <Image
          src="/riddle-city-logo.png"
          alt="Riddle City Logo"
          width={80}
          height={80}
          className="mb-6 drop-shadow-lg animate-pulse"
          priority
        />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white/70 text-center">Checking your session...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4 py-12">
      {/* Large logo for impact - MUCH BIGGER */}
      <Image
        src="/riddle-city-logo.png"
        alt="Riddle City Logo"
        width={300}
        height={300}
        className="mb-8 drop-shadow-xl sm:w-[350px] sm:h-[350px] md:w-[400px] md:h-[400px]"
        priority
      />

      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-8 text-center tracking-tight">
        Your Mystery Awaits
      </h1>
      
      {/* Show rejoin options if user has active group */}
      {hasActiveGroup && currentRiddleId && (
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl text-center max-w-md w-full">
          <div className="text-2xl mb-2">🎮</div>
          <h3 className="text-lg font-bold text-blue-200 mb-2">Welcome Back, Detective!</h3>
          <p className="text-blue-200/80 text-sm mb-4">
            You have an ongoing adventure waiting
          </p>
          <div className="space-y-3">
            <Link
              href={`/riddle/${currentRiddleId}`}
              className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🔍 Resume Adventure
            </Link>
            <button
              onClick={handleStartFresh}
              className="block w-full bg-gray-600/50 hover:bg-gray-600/70 text-white/90 font-medium py-2 px-6 rounded-lg transition-all duration-200 text-sm border border-gray-500/30"
            >
              🆕 Start Fresh Instead
            </button>
          </div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
        <Link
          href="/locations"
          className="bg-red-600 hover:bg-red-500 transition-colors duration-200 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl"
        >
          See Locations →
        </Link>
        
        {/* WhatsApp Share - Subtle and compact */}
        <button
          onClick={shareOnWhatsApp}
          className="flex items-center gap-2 text-white/60 hover:text-white/80 transition-colors duration-200 text-sm"
        >
          <span className="text-green-500">📱</span>
          Share via WhatsApp
        </button>
      </div>

      {/* Collapsible info section */}
      <div className="w-full max-w-2xl">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center justify-center gap-2 mx-auto text-lg font-medium text-white/80 hover:text-white transition-colors duration-200"
        >
          <span className={`transform transition-transform duration-200 ${showInfo ? 'rotate-90' : 'rotate-0'}`}>
            ▶
          </span>
          What is Riddle City?
        </button>
        
        {showInfo && (
          <div className="mt-4 p-6 bg-white/5 border border-white/10 rounded-xl animate-in slide-in-from-top-2 duration-300">
            <p className="text-lg text-neutral-300 text-center leading-relaxed">
              Riddle City is a puzzle-based adventure through your town or city.  
              Scan QR codes, solve unique riddles, and uncover your next destination.  
              Whether you're planning a creative date or exploring the pub scene with friends, 
              each trail collaborates with local businesses to make the journey unforgettable.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}