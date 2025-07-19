// components/CookieHandler.tsx
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function CookieHandler() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const gameData = searchParams.get('game_data');
    
    if (gameData) {
      try {
        console.log('🍪 COOKIE HANDLER: Processing game data from URL...');
        
        // Decode the game data
        const decoded = JSON.parse(atob(gameData));
        console.log('🍪 COOKIE HANDLER: Decoded data:', decoded);
        
        const { groupId, userId, teamName } = decoded;
        
        if (groupId && userId) {
          // Set cookies client-side
          const expires = new Date();
          expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
          const cookieOptions = `expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
          
          document.cookie = `group_id=${groupId}; ${cookieOptions}`;
          document.cookie = `user_id=${userId}; ${cookieOptions}`;
          
          if (teamName) {
            document.cookie = `team_name=${teamName}; ${cookieOptions}`;
          }
          
          console.log('✅ COOKIE HANDLER: Cookies set successfully:', { groupId, userId, teamName });
          
          // Clean up the URL by removing the game_data parameter
          const url = new URL(window.location.href);
          url.searchParams.delete('game_data');
          window.history.replaceState({}, '', url.toString());
          
          console.log('🔄 COOKIE HANDLER: URL cleaned up');
          
          // Force a page refresh to apply the cookies
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      } catch (error) {
        console.error('❌ COOKIE HANDLER: Error processing game data:', error);
      }
    }
  }, [searchParams]);

  return null; // This component doesn't render anything
}