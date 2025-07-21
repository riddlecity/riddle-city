"use client";
import Link from "next/link";
import Image from "next/image";

export default function RiddleCityPage() {
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
          href="/"
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium"
        >
          <span className="text-lg">←</span>
          <span className="hidden sm:inline">Back to Home</span>
          <span className="sm:hidden">Back</span>
        </Link>
      </div>

      {/* Main content centered */}
      <div className="w-full text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-12 text-center tracking-tight leading-tight">
          Choose Your City
        </h1>
        
        <div className="w-full max-w-md mx-auto space-y-4">
          {/* Available city */}
          <Link
            href="/riddlecity/barnsley"
            className="block w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
          >
            Barnsley
          </Link>
          
          {/* Coming soon cities */}
          <div className="space-y-3">
            {['Nottingham', 'Sheffield', 'Leeds'].map((city) => (
              <div
                key={city}
                className="w-full bg-gray-600/30 text-gray-400 font-medium py-4 px-6 rounded-xl border border-gray-500/30 text-lg cursor-not-allowed"
              >
                {city} (Coming Soon)
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}