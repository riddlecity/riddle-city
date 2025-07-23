// components/GameProgress.tsx
'use client';

interface GameProgressProps {
  currentRiddleOrder: number;
  totalRiddles: number;
  gameStartTime?: string; // Keep optional for backward compatibility
}

export default function GameProgress({ currentRiddleOrder, totalRiddles }: GameProgressProps) {
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
      {/* Progress info */}
      <div className="flex items-center justify-center mb-2">
        <span className="text-white font-medium text-sm">
          Riddle {currentRiddleOrder} of {totalRiddles}
        </span>
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