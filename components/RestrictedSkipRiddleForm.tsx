// components/RestrictedSkipRiddleForm.tsx
'use client';

import { useState } from 'react';

interface Props {
  groupId: string;
  isLeader: boolean;
}

export default function RestrictedSkipRiddleForm({ groupId, isLeader }: Props) {
  const [isSkipping, setIsSkipping] = useState(false);

  if (!isLeader) {
    return null; // Only show to leaders
  }

  const handleSkip = async () => {
    if (isSkipping) return;
    
    setIsSkipping(true);
    console.log('🔄 Leader initiating skip...');

    try {
      const response = await fetch('/api/skip-riddle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      });

      const data = await response.json();
      console.log('📡 Skip API response:', data);

      if (response.ok && data.success) {
        // 🚀 IMMEDIATE REDIRECT FOR LEADER - DON'T WAIT FOR REAL-TIME
        if (data.completed) {
          // Adventure completed
          console.log('🎉 Adventure completed, redirecting leader immediately');
          window.location.href = `/adventure-complete/${groupId}`;
        } else if (data.nextRiddleId) {
          // Next riddle
          console.log('⏭️ Redirecting leader to next riddle immediately:', data.nextRiddleId);
          window.location.href = `/riddle/${data.nextRiddleId}`;
        } else {
          // Fallback - should not happen with your API
          console.warn('⚠️ Skip successful but no redirect info, waiting for real-time...');
          // Keep your original behavior as fallback
          console.log('Skip successful, waiting for real-time update...');
        }
      } else {
        console.error('Skip failed:', data.error || 'Unknown error');
        setIsSkipping(false);
      }
    } catch (error) {
      console.error('Skip error:', error);
      setIsSkipping(false);
    }
  };

  return (
    <button
      onClick={handleSkip}
      disabled={isSkipping}
      className="text-white text-right hover:text-white/80 transition-colors duration-200"
    >
      <div className="text-xs text-white/60 mb-1">QR missing? Not working?</div>
      <div className="text-sm font-medium">
        {isSkipping ? 'Skipping...' : 'Skip to next riddle'}
      </div>
    </button>
  );
}