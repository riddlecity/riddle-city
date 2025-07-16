'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CompleteAdventureButtonProps {
  groupId: string;
  isLeader: boolean;
}

export default function CompleteAdventureButton({ groupId, isLeader }: CompleteAdventureButtonProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const router = useRouter();

  if (!isLeader) return null;

  const handleComplete = async () => {
    if (!confirm('Are you sure you want to complete this adventure? This will end the game for all team members.')) {
      return;
    }

    setIsCompleting(true);

    try {
      const res = await fetch('/api/complete-adventure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      });

      const data = await res.json();

      if (res.ok) {
        // Redirect to completion page
        router.push(`/adventure-complete/${groupId}`);
      } else {
        alert(data.error || 'Failed to complete adventure');
      }
    } catch (error) {
      console.error('Complete adventure error:', error);
      alert('Error completing adventure');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="mt-8 md:mt-12">
      <button
        onClick={handleComplete}
        disabled={isCompleting}
        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
      >
        {isCompleting ? (
          <span className="inline-flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
            Completing...
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            🏁 Complete Adventure
          </span>
        )}
      </button>
      
      <p className="text-white/60 text-sm mt-3 max-w-md mx-auto">
        This will mark the adventure as complete for all team members and show your final time.
      </p>
    </div>
  );
}