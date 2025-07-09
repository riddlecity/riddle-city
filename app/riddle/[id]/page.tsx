import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import type { Metadata, ResolvingMetadata } from "next";

type Props = {
  params: { id: string };
};

// ✅ Optional: Dynamic metadata (Title, etc.)
export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  return {
    title: `Riddle – ${params.id}`,
  };
}

export default async function RiddlePage({ params }: Props) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("riddles")
    .select("riddle_text, qr_hint")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return (
      <main className="min-h-screen bg-neutral-900 text-white flex items-center justify-center px-6 py-10">
        <p className="text-center text-lg text-red-400">Riddle not found</p>
      </main>
    );
  }

  const { riddle_text, qr_hint } = data;

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-4 py-16">
      <Image
        src="/riddle-city-logo.png"
        alt="Riddle City Logo"
        width={260}
        height={260}
        className="mb-10 drop-shadow-2xl"
        priority
      />

      <section className="bg-white/5 backdrop-blur-sm text-white p-8 sm:p-10 rounded-3xl shadow-2xl max-w-xl w-full border border-white/10">
        <p className="text-lg sm:text-xl text-center font-medium leading-relaxed">
          {riddle_text}
        </p>

        <details className="mt-6 group">
          <summary className="cursor-pointer text-white/80 hover:text-white text-center text-base sm:text-lg font-semibold transition-colors duration-200">
            💡 Show Hint
          </summary>
          <div className="mt-3 text-sm text-gray-300 text-center group-open:animate-fade-in">
            {qr_hint}
          </div>
        </details>
      </section>
    </main>
  );
}
