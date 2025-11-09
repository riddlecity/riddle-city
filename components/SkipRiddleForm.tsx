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
        const data = await response.json();
        console.log('Skip successful');
        
        // Navigate to next riddle or completion page
        if (data.completed) {
          router.push(`/adventure-complete/${groupId}`);
        } else if (data.nextRiddleId) {
          router.push(`/riddle/${data.nextRiddleId}`);
        } else {
          // Fallback - refresh the page
          router.refresh();
          setIsSkipping(false);
        }
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
      className="text-white text-right hover:text-white/80 transition-colors duration-200"
    >
      <div className="text-xs text-white/60 mb-1">QR missing? Not working?</div>
      <div className="text-sm font-medium">
        {isSkipping ? 'Skipping...' : 'Skip to next riddle'}
      </div>
    </button>
  );
}