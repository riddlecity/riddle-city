// components/WaitingClient.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Type definitions
type DatabaseGroup = {
  id: string;
  team_name: string;
  game_started: boolean;
  current_riddle_id: string | null;
  finished: boolean;
  active: boolean;
  paid: boolean;
  group_members?: { user_id: string }[];
};

type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: DatabaseGroup | null;
  old: DatabaseGroup | null;
};

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
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);

  // Enhanced redirect logic - handle both game start and mid-game joins
  useEffect(() => {
    if (isRedirecting) return; // Prevent multiple redirects

    if (isStarted && currentRiddleId) {
      console.log('🔄 WAITING: Game started, redirecting to current riddle:', currentRiddleId);
      setIsRedirecting(true);
      // Use window.location.href for more reliable redirect
      window.location.href = `/riddle/${currentRiddleId}`;
    }
  }, [isStarted, currentRiddleId, isRedirecting]);

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
            paid,
            group_members ( user_id )
          `)
          .eq("id", groupId)
          .single();

        if (error) {
          console.warn("Error fetching group:", error);
          return;
        }

        if (!group || cancelled) return;

        console.log('🔍 WAITING: Fetched group data:', {
          gameStarted: group.game_started,
          currentRiddleId: group.current_riddle_id,
          finished: group.finished,
          active: group.active,
          paid: group.paid
        });

        // Update state
        setTeamName(group.team_name || "Your Team");
        setCurrentRiddleId(group.current_riddle_id ?? null);
        setMembersCount(group.group_members?.length ?? 0);

        // Check if group is no longer active, finished, or not paid
        if (group.finished) {
          console.log('🔄 WAITING: Game finished, redirecting to completion');
          router.replace(`/adventure-complete/${groupId}`);
          return;
        }

        if (!group.active) {
          console.log('🔄 WAITING: Group not active, redirecting to locations');
          router.replace("/locations");
          return;
        }

        if (!group.paid) {
          console.log('🔄 WAITING: Group not paid, redirecting to locations');
          router.replace("/locations");
          return;
        }

        // Check if game started (using correct column name)
        const gameStarted = Boolean(group.game_started);
        setIsStarted(gameStarted);

        // ENHANCED: If game started and we have a current riddle, redirect immediately
        if (gameStarted && group.current_riddle_id && !isRedirecting) {
          console.log('🔄 WAITING: Game already in progress, redirecting immediately to:', group.current_riddle_id);
          setIsRedirecting(true);
          window.location.href = `/riddle/${group.current_riddle_id}`;
          return;
        }

      } catch (err) {
        console.warn("Error in fetchGroup:", err);
      }
    };

    // Initial fetch + polling (more frequent polling)
    fetchGroup();
    const interval = setInterval(fetchGroup, 2000); // Poll every 2 seconds instead of 3

    // Enhanced realtime subscription with better debugging
    const channel = supabase
      .channel(`waiting-${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "groups", filter: `id=eq.${groupId}` },
        (payload: RealtimePayload) => {
          console.log('🔄 WAITING: Real-time update received:', {
            event: payload.eventType,
            oldGameStarted: payload.old?.game_started,
            newGameStarted: payload.new?.game_started,
            oldRiddleId: payload.old?.current_riddle_id,
            newRiddleId: payload.new?.current_riddle_id
          });
          
          // Immediate check if game just started
          if (payload.eventType === 'UPDATE' && 
              payload.new?.game_started && 
              !payload.old?.game_started && 
              payload.new?.current_riddle_id) {
            console.log('🚀 WAITING: Game just started via real-time, redirecting immediately!');
            setIsRedirecting(true);
            window.location.href = `/riddle/${payload.new.current_riddle_id}`;
            return;
          }
          
          // Always refetch to ensure we have latest state
          fetchGroup();
        }
      )
      .subscribe((status) => {
        console.log('🔄 WAITING: Real-time subscription status:', status);
      });

    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [groupId, supabase, router, isRedirecting]);

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
        console.log('🔄 WAITING: Leader started game, redirecting to:', data.currentRiddleId);
        setIsRedirecting(true);
        window.location.href = `/riddle/${data.currentRiddleId}`;
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

  // Show loading state during redirect
  if (isRedirecting) {
    return (
      <div className="z-10 max-w-md w-full text-center space-y-6">
        <div className="text-6xl animate-spin">🎮</div>
        <h1 className="text-2xl font-bold">{teamName}</h1>
        <p className="text-white/70">Loading your adventure...</p>
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