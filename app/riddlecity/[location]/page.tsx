// app/riddlecity/[location]/page.tsx
"use client";
import { useRouter } from "next/navigation";
import { use } from "react";

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
    <main className="min-h-screen p-10 text-center bg-neutral-900 text-white">
      <h1 className="text-4xl font-bold mb-6">{location} Riddle Adventures</h1>
      <p className="text-lg mb-10">Choose your experience:</p>
      <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
        <button
          onClick={() => handleModeSelect("date")}
          className="bg-pink-600 hover:bg-pink-700 text-white text-xl py-6 px-10 rounded-lg shadow-lg"
        >
          💘 The Date Day Adventure
        </button>
        <button
          onClick={() => handleModeSelect("pub")}
          className="bg-yellow-600 hover:bg-yellow-700 text-white text-xl py-6 px-10 rounded-lg shadow-lg"
        >
          🍻 The Pub Crawl Quest
        </button>
      </div>
    </main>
  );
}