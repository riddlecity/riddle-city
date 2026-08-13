// components/SessionRecovery.tsx
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// Some browsers (notably iOS Safari with strict cookie/tracking prevention)
// can clear the JS-set session cookies while localStorage survives. When the
// riddle page can't find session cookies, it would otherwise show the
// "Loading your adventure..." spinner forever with no way to recover. This
// component checks localStorage (written by the join page as a resilience
// backup) and, if a valid session is found there, restores the cookies and
// reloads so the page can render normally instead of getting stuck.
export default function SessionRecovery() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // If the URL carries game_data, CookieHandler is already handling
    // restoring the session from it - don't race it with a second reload.
    if (searchParams?.get('game_data')) return;

    try {
      const lsSession = localStorage.getItem('riddlecity-session');
      const lsExpiry = localStorage.getItem('riddlecity-session-expiry');

      if (!lsSession || !lsExpiry || Date.now() >= Number(lsExpiry)) {
        return;
      }

      const sessionData = JSON.parse(lsSession);
      if (!sessionData?.groupId || !sessionData?.userId) return;

      console.log('🔄 SESSION RECOVERY: Cookies missing, restoring session from localStorage');

      const isProduction = window.location.hostname !== 'localhost';
      const maxAge = 48 * 60 * 60; // 48 hours
      const encoded = btoa(JSON.stringify(sessionData));
      const cookieOptions = `max-age=${maxAge}; path=/; ${isProduction ? 'secure; ' : ''}samesite=lax`;

      document.cookie = `riddlecity-session=${encoded}; ${cookieOptions}`;
      document.cookie = `group_id=${sessionData.groupId}; ${cookieOptions}`;
      document.cookie = `user_id=${sessionData.userId}; ${cookieOptions}`;
      if (sessionData.teamName) {
        document.cookie = `team_name=${sessionData.teamName}; ${cookieOptions}`;
      }

      window.location.reload();
    } catch (e) {
      console.error('❌ SESSION RECOVERY: Failed to restore session from localStorage', e);
    }
  }, [searchParams]);

  return null;
}
