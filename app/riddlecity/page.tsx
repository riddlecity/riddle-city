import Link from "next/link";

export default function LocationsPage() {
  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4 py-16">
      <h1 className="text-4xl sm:text-5xl font-extrabold mb-10 text-center tracking-tight">
        Choose Your City
      </h1>

      <div className="grid gap-6 w-full max-w-sm">
        {/* Barnsley - Active */}
        <Link
          href="/riddlecity/barnsley"
          className="bg-red-600 hover:bg-red-500 transition-colors duration-200 text-white font-semibold px-6 py-4 rounded-full shadow-md text-center"
        >
          Barnsley
        </Link>

        {/* Disabled Locations */}
        {[
          { city: "Nottingham" },
          { city: "Sheffield" },
          { city: "Leeds" },
        ].map(({ city }) => (
          <div
            key={city}
            className="bg-gray-700 text-white/50 px-6 py-4 rounded-full shadow-inner text-center cursor-not-allowed"
          >
            {city} (Coming Soon)
          </div>
        ))}
      </div>
    </main>
  );
}
