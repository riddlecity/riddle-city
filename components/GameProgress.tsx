'use client';
import { useState, useEffect } from 'react';

interface Props {
  currentRiddleOrder: number;
  totalRiddles: number;
  gameStartTime: string;
}

export default function CleanProgressBar({ currentRiddleOrder, totalRiddles, gameStartTime }: Props) {
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

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [gameStartTime]);

  const progressPercentage = Math.round((currentRiddleOrder / totalRiddles) * 100);

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-lg px-4 py-3 text-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium text-sm">
          Riddle {currentRiddleOrder} of {totalRiddles}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-xs">⏱️</span>
          <span className="text-white font-mono text-sm">{elapsedTime}</span>
        </div>
      </div>
      <div className="w-full h-2 bg-white/20 rounded-sm overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}