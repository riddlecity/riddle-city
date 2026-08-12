'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  groupId: string;
}

export default function GoBackButton({ groupId }: Props) {
  const [isGoingBack, setIsGoingBack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGoBack = async () => {
    if (isGoingBack) return;

    setIsGoingBack(true);
    setError(null);

    try {
      const response = await fetch('/api/go-back-riddle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      });

      const data = await response.json();

      if (response.ok && data.previousRiddleId) {
        router.push(`/riddle/${data.previousRiddleId}`);
      } else {
        setError(data.error || 'Could not go back');
        setIsGoingBack(false);
      }
    } catch (err) {
      console.error('Go back error:', err);
      setError('Network error. Please try again.');
      setIsGoingBack(false);
    }
  };

  return (
    <div className="w-full">
      <button
        onClick={handleGoBack}
        disabled={isGoingBack}
        className="flex items-center gap-2 text-white/80 hover:text-white active:scale-95 transition-all duration-200 min-h-[36px] disabled:opacity-60"
      >
        <span aria-hidden="true" className="text-lg leading-none">←</span>
        <span className="text-sm sm:text-base font-medium">
          {isGoingBack ? 'Going back…' : 'Go back to previous riddle'}
        </span>
      </button>
      {error && (
        <p className="text-red-300 text-xs mt-1">{error}</p>
      )}
    </div>
  );
}
