import Link from "next/link";
import Image from "next/image";

export default function BarnsleyModesPage() {
  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4 py-16 relative">
      {/* Header with logo and title */}
      <div className="relative z-10 text-center mb-12 md:mb-16">
        <div className="flex flex-col items-center gap-4 md:gap-6">
          <Image
            src="/riddle-city-logo.png"
            alt="Riddle City Logo"
            width={120}
            height={120}
            className="md:w-[140px] md:h-[140px] drop-shadow-lg"
            priority
          />
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-2 tracking-tight">
              Riddle City Barnsley
            </h1>
            <p className="text-lg md:text-xl text-white/70 font-medium">
              Choose Your Adventure
            </p>
          </div>
        </div>
      </div>
      
      {/* Adventure options */}
      <div className="grid gap-6 w-full max-w-sm relative z-10">
        <Link
          href="/riddlecity/barnsley/date"
          className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 transition-all duration-200 text-white font-semibold px-6 py-4 rounded-full shadow-lg hover:shadow-xl text-center transform hover:scale-105"
        >
          <span className="inline-flex items-center gap-2">
            <span className="text-pink-200">💘</span> Date Day Adventure
          </span>
        </Link>
        
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold px-6 py-4 rounded-full shadow-lg text-center opacity-75 cursor-not-allowed">
          <span className="inline-flex items-center gap-2">
            🍻 Pub Crawl <span className="text-yellow-300 font-bold">(Coming Soon)</span>
          </span>
        </div>
      </div>
      
      {/* Back link */}
      <div className="mt-12 relative z-10">
        <Link
          href="/riddlecity"
          className="text-white/60 hover:text-white/80 transition-colors duration-200 text-sm font-medium"
        >
          ← Back to Cities
        </Link>
      </div>
    </main>
  );
}