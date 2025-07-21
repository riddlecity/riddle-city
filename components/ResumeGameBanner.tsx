// components/ResumeGameBanner.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ActiveGame {
  groupId: string;
  userId: string;
  teamName: string;
  currentRiddleId: string;
  isFinished: boolean;
}

interface ResumeGameBannerProps {
  onVisibilityChange: (visible: boolean) => void;
}

export default function ResumeGameBanner({ onVisibilityChange }: ResumeGameBannerProps) {
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkForActiveGame();
  }, []);

  // Notify parent when visibility changes
  useEffect(() => {
    onVisibilityChange(isVisible);
  }, [isVisible, onVisibilityChange]);

  const checkForActiveGame = async () => {
    try {
      // Get cookies
      const groupId = getCookie('group_id');
      const userId = getCookie('user_id');
      const teamName = getCookie('team_name');

      console.log('🔍 RESUME BANNER: Checking for active game...', { groupId, userId });

      if (!groupId || !userId) {
        console.log('🔍 RESUME BANNER: No game cookies found');
        setIsLoading(false);
        return;
      }

      // Check if this group is still active
      const response = await fetch(`/api/check-active-game?groupId=${groupId}&userId=${userId}`);
      
      if (!response.ok) {
        console.log('🔍 RESUME BANNER: API check failed');
        setIsLoading(false);
        return;
      }

      const gameData = await response.json();
      console.log('🔍 RESUME BANNER: Game data received:', gameData);

      if (gameData.isActive && !gameData.isFinished) {
        setActiveGame({
          groupId,
          userId,
          teamName: teamName || 'Your Team',
          currentRiddleId: gameData.currentRiddleId,
          isFinished: gameData.isFinished
        });
        setIsVisible(true);
        console.log('✅ RESUME BANNER: Active game found, showing banner');
      } else {
        console.log('🔍 RESUME BANNER: No active game or game finished');
        // Clear old cookies if game is finished
        if (gameData.isFinished) {
          clearGameCookies();
        }
        setIsVisible(false);
      }
    } catch (error) {
      console.error('❌ RESUME BANNER: Error checking active game:', error);
      setIsVisible(false);
    } finally {
      setIsLoading(false);
    }
  };

  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  };

  const clearGameCookies = () => {
    document.cookie = 'group_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'team_name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    console.log('🗑️ RESUME BANNER: Game cookies cleared');
  };

  const dismissBanner = () => {
    setIsVisible(false);
    // Optionally clear cookies when user dismisses
    clearGameCookies();
  };

  // Don't render anything while loading or if no active game
  if (isLoading || !isVisible || !activeGame) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎮</div>
            <div>
              <div className="font-semibold">
                You have an active game as "{activeGame.teamName}"
              </div>
              <div className="text-sm text-white/80">
                Continue your adventure where you left off
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href={`/riddle/${activeGame.currentRiddleId}`}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
            >
              <span>🚀</span>
              Resume Game
            </Link>
            
            <button
              onClick={dismissBanner}
              className="text-white/70 hover:text-white transition-colors duration-200 p-2"
              title="Dismiss banner"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}