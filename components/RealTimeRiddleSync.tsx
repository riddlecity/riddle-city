'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface RealTimeRiddleSyncProps {
  groupId: string;
}

export default function RealTimeRiddleSync({ groupId }: RealTimeRiddleSyncProps) {
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
          const currentUrlId = window.location.pathname.split("/").pop();

          console.log("Riddle change details:", {
            newRiddleId,
            oldRiddleId,
            currentUrlId,
            hasNewRiddle: !!newRiddleId,
            isDifferentFromCurrent: newRiddleId !== currentUrlId,
            shouldRedirect: newRiddleId && newRiddleId !== currentUrlId
          });

          if (newRiddleId && newRiddleId !== currentUrlId) {
            console.log(`🔄 REDIRECTING: ${currentUrlId} → ${newRiddleId}`);
            window.location.href = `/riddle/${newRiddleId}`;
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

    return () => {
      console.log("=== REALTIME CLEANUP ===");
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  return null;
}