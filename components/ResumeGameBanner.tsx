// components/ResumeGameBanner.tsx (refactored to use useGroupSession hook)
'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useGroupSession } from '@/hooks/useGroupSession';

interface ResumeGameBannerProps {
  onVisibilityChange?: (visible: boolean) => void;
}

export default function ResumeGameBanner({ onVisibilityChange }: ResumeGameBannerProps) {
  console.log('🔍 RESUME BANNER: Component rendered on pathname:', usePathname());
  
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname() || '';
  
  // Use the same hook as main page to ensure identical logic!
  const { hasActiveGroup, getResumeUrl, activeSession, isLeader } = useGroupSession();

  const updateVisibility = (newVisible: boolean) => {
    setVisible(newVisible);
    onVisibilityChange?.(newVisible);
  };

  useEffect(() => {
    const check = () => {
      try {
        console.log('🔍 RESUME BANNER: Check triggered', {
          pathname,
          hasActiveGroup,
          activeSession,
          isLeader,
          getResumeUrlResult: getResumeUrl()
        });
        
        // Don't show banner on game pages to avoid distraction
        const gamePages = ['/riddle/', '/waiting/', '/adventure-complete/', '/start/', '/join/'];
        const isOnGamePage = gamePages.some(page => pathname.includes(page));
        
        if (isOnGamePage) {
          console.log('🚫 RESUME BANNER: Hiding banner on game page:', pathname);
          updateVisibility(false);
          setLoading(false);
          return;
        }

        // Check if banner was manually dismissed
        const dismissed = sessionStorage.getItem('resume_banner_hidden');
        if (dismissed) {
          console.log('🚫 RESUME BANNER: Banner manually dismissed');
          updateVisibility(false);
          setLoading(false);
          return;
        }

        // Use the hook's hasActiveGroup logic
        if (hasActiveGroup) {
          console.log('✅ RESUME BANNER: Showing banner - has active group', {
            hasActiveGroup,
            activeSession: !!activeSession,
            resumeUrl: getResumeUrl()
          });
          updateVisibility(true);
        } else {
          console.log('❌ RESUME BANNER: Hiding banner - no active group', {
            hasActiveGroup,
            activeSession: !!activeSession
          });
          updateVisibility(false);
        }
        
        setLoading(false);
      } catch (err) {
        console.warn('🔍 RESUME BANNER: Error in check:', err);
        updateVisibility(false);
        setLoading(false);
      }
    };

    check(); // initial check
    const interval = setInterval(check, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [pathname, hasActiveGroup]); // Re-check when pathname or session changes

  // Don't render anything if loading or not visible
  if (loading || !visible || !hasActiveGroup) {
    return null;
  }

  const href = getResumeUrl(); // Use the SAME getResumeUrl logic as main page!
  console.log('🔍 RESUME BANNER: Banner href calculated:', href);
  
  if (!href) {
    console.log('🚫 RESUME BANNER: No href, hiding banner');
    return null;
  }

  const dismiss = () => {
    sessionStorage.setItem('resume_banner_hidden', '1');
    updateVisibility(false);
  };

  // Determine button text and description based on game state
  const getButtonText = () => {
    if (!activeSession?.paid) return 'Complete Payment';
    if (!activeSession?.gameStarted) {
      return isLeader ? 'Go to Session' : 'Join Team';
    }
    if (activeSession?.finished) return 'View Results';
    return 'Resume Game';
  };

  const getDescription = () => {
    if (!activeSession?.paid) return 'Complete your payment to start the adventure';
    if (!activeSession?.gameStarted) {
      return isLeader 
        ? 'Return to your session page to start the adventure' 
        : 'Waiting for your team leader to start the adventure';
    }
    if (activeSession?.finished) return 'View your completed adventure';
    return 'Continue your adventure where you left off';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎮</div>
            <div>
              <div className="font-semibold">
                You have an active game as "{activeSession?.teamName || 'Your Team'}"
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
              onClick={() => {
                console.log('🔍 RESUME BANNER: Button clicked! Navigating to:', href);
              }}
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