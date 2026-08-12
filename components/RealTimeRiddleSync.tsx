'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Group } from '@/types/group';

interface RealTimeRiddleSyncProps {
  groupId: string;
}

export default function RealTimeRiddleSync({ groupId }: RealTimeRiddleSyncProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const subscriptionRef = useRef<any>(null);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncCheck = useRef<Date>(new Date());
  const backupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 🚨 KEEP YOUR WORKING BACKUP SYNC MECHANISM
  const performBackupSync = async () => {
    try {
      console.log('🔄 BACKUP SYNC: Checking group status...');
      
      const supabase = createClient();
      const { data: group, error } = await supabase
        .from('groups')
        .select('current_riddle_id, finished, completed_at')
        .eq('id', groupId)
        .single() as { data: Pick<Group, 'current_riddle_id' | 'finished'> & { completed_at?: string } | null, error: any };

      if (error || !group) {
        console.log('🔄 BACKUP SYNC: Could not fetch group data', error);
        return;
      }

      const currentUrlId = window.location.pathname.split("/").pop();
      
      console.log('🔄 BACKUP SYNC: Status check:', {
        currentUrlId,
        dbRiddleId: group.current_riddle_id,
        finished: group.finished,
        needsRedirect: group.current_riddle_id !== currentUrlId
      });

      // Check if game is finished and redirect to completion page
      if (group.finished && !window.location.pathname.includes('/adventure-complete/')) {
        console.log(`🔄 BACKUP SYNC: Adventure finished, redirecting to completion page`);
        window.location.href = `/adventure-complete/${groupId}`;
        return;
      }

      // Check if we need to redirect to different riddle
      if (!group.finished && group.current_riddle_id !== currentUrlId) {
        console.log(`🔄 BACKUP SYNC: Riddle mismatch detected! URL: ${currentUrlId}, DB: ${group.current_riddle_id}`);
        console.log(`🔄 BACKUP SYNC: Redirecting to correct riddle: ${group.current_riddle_id}`);
        window.location.href = `/riddle/${group.current_riddle_id}`;
        return;
      }
      
      console.log('🔄 BACKUP SYNC: In sync ✅');

      lastSyncCheck.current = new Date();
    } catch (error) {
      console.error('🔄 BACKUP SYNC ERROR:', error);
    }
  };

  // Shared handler for both the postgres_changes and broadcast paths - redirects
  // this device to the new riddle (or completion page) the moment we learn the
  // group has moved on.
  const handleRiddleChange = (newRiddleId?: string, isFinished?: boolean) => {
    const currentUrlId = window.location.pathname.split("/").pop();

    console.log("Riddle change details:", {
      newRiddleId,
      currentUrlId,
      isFinished,
      shouldRedirect: newRiddleId && newRiddleId !== currentUrlId
    });

    // Reset connection status and update sync time
    setIsConnected(true);
    setReconnectAttempts(0);
    lastSyncCheck.current = new Date();

    // Check if game just finished
    if (isFinished && !window.location.pathname.includes('/adventure-complete/')) {
      console.log(`🔄 REALTIME: Adventure finished, redirecting to completion page`);
      window.location.href = `/adventure-complete/${groupId}`;
      return;
    }

    // Check if riddle changed
    if (newRiddleId && newRiddleId !== currentUrlId) {
      console.log(`🔄 REALTIME: Redirecting: ${currentUrlId} → ${newRiddleId}`);
      window.location.href = `/riddle/${newRiddleId}`;
    } else {
      console.log("❌ NO REDIRECT:", {
        reason: !newRiddleId ? "No new riddle ID" : "Same as current URL",
        isFinished
      });
    }
  };

  // Enhanced real-time subscription with mobile-friendly reconnection
  const setupRealtimeSubscription = async () => {
    try {
      const supabase = createClient();
      
      // Clean up existing subscription
      if (subscriptionRef.current) {
        await supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }

      console.log("=== REALTIME SYNC SETUP ===");
      console.log("Group ID:", groupId);

      const channel = supabase
        .channel(`riddle-updates-${groupId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: groupId },
            private: false
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'groups',
            filter: `id=eq.${groupId}`,
          },
          (payload) => {
            console.log("=== REALTIME UPDATE RECEIVED (postgres_changes) ===");
            console.log("Full payload:", payload);

            const newRiddleId = payload.new?.current_riddle_id;
            const isFinished = payload.new?.finished;

            handleRiddleChange(newRiddleId, isFinished);
          }
        )
        .on(
          'broadcast',
          { event: 'riddle_update' },
          (message) => {
            // 🚀 Low-latency path: every riddle-advancing API route (answer
            // submission, QR scan, skip, go-back) broadcasts this event
            // directly over the websocket the instant it updates the group,
            // so we don't have to wait on postgres_changes replication (which
            // requires the `groups` table to be added to the Supabase
            // realtime publication) or the slower polling fallback below.
            console.log("=== REALTIME UPDATE RECEIVED (broadcast) ===");
            console.log("Full payload:", message);

            const payload = message.payload as { newRiddleId?: string; isCompleted?: boolean } | undefined;
            handleRiddleChange(payload?.newRiddleId, payload?.isCompleted);
          }
        )
        .subscribe((status) => {
          console.log("=== REALTIME SUBSCRIPTION STATUS ===");
          console.log("Status:", status);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setReconnectAttempts(0);
            console.log("✅ Successfully subscribed to riddle updates");
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setIsConnected(false);
            console.warn("❌ Realtime subscription error, will attempt to reconnect");
            scheduleReconnect();
          }
        });

      subscriptionRef.current = channel;
      
    } catch (error) {
      console.error('❌ Failed to setup real-time subscription:', error);
      setIsConnected(false);
      scheduleReconnect();
    }
  };

  // Improved reconnection with exponential backoff
  const scheduleReconnect = () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.warn('🚫 Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30 seconds
    console.log(`🔄 Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts + 1})`);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts(prev => prev + 1);
      setupRealtimeSubscription();
    }, delay);
  };

  // Keep the app active with invisible activity
  const setupKeepAlive = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // Send a heartbeat every 30 seconds to keep connection alive
    heartbeatIntervalRef.current = setInterval(() => {
      if (subscriptionRef.current) {
        // Ping the channel to keep it alive
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
      console.log('📱 App went to background');
    } else {
      console.log('📱 App came to foreground, checking connection');
      // Force reconnection when app comes back to foreground
      setTimeout(() => {
        setupRealtimeSubscription();
        performBackupSync(); // Also run backup sync immediately
      }, 1000);
    }
  };

  // Listen for manual sync triggers (from answer submissions, QR scans, etc)
  const handleManualSyncTrigger = () => {
    console.log('🔄 Manual sync triggered by user action');
    performBackupSync();
  };

  // Setup everything on mount
  useEffect(() => {
    setupRealtimeSubscription();
    setupKeepAlive();

    // 🚨 KEEP YOUR WORKING BACKUP SYNC INTERVAL
    console.log("🔄 Setting up backup sync interval...");
    backupIntervalRef.current = setInterval(() => {
      const timeSinceLastCheck = Date.now() - lastSyncCheck.current.getTime();
      
      // Only run backup sync if real-time hasn't updated recently (reduced to 10s)
      if (timeSinceLastCheck > 10000) { // 10 seconds (was 25)
        console.log('🔄 Running backup sync check (real-time silent for >10s)...');
        performBackupSync();
      } else {
        console.log(`🔄 Skipping backup sync (real-time active ${Math.round(timeSinceLastCheck/1000)}s ago)`);
      }
    }, 10000); // Every 10 seconds (was 30)

    // Run initial backup sync after 2 seconds (was 5)
    setTimeout(() => {
      console.log('🔄 Running initial backup sync check...');
      performBackupSync();
    }, 2000);

    // Listen for visibility changes (mobile background/foreground)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);

    // Listen for custom sync trigger events
    window.addEventListener('riddleSyncTrigger', handleManualSyncTrigger);

    return () => {
      console.log("=== REALTIME CLEANUP ===");
      
      // Clean up subscriptions - FIXED: createClient() is synchronous
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
        console.log("🔄 Backup sync interval cleared");
      }

      // Clean up event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
      window.removeEventListener('riddleSyncTrigger', handleManualSyncTrigger);
    };
  }, [groupId]);

  // Show connection status for debugging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isConnected 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {isConnected ? '🟢 Connected' : `🔴 Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`}
        </div>
      </div>
    );
  }

  return null;
}