// components/ResumeGameBanner.tsx (enhanced with better resume logic)
'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface ResumeGameBannerProps {
  onVisibilityChange?: (visible: boolean) => void;
}

interface ActiveGameResponse {
  isActive: boolean;
  isFinished?: boolean;
  currentRiddleId?: string | null;
  groupId?: string;
  gameStarted?: boolean;
  trackId?: string;
  isPaid?: boolean;
  teamName?: string;
}

export default function ResumeGameBanner({ onVisibilityChange }: ResumeGameBannerProps) {
  const [visible, setVisible] = useState(false);
  const [teamName, setTeamName] = useState<string>('Your Team');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [currentRiddleId, setCurrentRiddleId] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const tick = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname() || '';

  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
    return null;
  };

  const updateVisibility = (newVisible: boolean) => {
    setVisible(newVisible);
    onVisibilityChange?.(newVisible);
  };

  // Enhanced resume URL logic
  const getResumeUrl = (): string => {
    if (!groupId) return '/locations';
    
    console.log('🔍 RESUME BANNER: Determining URL...', {
      groupId,
      gameStarted,
      currentRiddleId,
      trackId,
      isPaid
    });
    
    // If not paid yet, something is wrong - go to locations
    if (!isPaid) {
      console.log('🔍 RESUME BANNER: Not paid, going to locations');
      return '/locations';
    }
    
    // If game hasn't started yet, go to actual start page (not game confirmation)
    if (!gameStarted) {
      console.log('🔍 RESUME BANNER: Game not started, going to start page');
      
      // Try to get sessionId from session cookie
      const sessionCookie = getCookie('riddlecity-session');
      let sessionId = null;
      
      if (sessionCookie) {
        try {
          const decoded = JSON.parse(atob(sessionCookie));
          sessionId = decoded.sessionId;
        } catch (e) {
          console.warn('🔍 RESUME BANNER: Could not decode session cookie');
        }
      }
      
      // Extract location and mode from trackId (e.g., "date_barnsley" -> "barnsley/date")
      if (trackId && sessionId) {
        const parts = trackId.split('_');
        if (parts.length >= 2) {
          const mode = parts[0]; // "date" or "pub"
          const location = parts.slice(1).join('_'); // "barnsley" (or multi-part locations)
          return `/${location}/${mode}/start/${sessionId}?session_id=${sessionId}&success=true`;
        }
      }
      
      // Fallback to waiting page if we can't construct the start page URL
      console.log('🔍 RESUME BANNER: Could not construct start page URL, falling back to waiting page');
      return `/waiting/${groupId}`;
    }

    // If game started and has current riddle, go to that riddle
    if (gameStarted && currentRiddleId) {
      console.log('🔍 RESUME BANNER: Game started with riddle, going to riddle');
      return `/riddle/${currentRiddleId}`;
    }    // Fallback to waiting page
    console.log('🔍 RESUME BANNER: Fallback to waiting page');
    return `/waiting/${groupId}`;
  };

  const check = async () => {
    try {
      // Don't show banner on game pages to avoid distraction
      const gamePages = ['/riddle/', '/waiting/', '/adventure-complete/', '/start/', '/join/'];
      const isOnGamePage = gamePages.some(page => pathname.includes(page));
      
      if (isOnGamePage) {
        updateVisibility(false);
        setLoading(false);
        return;
      }

      // Try multiple cookie sources
      let cGroup = getCookie('group_id');
      let cUser = getCookie('user_id');
      let cTeam = getCookie('team_name') || 'Your Team';

      // Fallback to session cookie if individual cookies missing
      const sessionCookie = getCookie('riddlecity-session');
      if (sessionCookie && (!cGroup || !cUser)) {
        try {
          const decoded = JSON.parse(atob(sessionCookie));
          cGroup = cGroup || decoded.groupId;
          cUser = cUser || decoded.userId;
          cTeam = cTeam || decoded.teamName || 'Your Team';
          
          console.log('🔍 RESUME BANNER: Extracted from session cookie:', { cGroup, cUser, cTeam });
        } catch (e) {
          console.log('⚠️ RESUME BANNER: Failed to decode session cookie:', e);
        }
      }

      if (!cGroup || !cUser) {
        updateVisibility(false);
        setLoading(false);
        return;
      }

      console.log('🔍 RESUME BANNER: Checking active game for:', { cGroup, cUser });

      const res = await fetch(`/api/check-active-game?groupId=${encodeURIComponent(cGroup)}&userId=${encodeURIComponent(cUser)}`, { 
        cache: 'no-store' 
      });
      
      if (!res.ok) {
        console.log('⚠️ RESUME BANNER: API request failed:', res.status);
        updateVisibility(false);
        setLoading(false);
        return;
      }

      const data: ActiveGameResponse = await res.json();
      
      console.log('🔍 RESUME BANNER: API response:', data);
      
      if (data.isActive && !data.isFinished) {
        // Prefer API response team name over cookie
        setTeamName(data.teamName || cTeam || 'Your Team');
        setGroupId(data.groupId ?? cGroup);
        setCurrentRiddleId(data.currentRiddleId ?? null);
        setGameStarted(Boolean(data.gameStarted));
        setTrackId(data.trackId ?? null);
        setTrackId(data.trackId ?? null);
        setIsPaid(Boolean(data.isPaid));
        
        // Respect "hide for this tab" if user dismissed earlier
        const hidden = sessionStorage.getItem('resume_banner_hidden') === '1';
        updateVisibility(!hidden);
        
        console.log('✅ RESUME BANNER: Showing banner for active game', {
          gameStarted: data.gameStarted,
          currentRiddleId: data.currentRiddleId,
          trackId: data.trackId,
          isPaid: data.isPaid
        });
      } else {
        console.log('❌ RESUME BANNER: No active game found or game finished');
        updateVisibility(false);
        
        // Clear invalid cookies if game is not active
        if (!data.isActive) {
          document.cookie = 'group_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'team_name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'riddlecity-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
      }
    } catch (error) {
      console.error('❌ RESUME BANNER: Error checking session:', error);
      updateVisibility(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    check(); // initial check
    tick.current = setInterval(check, 15000); // poll every 15s (less frequent)
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [pathname]); // Re-check when pathname changes

  // Don't render anything if loading or not visible
  if (loading || !visible || !groupId) {
    return null;
  }

  const href = getResumeUrl(); // Use enhanced resume URL logic

  const dismiss = () => {
    sessionStorage.setItem('resume_banner_hidden', '1');
    updateVisibility(false);
  };

  // Determine button text and description based on game state
  const getButtonText = () => {
    if (!isPaid) return 'Complete Payment';
    if (!gameStarted) return 'Start Adventure';
    return 'Resume Game';
  };

  const getDescription = () => {
    if (!isPaid) return 'Complete your payment to start the adventure';
    if (!gameStarted) return 'Return to start your adventure';
    return 'Continue your adventure where you left off';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎮</div>
            <div>
              <div className="font-semibold">
                You have an active game as "{teamName}"
              </div>
              <div className="text-sm text-white/80">
                {getDescription()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={href}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
            >
              <span>🚀</span>
              {getButtonText()}
            </Link>
            <button
              onClick={dismiss}
              className="text-white/90 hover:text-white transition-colors duration-200 p-2"
              title="Dismiss banner (this tab)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}