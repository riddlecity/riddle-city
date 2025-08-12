// components/RestrictedSkipRiddleForm.tsx
"use client";

import { useState } from "react";

interface Props {
  groupId: string;
  isLeader: boolean;
}

export default function RestrictedSkipRiddleForm({ groupId, isLeader }: Props) {
  const [isSkipping, setIsSkipping] = useState(false);

  if (!isLeader) return null; // Only show to leaders

  const handleSkip = async () => {
    if (isSkipping) return;

    setIsSkipping(true);
    try {
      const response = await fetch("/api/skip-riddle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Immediate redirect for leader
        if (data.completed) {
          window.location.href = `/adventure-complete/${groupId}`;
        } else if (data.nextRiddleId) {
          window.location.href = `/riddle/${data.nextRiddleId}`;
        } else {
          // Fallback: let realtime take over
          setIsSkipping(false);
        }
      } else {
        console.error("Skip failed:", data.error || "Unknown error");
        setIsSkipping(false);
      }
    } catch (err) {
      console.error("Skip error:", err);
      setIsSkipping(false);
    }
  };

  return (
    <div className="text-right">
      {/* Optional helper line (kept subtle) */}
      <div className="text-xs text-white/60 mb-2">QR missing? Not working?</div>

      <button
        onClick={handleSkip}
        disabled={isSkipping}
        aria-label="Skip to next riddle"
        className={`
          text-sm font-medium rounded-lg px-4 py-2 transition-all duration-200 border
          bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/40
          ${isSkipping ? "text-white/60 cursor-not-allowed" : "text-red-500 hover:text-red-400"}
        `}
      >
        {isSkipping ? "Skipping..." : "Skip to next riddle"}
      </button>
    </div>
  );
}
