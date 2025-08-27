'use client';

import { useState } from 'react';

interface StartAdventureButtonProps {
  groupId: string;
  riddleHref: string;
}

export default function StartAdventureButton({ groupId, riddleHref }: StartAdventureButtonProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (isStarting) return;
    
    setIsStarting(true);
    setError(null);
    
    try {
      console.log('🚀 START BUTTON: Calling start-adventure API for group:', groupId);
      
      const response = await fetch('/api/start-adventure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start adventure');
      }
      
      console.log('✅ START BUTTON: Adventure started successfully:', data);
      
      // Redirect to the first riddle
      if (data.currentRiddleId) {
        console.log('🔄 START BUTTON: Redirecting to riddle:', data.currentRiddleId);
        window.location.href = `/riddle/${data.currentRiddleId}`;
      } else {
        // Fallback to the original riddle href
        window.location.href = riddleHref;
      }
      
    } catch (e) {
      console.error('❌ START BUTTON: Failed to start adventure:', e);
      setError(e instanceof Error ? e.message : 'Failed to start adventure');
      setIsStarting(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleStart}
        disabled={isStarting}
        className={`inline-flex items-center justify-center w-full md:w-auto
                   ${isStarting 
                     ? 'bg-gray-600 cursor-not-allowed' 
                     : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                   }
                   text-white font-semibold px-8 py-4 rounded-xl
                   transition-all duration-200 shadow-lg hover:shadow-xl text-lg
                   disabled:opacity-70`}
      >
        {isStarting ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Starting...
          </>
        ) : (
          '🚀 Start'
        )}
      </button>
      
      {error && (
        <div className="text-red-400 text-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
}
