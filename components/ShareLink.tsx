// components/ShareLink.tsx
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
      {/* Match Skip’s small helper line */}
      <div className="text-xs text-white/60 mb-1">Invite your team</div>

      {/* Match Skip’s link-like button style */}
      <button
        onClick={handleCopy}
        className="text-sm font-medium text-white hover:text-white/80 transition-colors duration-200"
        aria-label="Copy invite link"
      >
        {copied ? "Copied!" : copyError ? "Copy failed" : "Copy invite link"}
      </button>
    </div>
  );
}
