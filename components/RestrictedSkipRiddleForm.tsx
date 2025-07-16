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

  console.log('Skip button render:', { groupId, isLeader, loading });

  if (!isLeader) return null;

  const handleSkip = async (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('Skip button clicked!');
    
    setLoading(true);
    
    try {
      console.log('Sending skip request...');
      const res = await fetch('/api/skip-riddle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId }), // Send as JSON instead of FormData
      });

      const data = await res.json();
      console.log('Skip response:', data);

      if (!res.ok) {
        throw new Error(data.error || 'Failed to skip riddle');
      }

      if (data.completed) {
        // Adventure is complete, redirect to completion page
        console.log('Adventure completed! Redirecting to completion page...');
        router.push(`/adventure-complete/${groupId}`);
      } else if (data.nextRiddleId) {
        // Normal skip to next riddle
        console.log('Redirecting to:', data.nextRiddleId);
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
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-30">
      <button
        onClick={handleSkip}
        disabled={loading}
        className="group bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/20 hover:border-white/30 rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-white/70 hover:text-white/90 transition-all duration-200 text-xs md:text-sm shadow-lg hover:shadow-xl disabled:opacity-50"
      >
        <div className="flex items-center gap-2">
          <span className="text-base md:text-lg">📱</span>
          <div className="text-left">
            <div className="font-medium leading-tight">
              {loading ? "Skipping..." : "QR Code not working?"}
            </div>
            <div className="text-xs text-white/50 group-hover:text-white/70 leading-tight">
              {loading ? "Please wait..." : "Skip to next riddle"}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}