"use client";

import { useState, useEffect } from "react";

export default function ShareLink({ groupId }: { groupId: string }) {
  const [fullUrl, setFullUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  
  useEffect(() => {
    const origin = window?.location?.origin || "";
    // 🔧 FIX: Use the correct join URL format
    setFullUrl(`${origin}/join/${groupId}`);
  }, [groupId]);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 2000);
    }
  };
  
  if (!fullUrl) return null;
  
  return (
    <div className="text-center">
      <p className="text-white/60 text-sm mb-4 font-medium">
        Share this link to let teammates join:
      </p>
      
      <button
        onClick={handleCopy}
        className={`
          group inline-flex items-center gap-2.5 px-5 py-3 rounded-xl font-medium transition-all duration-200 text-sm md:text-base
          ${copied 
            ? 'bg-green-500/20 text-green-300 border border-green-500/40' 
            : copyError 
              ? 'bg-red-500/20 text-red-300 border border-red-500/40' 
              : 'bg-white/8 hover:bg-white/12 text-white/80 hover:text-white border border-white/25 hover:border-white/40'
          }
        `}
      >
        <span className="text-base">
          {copied ? "✅" : copyError ? "❌" : "🔗"}
        </span>
        <span>
          {copied ? "Copied!" : copyError ? "Failed" : "Copy Invite Link"}
        </span>
      </button>
      
      {/* Debug info for testing */}
      <details className="mt-4">
        <summary className="text-xs text-white/40 cursor-pointer">Debug URL</summary>
        <p className="text-xs text-white/30 mt-1 font-mono break-all">{fullUrl}</p>
      </details>
    </div>
  );
}