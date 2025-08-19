'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface RealTimeGameStartProps {
  groupId: string;
}

export default function RealTimeGameStart({ groupId }: RealTimeGameStartProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const subscriptionRef = useRef<any>(null);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncCheck = useRef<Date>(new Date());
  const backupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 🚨 BACKUP SYNC: Check if game started
  const performBackupSync = async () => {
    try {
      console.log('🔄 GAME START SYNC: Checking if game started...');
      
      // Add random delay to prevent all clients checking at exact same time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
      
      const supabase = createClient();
      const { data: group, error } = await supabase
        .from('groups')
        .select('current_riddle_id, finished, game_started, paid, active')
        .eq('id', groupId)
        .single();

      if (error || !group) {
        console.log('🔄 GAME START SYNC: Could not fetch group data', error);
        return;
      }

      console.log('🔄 GAME START SYNC: Group status:', {
        gameStarted: group.game_started,
        currentRiddleId: group.current_riddle_id,
        finished: group.finished,
        paid: group.paid,
        active: group.active
      });

      // Check if we need to redirect
      if (group.finished) {
        console.log(`🔄 GAME START SYNC: Adventure finished, redirecting to completion`);
        try {
          window.location.replace(`/adventure-complete/${groupId}`);
        } catch (e) {
          window.location.href = `/adventure-complete/${groupId}`;
        }
      } else if (group.game_started && group.current_riddle_id) {
        console.log(`🔄 GAME START SYNC: Game started! Redirecting to: ${group.current_riddle_id}`);
        try {
          window.location.replace(`/riddle/${group.current_riddle_id}`);
        } catch (e) {
          window.location.href = `/riddle/${group.current_riddle_id}`;
        }
      } else {
        console.log('🔄 GAME START SYNC: Still waiting for game to start ⏳');
      }

      lastSyncCheck.current = new Date();
    } catch (error) {
      console.error('🔄 GAME START SYNC ERROR:', error);
    }
  };

  // Real-time subscription for game start detection
  const setupRealtimeSubscription = async () => {
    try {
      const supabase = createClient();
      
      // Clean up existing subscription
      if (subscriptionRef.current) {
        await supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }

      console.log("=== GAME START REALTIME SETUP ===");
      console.log("Group ID:", groupId);

      const channel = supabase
        .channel(`game-start-${groupId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'groups',
            filter: `id=eq.${groupId}`,
          },
          (payload) => {
            console.log("=== GAME START UPDATE RECEIVED ===");
            console.log("Full payload:", payload);
            
            const gameStarted = payload.new?.game_started;
            const currentRiddleId = payload.new?.current_riddle_id;
            const isFinished = payload.new?.finished;
            const isPaid = payload.new?.paid;
            
            console.log("Game start details:", {
              gameStarted,
              currentRiddleId,
              isFinished,
              isPaid,
              shouldRedirectToGame: gameStarted && currentRiddleId,
              shouldRedirectToComplete: isFinished
            });

            // Reset connection status and update sync time
            setIsConnected(true);
            setReconnectAttempts(0);
            lastSyncCheck.current = new Date();
            
            // Check if game finished
            if (isFinished) {
              console.log(`🎉 GAME COMPLETED! Redirecting to completion page`);
              try {
                window.location.replace(`/adventure-complete/${groupId}`);
              } catch (e) {
                window.location.href = `/adventure-complete/${groupId}`;
              }
            }
            // Check if game started
            else if (gameStarted && currentRiddleId) {
              console.log(`🚀 GAME STARTED! Redirecting to first riddle: ${currentRiddleId}`);
              try {
                window.location.replace(`/riddle/${currentRiddleId}`);
              } catch (e) {
                window.location.href = `/riddle/${currentRiddleId}`;
              }
            }
            else {
              console.log("⏳ Game not started yet, staying on waiting page");
              // Force refresh the page to ensure we have latest state
              window.location.reload();
            }
          }
        )
        .subscribe((status) => {
          console.log("=== GAME START SUBSCRIPTION STATUS ===");
          console.log("Status:", status);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setReconnectAttempts(0);
            console.log("✅ Successfully subscribed to game start updates");
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setIsConnected(false);
            console.warn("❌ Game start subscription error, will attempt to reconnect");
            scheduleReconnect();
          }
        });

      subscriptionRef.current = channel;
      
    } catch (error) {
      console.error('❌ Failed to setup game start subscription:', error);
      setIsConnected(false);
      scheduleReconnect();
    }
  };

  // Reconnection with exponential backoff
  const scheduleReconnect = () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.warn('🚫 Max game start reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30 seconds
    console.log(`🔄 Scheduling game start reconnect in ${delay}ms (attempt ${reconnectAttempts + 1})`);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts(prev => prev + 1);
      setupRealtimeSubscription();
    }, delay);
  };

  // Keep connection alive
  const setupKeepAlive = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // Send a heartbeat every 30 seconds to keep connection alive
    heartbeatIntervalRef.current = setInterval(() => {
      if (subscriptionRef.current) {
        subscriptionRef.current.send({
          type: 'heartbeat',
          payload: { timestamp: Date.now() }
        });
      }
    }, 30000);
  };

  // Handle visibility changes (mobile background/foreground)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      console.log('📱 Game start detector: App went to background');
    } else {
      console.log('📱 Game start detector: App came to foreground, checking connection');
      setTimeout(() => {
        setupRealtimeSubscription();
      }, 1000);
    }
  };

  // Setup everything on mount
  useEffect(() => {
    setupRealtimeSubscription();
    setupKeepAlive();

    // Backup sync interval
    console.log("🔄 Setting up game start backup sync interval...");
    backupIntervalRef.current = setInterval(() => {
      const timeSinceLastCheck = Date.now() - lastSyncCheck.current.getTime();
      
      // Only run backup sync if real-time hasn't updated recently
      if (timeSinceLastCheck > 25000) { // 25 seconds
        console.log('🔄 Running game start backup sync (real-time silent for >25s)...');
        performBackupSync();
      } else {
        console.log(`🔄 Skipping game start backup sync (real-time active ${Math.round(timeSinceLastCheck/1000)}s ago)`);
      }
    }, 30000); // Every 30 seconds

    // Run initial backup sync after 3 seconds
    setTimeout(() => {
      console.log('🔄 Running initial game start sync check...');
      performBackupSync();
    }, 3000);

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);

    return () => {
      console.log("=== GAME START CLEANUP ===");
      
      // Clean up subscriptions
      if (subscriptionRef.current) {
        const supabase = createClient();
        supabase.removeChannel(subscriptionRef.current);
      }
      
      // Clean up timers
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (backupIntervalRef.current) {
        clearInterval(backupIntervalRef.current);
        console.log("🔄 Game start backup sync interval cleared");
      }

      // Clean up event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
    };
  }, [groupId]);

  // Show connection status for debugging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isConnected 
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {isConnected ? '🔵 Game Start Ready' : `🔴 Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`}
        </div>
      </div>
    );
  }

  return null;
}