"use client";
import { useRouter } from "next/navigation";
import { use } from "react";
import Link from "next/link";
import Image from "next/image";

interface Props {
  params: Promise<{ location: string }>;
}

export default function LocationPage({ params }: Props) {
  const resolvedParams = use(params);
  const router = useRouter();
  const location = resolvedParams.location.charAt(0).toUpperCase() + resolvedParams.location.slice(1);
  
  const handleModeSelect = (mode: string) => {
    router.push(`/riddlecity/${resolvedParams.location}/${mode}`);
  };
  
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

      {/* Back link in top-right */}
      <div className="absolute top-6 right-6">
        <Link
          href="/riddlecity"
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium"
        >
          <span className="text-lg">←</span>
          <span className="hidden sm:inline">Back to Cities</span>
          <span className="sm:hidden">Back</span>
        </Link>
      </div>

      {/* Main content centered */}
      <div className="w-full text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 text-center tracking-tight leading-tight">
          Riddle City {location}
        </h1>
        <p className="text-lg text-white/80 mb-12">Choose Your Adventure</p>
        
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Date Day Adventure */}
          <button
            onClick={() => handleModeSelect("date")}
            className="w-full bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white font-semibold py-6 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
          >
            💘 Date Day Adventure
          </button>
          
          {/* Pub Crawl - Coming Soon */}
          <div className="w-full bg-gray-600/30 text-gray-400 font-medium py-6 px-8 rounded-xl border border-gray-500/30 text-lg cursor-not-allowed">
            🍻 Pub Crawl (Coming Soon)
          </div>
        </div>
      </div>
    </main>
  );
}