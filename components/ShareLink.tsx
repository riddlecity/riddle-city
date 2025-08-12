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
      <div className="text-xs text-white/60 mb-2">Invite your team</div>

      <button
        onClick={handleCopy}
        className={`
          text-sm font-medium border rounded-lg px-4 py-2 transition-all duration-200
          bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/40
          ${copied 
            ? "text-green-400" 
            : copyError 
              ? "text-red-400" 
              : "text-red-500 hover:text-red-400"}
        `}
      >
        {copied ? "✅ Copied!" : copyError ? "❌ Failed" : "Copy Invite Link"}
      </button>
    </div>
  );
}
