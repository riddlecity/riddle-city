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

  // Simplified color progression: red -> orange -> green
  const getProgressColor = (percentage: number) => {
    if (percentage <= 33) {
      return 'bg-red-500';
    } else if (percentage <= 66) {
      return 'bg-orange-500';
    } else {
      return 'bg-green-500';
    }
  };

  return (
    <div className="w-full bg-black/80 px-4 py-3">
      {/* Top info row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium text-sm">
          Riddle {currentRiddleOrder} of {totalRiddles}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs">🕐</span>
          <span className="text-white font-mono text-sm">{elapsedTime}</span>
        </div>
      </div>
      
      {/* Full width progress bar */}
      <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getProgressColor(progressPercentage)} transition-all duration-500 ease-out`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}