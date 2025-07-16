import Image from "next/image";
import Link from "next/link";

export default function Home() {
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
        Whether you’re planning a creative date or exploring the pub scene with friends, each trail collaborates with local businesses to make the journey unforgettable.
      </p>
    </main>
  );
}
