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
      <button
        onClick={handleCopy}
        className={`
          text-left min-h-[48px] px-3 py-2 rounded-lg transition-all duration-200
          active:scale-95
          ${copied
            ? "bg-green-400/10 text-green-400"
            : copyError
              ? "bg-red-400/10 text-red-400"
              : "hover:bg-white/10 text-white"}
        `}
      >
        <div className="text-xs sm:text-xs text-white/60 mb-0.5">Invite your team</div>
        <div className="text-sm sm:text-base font-medium">
          {copied ? "✅ Copied!" : copyError ? "❌ Failed to copy" : "📋 Copy invite link"}
        </div>
      </button>
    </div>
  );
}
