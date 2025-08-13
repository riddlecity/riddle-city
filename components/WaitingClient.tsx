// components/WaitingClient.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  groupId: string;
  initialTeamName?: string;
  isLeader?: boolean;
  memberCount?: number;
  playerLimit?: number;
  userId?: string;
};

export default function WaitingClient({ 
  groupId, 
  initialTeamName = "Your Team",
  isLeader = false,
  memberCount: initialMemberCount = 0,
  playerLimit = 2,
  userId
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  
  const [teamName, setTeamName] = useState<string>(initialTeamName);
  const [membersCount, setMembersCount] = useState<number>(initialMemberCount);
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [currentRiddleId, setCurrentRiddleId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // If started, go!
  useEffect(() => {
    if (isStarted && currentRiddleId) {
      router.replace(`/riddle/${currentRiddleId}`);
    }
  }, [isStarted, currentRiddleId, router]);

  useEffect(() => {
    let cancelled = false;
    
    const fetchGroup = async () => {
      try {
        const { data: group, error } = await supabase
          .from("groups")
          .select(`
            team_name, 
            current_riddle_id, 
            game_started, 
            finished,
            active,
            player_limit,
            group_members ( user_id )
          `)
          .eq("id", groupId)
          .single();

        if (error) {
          console.warn("Error fetching group:", error);
          return;
        }

        if (!group || cancelled) return;

        // Update state
        setTeamName(group.team_name || "Your Team");
        setCurrentRiddleId(group.current_riddle_id ?? null);
        setMembersCount(group.group_members?.length ?? 0);

        // Check if game started (using correct column name)
        const gameStarted = Boolean(group.game_started);
        setIsStarted(gameStarted);

        // Check if group is no longer active or finished
        if (group.finished || !group.active) {
          router.replace("/locations");
          return;
        }

      } catch (err) {
        console.warn("Error in fetchGroup:", err);
      }
    };

    // Initial fetch + polling
    fetchGroup();
    const interval = setInterval(fetchGroup, 3000);

    // Optional realtime subscription
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
  }, [groupId, supabase, router]);

  const handleStartGame = async () => {
    if (!isLeader || isStarting) return;
    
    setIsStarting(true);
    setError(null);
    
    // Countdown before starting
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setCountdown(null);
    
    try {
      const response = await fetch('/api/start-adventure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start game');
      }
      
      const data = await response.json();
      
      if (data.currentRiddleId) {
        router.replace(`/riddle/${data.currentRiddleId}`);
      } else {
        throw new Error('No starting riddle found');
      }
      
    } catch (e) {
      console.error("Failed to start game:", e);
      setError(e instanceof Error ? e.message : "Failed to start game");
      setIsStarting(false);
      setCountdown(null);
    }
  };

  // Show countdown if starting
  if (countdown !== null) {
    return (
      <div className="z-10 max-w-md w-full text-center space-y-6">
        <div className="text-8xl animate-pulse">{countdown}</div>
        <h1 className="text-2xl font-bold">{teamName}</h1>
        <p className="text-white/70">Starting your adventure...</p>
      </div>
    );
  }

  return (
    <div className="z-10 max-w-lg w-full text-center space-y-6">
      {/* Team Info */}
      <div className="space-y-2">
        <div className="text-6xl">⏳</div>
        <h1 className="text-3xl font-bold">{teamName}</h1>
      </div>

      {/* Member Count */}
      <div className="bg-white/5 border border-white/15 rounded-2xl p-6">
        <div className="flex items-center justify-center gap-4 mb-2">
          <div className="text-3xl">👥</div>
          <div>
            <div className="text-2xl font-bold">
              {membersCount} / {playerLimit}
            </div>
            <div className="text-white/60 text-sm">Players Joined</div>
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-300">
            {error}
          </div>
        )}

        {isStarted ? (
          <p className="text-white/70 text-lg">Loading your first riddle...</p>
        ) : isLeader ? (
          <div className="space-y-4">
            <button
              onClick={handleStartGame}
              disabled={isStarting}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 
                         hover:from-green-700 hover:to-emerald-700
                         disabled:from-gray-600 disabled:to-gray-700
                         text-white font-semibold px-8 py-4 rounded-xl
                         transition-all duration-200 shadow-lg hover:shadow-xl
                         disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {isStarting ? "Starting..." : "🚀 Start Adventure"}
            </button>
            <p className="text-white/60 text-sm">
              As the team leader, you can start when everyone is ready.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-white/70 text-lg">Waiting for the leader to start the game</p>
            <p className="text-white/50 text-sm">The adventure will begin shortly...</p>
          </div>
        )}
      </div>

      {/* Live indicator */}
      <div className="flex justify-center space-x-1">
        <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
        <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
      </div>
    </div>
  );
}