// app/waiting/[groupId]/page.tsx
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import WaitingClient from "@/components/WaitingClient";

interface Props {
  params: Promise<{ groupId: string }>; // Changed: params is now a Promise in Next.js 15
}

export default async function WaitingPage({ params }: Props) {
  const { groupId } = await params; // Changed: await the params Promise
  
  // Optional: get initial team name so the page renders something immediately
  const supabase = await createClient();
  const { data: group } = await supabase
    .from("groups")
    .select("team_name")
    .eq("id", groupId)
    .single();

  const initialTeamName = group?.team_name || "Your Team";

  return (
    <main className="min-h-[100svh] md:min-h-dvh bg-neutral-900 text-white flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <Image
          src="/riddle-city-logo2.png"
          alt=""
          width={600}
          height={600}
          className="w-[420px] h-[420px] md:w-[700px] md:h-[700px] object-contain"
        />
      </div>

      {/* Top-left logo link */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
        <Link href="/">
          <Image
            src="/riddle-city-logo.png"
            alt="Riddle City Logo"
            width={60}
            height={60}
            className="md:w-[80px] md:h-[80px] drop-shadow-lg hover:scale-105 transition-transform duration-200"
          />
        </Link>
      </div>

      {/* Client-side poller */}
      <WaitingClient groupId={groupId} initialTeamName={initialTeamName} />
    </main>
  );
}