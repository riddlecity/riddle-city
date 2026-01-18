"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

interface Location {
  slug: string;
  name: string;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/locations');
        if (response.ok) {
          const data = await response.json();
          setLocations(data.locations || []);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

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
          {loading ? (
            <div className="text-gray-400 py-8">Loading locations...</div>
          ) : locations.length === 0 ? (
            <div className="text-gray-400 py-8">No locations available yet</div>
          ) : (
            locations.map((location) => (
              <Link
                key={location.slug}
                href={`/${location.slug}`}
                className="block w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                {location.name}
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}