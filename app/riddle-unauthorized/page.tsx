// app/riddle-unauthorized/page.tsx
import Image from "next/image";
import Link from "next/link";

export default function RiddleUnauthorizedPage() {
  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4 py-16">
      {/* Background maze logo - more visible red tint */}
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

      <div className="text-center relative z-10 max-w-md">
        <div className="text-6xl mb-6">🔒</div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          You Haven't Unlocked This Yet
        </h1>
        
        <p className="text-lg text-white/70 mb-8">
          This riddle is part of an active adventure. Start your journey to unlock the mysteries!
        </p>
        
        <div className="space-y-4">
          <Link
            href="/"
            className="block w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            What is Riddle City? Find Out
          </Link>
          
          <Link
            href="/riddlecity"
            className="block w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 border border-white/20 hover:border-white/40"
          >
            Start Your Adventure
          </Link>
        </div>
      </div>
    </main>
  );
}