// app/riddle-unauthorized/page.tsx
"use client";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams?.get('reason');
  
  // Different content based on why they're here
  const getContent = () => {
    switch (reason) {
      case 'no_session':
        return {
          icon: "🕵️‍♀️",
          title: "Found a Riddle City Location!",
          message: "You've discovered one of our mystery locations! Join an adventure to unlock the riddles and explore your city like never before.",
          isDiscovery: true
        };
      case 'not_member':
        return {
          icon: "👥",
          title: "Join the Adventure",
          message: "This riddle belongs to another team's adventure. Start your own journey or get an invite link from your team leader!",
          isDiscovery: false
        };
      case 'wrong_location':
        return {
          icon: "📍",
          title: "Wrong Location",
          message: "You're at the wrong spot for your current riddle. Check your game for the correct location!",
          isDiscovery: false
        };
      case 'invalid_qr':
        return {
          icon: "❓",
          title: "Invalid QR Code", 
          message: "This QR code appears to be damaged or outdated. Try scanning a fresh code or contact support if the problem persists.",
          isDiscovery: false
        };
      default:
        return {
          icon: "🔒",
          title: "Adventure Locked",
          message: "This riddle is part of an active adventure. Start your journey to unlock the mysteries waiting in your city!",
          isDiscovery: true
        };
    }
  };

  const content = getContent();

  return (
    <>
      <div className="text-center relative z-10 max-w-lg">
        <div className="text-6xl mb-6">{content.icon}</div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {content.title}
        </h1>
        
        <p className="text-lg text-white/70 mb-8">
          {content.message}
        </p>

        {/* Different actions based on context */}
        {content.isDiscovery ? (
          <>
            {/* For people discovering QR codes */}
            <div className="space-y-4">
              <Link
                href="/locations"
                className="block w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                🚀 Start Your Adventure
              </Link>
              
              <Link
                href="/"
                className="block w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 border border-white/20 hover:border-white/40"
              >
                💡 What is Riddle City?
              </Link>
            </div>

            {/* Encouragement for discoveries */}
            <div className="mt-8 p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg">
              <p className="text-blue-200 text-sm">
                🎯 <strong>Great detective work!</strong> You found one of our hidden locations. 
                Imagine solving puzzles that lead you to places like this all around your city!
              </p>
            </div>
          </>
        ) : (
          <>
            {/* For game-related access issues */}
            <div className="space-y-4">
              {reason === 'wrong_location' ? (
                <Link
                  href="/locations"
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                >
                  🧭 Back to My Adventure
                </Link>
              ) : (
                <Link
                  href="/locations"
                  className="block w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  🆕 Start New Adventure
                </Link>
              )}
              
              <Link
                href="/"
                className="block w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 border border-white/20 hover:border-white/40"
              >
                🏠 Back to Home
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function RiddleUnauthorizedPage() {
  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4 py-16 relative">
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

      {/* Background maze logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-15 z-0">
        <Image
          src="/riddle-city-logo2.png"
          alt=""
          width={400}
          height={400}
          className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] object-contain filter sepia hue-rotate-12 saturate-150"
          priority={false}
        />
      </div>

      <Suspense fallback={
        <div className="text-center relative z-10 max-w-lg">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Adventure Locked
          </h1>
          <p className="text-lg text-white/70 mb-8">
            Loading...
          </p>
        </div>
      }>
        <UnauthorizedContent />
      </Suspense>
    </main>
  );
}