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
      console.error('Failed to copy to clipboard:', err);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 2000);
    }
  };
  
  if (!fullUrl) return null;
  
  return (
    <div className="fixed bottom-4 left-4 z-20">
      <div className="text-left">
        <p className="text-white/60 text-xs mb-2 font-medium">
          Invite your team:
        </p>
        
        <button
          onClick={handleCopy}
          className={`
            group inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm
            ${copied 
              ? 'bg-green-500/20 text-green-300 border border-green-500/40' 
              : copyError 
                ? 'bg-red-500/20 text-red-300 border border-red-500/40' 
                : 'bg-white/8 hover:bg-white/12 text-white/80 hover:text-white border border-white/25 hover:border-white/40'
            }
          `}
        >
          <span className="text-sm">
            {copied ? "✅" : copyError ? "❌" : "🔗"}
          </span>
          <span>
            {copied ? "Copied!" : copyError ? "Failed" : "Copy Invite Link"}
          </span>
        </button>
      </div>
    </div>
  );
}