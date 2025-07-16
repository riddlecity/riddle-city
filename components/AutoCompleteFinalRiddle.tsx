'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AutoCompleteProps {
  groupId: string;
  isLeader: boolean;
  totalTime: string;
  teamSize: number;
  adventureType: string;
  cityName: string;
}

export default function AutoComplete({ groupId, isLeader, totalTime, teamSize, adventureType, cityName }: AutoCompleteProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Auto-complete if leader
    if (isLeader && !isCompleting) {
      handleAutoComplete();
    }
    
    // Show celebration for all users
    const timer = setTimeout(() => {
      setShowCelebration(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [isLeader]);

  const handleAutoComplete = async () => {
    setIsCompleting(true);

    try {
      const res = await fetch('/api/complete-adventure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error('Failed to complete adventure:', data.error);
      }
    } catch (error) {
      console.error('Complete adventure error:', error);
    }

    setIsCompleting(false);
  };

  const handleContinue = () => {
    router.push(`/adventure-complete/${groupId}`);
  };

  return (
    <div className={`transition-all duration-1000 ${showCelebration ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
      {/* Celebration Section */}
      <div className="text-center mb-8">
        <div className="text-6xl md:text-8xl mb-4 animate-bounce">🎉</div>
        <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
          Adventure Complete!
        </h2>
        <p className="text-lg md:text-xl text-white/70 mb-6">
          Congratulations on completing the {adventureType} in {cityName}!
        </p>
      </div>

      {/* Quick Stats */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl md:text-3xl font-bold text-white mb-1">
              ⏱️ {totalTime}
            </div>
            <div className="text-white/60 text-sm">Final Time</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-white mb-1">
              👥 {teamSize}
            </div>
            <div className="text-white/60 text-sm">
              {teamSize === 1 ? 'Solo Explorer' : 'Team Members'}
            </div>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="text-center">
        <button
          onClick={handleContinue}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl text-lg transform hover:scale-105"
        >
          <span className="inline-flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            View Full Results
          </span>
        </button>
      </div>

      {/* Achievement message */}
      <div className="mt-6 text-center">
        <p className="text-white/60 text-sm">
          🏆 Challenge your friends to beat your time!
        </p>
      </div>
    </div>
  );
}