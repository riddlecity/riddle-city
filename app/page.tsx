'use client'
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useGroupSession } from "@/hooks/useGroupSession";
import StartFreshModal from "@/components/StartFreshModal";

export default function Home() {
  const { loading, hasActiveGroup, getResumeUrl, clearSession } = useGroupSession();
  const [showInfo, setShowInfo] = useState(false);
  const [showStartFreshModal, setShowStartFreshModal] = useState(false);
  
  // Get resume URL
  const resumeUrl = getResumeUrl();

  // WhatsApp share function
  const shareOnWhatsApp = () => {
    const messages = [
      "🧩 Check out Riddle City - solve riddles, explore your city, and discover hidden gems! riddlecity.co.uk",
      "Found the perfect activity! Riddle City takes you on an adventure through pubs, cafes & landmarks 🍻 riddlecity.co.uk",
      "Fancy a unique day out? Riddle City is a puzzle adventure where you solve riddles to find your next location! riddlecity.co.uk",
      "🎯 Discovered Riddle City - it's like a treasure hunt meets pub crawl. Looks brilliant! riddlecity.co.uk"
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
          width={200}
          height={200}
          className="mb-6 drop-shadow-lg animate-pulse w-[200px] h-[200px] sm:w-[250px] sm:h-[250px] object-contain"
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
      {hasActiveGroup && resumeUrl && (
        <div className="bg-blue-900/30 backdrop-blur-sm border border-blue-400/20 rounded-xl p-6 mb-8 max-w-md w-full shadow-xl">
          <h2 className="text-xl font-semibold text-blue-100 mb-2">
            🎮 Game Found!
          </h2>
          <p className="text-blue-200/80 text-sm mb-4">
            You have an ongoing adventure waiting
          </p>
          <div className="space-y-3">
            <Link
              href={resumeUrl}
              className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🔍 Resume Adventure
            </Link>
            <button
              onClick={() => setShowStartFreshModal(true)}
              className="block w-full bg-gray-600/50 hover:bg-gray-600/70 text-white/90 font-medium py-2 px-6 rounded-lg transition-all duration-200 text-sm border border-gray-500/30"
            >
              🆕 Start Fresh Instead
            </button>
          </div>
        </div>
      )}
      
      {/* Start Fresh Modal */}
      <StartFreshModal
        isOpen={showStartFreshModal}
        onClose={() => setShowStartFreshModal(false)}
        onConfirm={handleStartFresh}
      />
      
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
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          Share with Friends
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
              Riddle City is an outdoor puzzle adventure that takes you on a journey through your city. 
              Solve riddles to discover your next location, then scan QR codes or submit answers to progress. 
              Perfect for date days or pub crawls with friends - each adventure visits local businesses 
              and hidden gems, creating an unforgettable experience.
            </p>
          </div>
        )}
        
        {/* FAQ Link Box */}
        <div className="mt-6">
          <Link
            href="/faq"
            className="block mx-auto max-w-md p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-lg hover:border-purple-500/50 transition-all duration-200 text-center group"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">❓</span>
              <div>
                <p className="text-white font-semibold group-hover:text-purple-300 transition-colors">
                  Have questions?
                </p>
                <p className="text-white/60 text-sm">
                  Check our FAQ for answers
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}