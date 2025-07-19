// components/RestrictedSkipRiddleForm.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  groupId: string;
  isLeader: boolean;
}

export default function RestrictedSkipRiddleForm({ groupId, isLeader }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  if (!isLeader) return null;

  const handleSkip = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Confirm the penalty
    const confirmed = window.confirm(
      "Are you sure you want to skip this riddle?\n\n⚠️ This will add a 20-minute penalty to your final time."
    );
    
    if (!confirmed) return;
    
    setLoading(true);
    
    try {
      const res = await fetch('/api/skip-riddle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to skip riddle');
      }
      
      if (data.completed) {
        // Adventure is complete, redirect to completion page
        router.push(`/adventure-complete/${groupId}`);
      } else if (data.nextRiddleId) {
        // Normal skip to next riddle
        router.push(`/riddle/${data.nextRiddleId}`);
      } else {
        console.error('Unexpected response format:', data);
        alert('Skip succeeded but received unexpected response format.');
      }
    } catch (error) {
      console.error('Skip error:', error);
      alert(error instanceof Error ? error.message : 'Error occurred while skipping riddle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
      <button
        onClick={handleSkip}
        disabled={loading}
        className="group bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/20 hover:border-white/30 rounded-lg px-3 py-2 text-white/70 hover:text-white/90 transition-all duration-200 text-xs md:text-sm shadow-lg hover:shadow-xl disabled:opacity-50"
      >
        <div className="flex flex-col items-center text-center">
          <span className="text-sm mb-1">📱</span>
          <div className="leading-tight">
            <div className="font-medium text-xs">
              {loading ? "Skipping..." : "QR not working?"}
            </div>
            <div className="text-xs text-white/50 group-hover:text-white/70">
              {loading ? "Please wait..." : "Skip (20 min penalty)"}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}