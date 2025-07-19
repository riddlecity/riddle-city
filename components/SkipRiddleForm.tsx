// components/RestrictedSkipRiddleForm.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  groupId: string;
  isLeader: boolean;
}

export default function RestrictedSkipRiddleForm({ groupId, isLeader }: Props) {
  const [isSkipping, setIsSkipping] = useState(false);
  const router = useRouter();

  if (!isLeader) {
    return null; // Only show to leaders
  }

  const handleSkip = async () => {
    if (isSkipping) return;
    
    setIsSkipping(true);
    try {
      const response = await fetch('/api/skip-riddle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      });

      if (response.ok) {
        // Don't redirect here - let real-time sync handle it
        console.log('Skip successful, waiting for real-time update...');
      } else {
        console.error('Skip failed');
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
      className="text-white text-right"
    >
      <div className="text-xs text-white/60 mb-1">QR not working?</div>
      <div className="text-sm font-medium">
        {isSkipping ? 'Skipping...' : 'Skip (20min penalty)'}
      </div>
    </button>
  );
}