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
        className="mb-8 drop-shadow-xl"
        priority
      />

      <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 text-center tracking-tight">
        Welcome to Riddle City
      </h1>

      <p className="text-lg sm:text-xl text-neutral-300 text-center max-w-xl mb-8">
        Scan a QR code to begin your journey. Solve riddles. Unlock locations. Win bragging rights.
      </p>

      <Link
        href="/riddle/barnsley_r1"
        className="bg-blue-600 hover:bg-blue-500 transition-colors duration-200 text-white font-semibold px-6 py-3 rounded-full shadow-md"
      >
        Start the Barnsley Crawl →
      </Link>
    </main>
  );
}
