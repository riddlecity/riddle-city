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
    <div
      className="absolute z-20 left-3 sm:left-4 bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 max-w-[160px] sm:max-w-[200px]"
      style={{ top: "max(env(safe-area-inset-top, 0.75rem), 0.75rem)" }}
    >
      <p className="text-white/60 text-[11px] sm:text-xs mb-1 leading-tight">Skipped the last riddle?</p>
      <button
        onClick={handleGoBack}
        disabled={isGoingBack}
        className="text-white text-xs sm:text-sm font-medium hover:text-white/80 active:scale-95 transition-all duration-200 min-h-[36px] disabled:opacity-60"
      >
        {isGoingBack ? 'Going back…' : '⬅️ Go back'}
      </button>
      {error && (
        <p className="text-red-300 text-[11px] mt-1 leading-tight">{error}</p>
      )}
    </div>
  );
}
