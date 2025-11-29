'use client';

import { useState } from 'react';

interface AlternativeRiddleToggleProps {
  riddleText: string;
  altMessage: string;
  altRiddle: string;
}

export default function AlternativeRiddleToggle({ 
  riddleText, 
  altMessage, 
  altRiddle 
}: AlternativeRiddleToggleProps) {
  const [showingAlt, setShowingAlt] = useState(false);

  return (
    <>
      {/* Main Riddle Text */}
      <h1
        className={`font-bold text-white leading-tight drop-shadow-lg mb-8
                   text-[clamp(1.75rem,6vw,2.5rem)]
                   md:text-[clamp(2rem,4vw,3rem)]
                   px-2 transition-opacity duration-300 ${
                     showingAlt ? 'opacity-0 absolute' : 'opacity-100'
                   }`}
        style={{
          textShadow: '0 2px 12px rgba(0,0,0,0.8), 0 4px 24px rgba(0,0,0,0.4)'
        }}
      >
        {riddleText}
      </h1>

      {/* Alternative Riddle Text */}
      {showingAlt && (
        <h1
          className="font-bold text-white leading-tight drop-shadow-lg mb-8
                     text-[clamp(1.75rem,6vw,2.5rem)]
                     md:text-[clamp(2rem,4vw,3rem)]
                     px-2 animate-in fade-in duration-300"
          style={{
            textShadow: '0 2px 12px rgba(0,0,0,0.8), 0 4px 24px rgba(0,0,0,0.4)'
          }}
        >
          {altRiddle}
        </h1>
      )}

      {/* Toggle Button */}
      <div className="mt-6">
        {!showingAlt ? (
          <button
            onClick={() => setShowingAlt(true)}
            className="bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/50 hover:border-yellow-500/70 text-yellow-400 font-medium px-4 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 text-sm sm:text-base min-h-[48px]"
          >
            {altMessage}
          </button>
        ) : (
          <button
            onClick={() => setShowingAlt(false)}
            className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 hover:border-blue-500/70 text-blue-400 font-medium px-4 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 text-sm sm:text-base min-h-[48px] flex items-center gap-2 mx-auto"
          >
            <span>←</span>
            <span>Back to Original Riddle</span>
          </button>
        )}
      </div>
    </>
  );
}
