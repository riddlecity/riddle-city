'use client';

import { useState, useEffect } from 'react';

interface GameProgressProps {
  currentRiddleOrder: number;
  totalRiddles: number;
  gameStartTime: string; // ISO string from group creation
}

export default function GameProgress({ currentRiddleOrder, totalRiddles, gameStartTime }: GameProgressProps) {
  const [elapsedTime, setElapsedTime] = useState('00:00');

  useEffect(() => {
    const updateTimer = () => {
      const start = new Date(gameStartTime);
      const now = new Date();
      const diff = now.getTime() - start.getTime();
      
      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    // Update immediately
    updateTimer();
    
    // Update every second
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [gameStartTime]);

  const progressPercentage = Math.round((currentRiddleOrder / totalRiddles) * 100);

  return (
    <div className="fixed top-4 right-4 md:top-6 md:right-6 z-20">
      <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white shadow-lg">
        {/* Progress indicator */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1">
            <span className="text-white/70 text-sm font-medium">
              Riddle {currentRiddleOrder} of {totalRiddles}
            </span>
          </div>
          <div className="text-white/50 text-xs">
            {progressPercentage}%
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-32 md:w-40 h-2 bg-white/20 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Timer */}
        <div className="flex items-center gap-2">
          <span className="text-xs">⏱️</span>
          <span className="text-sm font-mono text-white/80">
            {elapsedTime}
          </span>
        </div>
      </div>
    </div>
  );
}