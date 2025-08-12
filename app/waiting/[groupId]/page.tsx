// app/waiting/[groupId]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
// If your client helper differs, adjust this import:
import { createClient } from "@/lib/supabase/client";

interface PageProps {
  params: { groupId: string };
}

export default function WaitingPage({ params }: PageProps) {
  const { groupId } = params;
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [teamName, setTeamName] = useState<string>("Your Team");
  const [membersCount, setMembersCount] = useState<number | null>(null);
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [currentRiddleId, setCurrentRiddleId] = useState<string | null>(null);

  // Helper: go when ready
  useEffect(() => {
    if (isStarted && currentRiddleId) {
      router.replace(`/riddle/${currentRiddleId}`);
    }
  }, [isStarted, currentRiddleId, router]);

  // Poll + (optional) realtime
  useEffect(() => {
    let cancelled = false;

    const fetchGroup = async () => {
      const { data: group } = await supabase
        .from("groups")
        .select("team_name, current_riddle_id, started, group_members ( user_id )")
        .eq("id", groupId)
        .single();

      if (!group || cancelled) return;

      setTeamName(group.team_name || "Your Team");
      setCurrentRiddleId(group.current_riddle_id ?? null);

      // If you don't have a 'started' column yet, treat "has riddle id" as started
      const startedFlag =
        typeof group.started === "boolean"
          ? group.started
          : Boolean(group.current_riddle_id);
      setIsStarted(startedFlag);

      setMembersCount(group.group_members?.length ?? null);
    };

    // initial + poll
    fetchGroup();
    const interval = setInterval(fetchGroup, 3000);

    // optional realtime — comment out if you don’t have Realtime enabled
    const channel = supabase
      .channel(`waiting-${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "groups", filter: `id=eq.${groupId}` },
        () => fetchGroup()
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [groupId, supabase]);

  return (
    <main className="min-h-[100svh] md:min-h-dvh bg-neutral-900 text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">⏳</div>
        <h1 className="text-2xl font-bold">{teamName}</h1>
        <p className="text-white/70">
          {isStarted ? "Loading your first riddle..." : "Waiting for the leader to start the game"}
        </p>
        {typeof membersCount === "number" && (
          <p className="text-white/50 text-sm">Players joined: {membersCount}</p>
        )}
      </div>
    </main>
  );
}
