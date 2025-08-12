// components/WaitingClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  groupId: string;
  initialTeamName?: string;
};

export default function WaitingClient({ groupId, initialTeamName = "Your Team" }: Props) {
  const router = useRouter();
  const [teamName, setTeamName] = useState(initialTeamName);
  const [membersCount, setMembersCount] = useState<number | null>(null);
  const [started, setStarted] = useState<boolean>(false);
  const [currentRiddleId, setCurrentRiddleId] = useState<string | null>(null);
  const ticking = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/group-status?groupId=${encodeURIComponent(groupId)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const data = await res.json();
        if (cancelled) return;

        setTeamName(data.teamName ?? "Your Team");
        setMembersCount(typeof data.membersCount === "number" ? data.membersCount : null);
        setStarted(Boolean(data.started));
        setCurrentRiddleId(data.currentRiddleId ?? null);

        if (data.started && data.currentRiddleId) {
          router.replace(`/riddle/${data.currentRiddleId}`);
        }
      } catch {
        // ignore transient errors
      }
    };

    // initial + poll every 2s
    fetchStatus();
    ticking.current = setInterval(fetchStatus, 2000);

    return () => {
      cancelled = true;
      if (ticking.current) clearInterval(ticking.current);
    };
  }, [groupId, router]);

  return (
    <div className="z-10 max-w-md w-full text-center space-y-6">
      <div className="text-6xl">⏳</div>
      <h1 className="text-2xl font-bold">{teamName}</h1>
      <p className="text-white/70">
        {started ? "Loading your first riddle..." : "Waiting for the leader to start the game"}
      </p>
      {typeof membersCount === "number" && (
        <p className="text-white/50 text-sm">Players joined: {membersCount}</p>
      )}
    </div>
  );
}
