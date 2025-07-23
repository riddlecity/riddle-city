// components/RealTimeRiddleSync.tsx
'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface RealTimeRiddleSyncProps {
  groupId: string;
}

export default function RealTimeRiddleSync({ groupId }: RealTimeRiddleSyncProps) {
  const lastSyncCheck = useRef<Date>(new Date());
  const backupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 🚨 NEW: Backup sync mechanism - checks every 30 seconds
  const performBackupSync = async () => {
    try {
      console.log('🔄 BACKUP SYNC: Checking group status...');
      
      const supabase = createClient();
      const { data: group, error } = await supabase
        .from('groups')
        .select('current_riddle_id, finished, completed_at')
        .eq('id', groupId)
        .single();

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

      // Check if we need to redirect
      if (group.current_riddle_id !== currentUrlId) {
        console.log(`🔄 BACKUP SYNC: Riddle mismatch detected! URL: ${currentUrlId}, DB: ${group.current_riddle_id}`);
        
        if (group.finished) {
          console.log(`🔄 BACKUP SYNC: Adventure finished, redirecting to completion page`);
          window.location.href = `/adventure-complete/${groupId}`;
        } else {
          console.log(`🔄 BACKUP SYNC: Redirecting to correct riddle: ${group.current_riddle_id}`);
          window.location.href = `/riddle/${group.current_riddle_id}`;
        }
      } else {
        console.log('🔄 BACKUP SYNC: In sync ✅');
      }

      lastSyncCheck.current = new Date();
    } catch (error) {
      console.error('🔄 BACKUP SYNC ERROR:', error);
    }
  };

  useEffect(() => {
    console.log("=== REALTIME SYNC SETUP ===");
    console.log("Group ID:", groupId);
    
    const supabase = createClient();
    const channel = supabase
      .channel(`riddle-updates-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'groups',
          filter: `id=eq.${groupId}`,
        },
        (payload) => {
          console.log("=== REALTIME UPDATE RECEIVED ===");
          console.log("Full payload:", payload);
          
          const newRiddleId = payload.new?.current_riddle_id;
          const oldRiddleId = payload.old?.current_riddle_id;
          const isFinished = payload.new?.finished;
          const currentUrlId = window.location.pathname.split("/").pop();
          
          console.log("Riddle change details:", {
            newRiddleId,
            oldRiddleId,
            currentUrlId,
            isFinished,
            hasNewRiddle: !!newRiddleId,
            isDifferentFromCurrent: newRiddleId !== currentUrlId,
            shouldRedirect: newRiddleId && newRiddleId !== currentUrlId
          });

          // 🚨 ENHANCED: Update last sync check time when real-time works
          lastSyncCheck.current = new Date();
          
          if (newRiddleId && newRiddleId !== currentUrlId) {
            if (isFinished) {
              console.log(`🔄 REDIRECTING TO COMPLETION: ${currentUrlId} → adventure-complete/${groupId}`);
              window.location.href = `/adventure-complete/${groupId}`;
            } else {
              console.log(`🔄 REDIRECTING: ${currentUrlId} → ${newRiddleId}`);
              window.location.href = `/riddle/${newRiddleId}`;
            }
          } else {
            console.log("❌ NO REDIRECT:", {
              reason: !newRiddleId ? "No new riddle ID" : "Same as current URL"
            });
          }
        }
      )
      .subscribe((status) => {
        console.log("=== REALTIME SUBSCRIPTION STATUS ===");
        console.log("Status:", status);
        if (status === 'SUBSCRIBED') {
          console.log("✅ Successfully subscribed to riddle updates");
        } else if (status === 'CHANNEL_ERROR') {
          console.log("❌ Realtime subscription error");
        }
      });

    // 🚨 NEW: Set up backup sync interval (every 30 seconds)
    console.log("🔄 Setting up backup sync interval...");
    backupIntervalRef.current = setInterval(() => {
      const timeSinceLastCheck = Date.now() - lastSyncCheck.current.getTime();
      
      // Only run backup sync if real-time hasn't updated recently
      if (timeSinceLastCheck > 25000) { // 25 seconds
        console.log('🔄 Running backup sync check (real-time silent for >25s)...');
        performBackupSync();
      } else {
        console.log(`🔄 Skipping backup sync (real-time active ${Math.round(timeSinceLastCheck/1000)}s ago)`);
      }
    }, 30000); // Every 30 seconds

    // Run initial backup sync after 5 seconds
    setTimeout(() => {
      console.log('🔄 Running initial backup sync check...');
      performBackupSync();
    }, 5000);

    return () => {
      console.log("=== REALTIME CLEANUP ===");
      if (backupIntervalRef.current) {
        clearInterval(backupIntervalRef.current);
        backupIntervalRef.current = null;
        console.log("🔄 Backup sync interval cleared");
      }
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  return null;
}