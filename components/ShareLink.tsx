"use client";
import { useState, useEffect } from "react";

export default function ShareLink({ groupId }: { groupId: string }) {
  const [fullUrl, setFullUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    const origin = window?.location?.origin || "";
    setFullUrl(`${origin}/join/${groupId}`);
  }, [groupId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 2000);
    }
  };

  if (!fullUrl) return null;

  return (
    <div className="text-left">
      <div className="text-xs sm:text-xs text-white/60 mb-1.5">Invite your team</div>

      <button
        onClick={handleCopy}
        className={`
          min-h-[44px] text-sm sm:text-base font-medium border-2 rounded-lg px-4 py-2.5 transition-all duration-200
          bg-white/10 hover:bg-white/20 active:scale-95 border-white/20 hover:border-white/40
          ${copied 
            ? "text-green-400 border-green-400/50 bg-green-400/10" 
            : copyError 
              ? "text-red-400 border-red-400/50 bg-red-400/10" 
              : "text-red-500 hover:text-red-400"}
        `}
      >
        {copied ? "✅ Copied!" : copyError ? "❌ Failed" : "📋 Copy Invite Link"}
      </button>
    </div>
  );
}
