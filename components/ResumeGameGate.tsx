// components/ResumeGameGate.tsx
"use client";
import { usePathname } from "next/navigation";
import ResumeGameBanner from "./ResumeGameBanner";

export default function ResumeGameGate() {
  const pathname = usePathname() || "";
  
  // Hide the banner on game-related pages to avoid confusion
  const excludedPaths = [
    '/riddle/', // Game pages
    '/adventure-complete/', // Completion pages
    '/waiting/', // Waiting room pages
    '/start/', // Start pages  
    '/join/', // Join pages
    '/scan', // QR scan page
  ];
  
  // Check if current path matches any game page
  const isOnGamePage = excludedPaths.some(path => pathname.includes(path));
  
  if (isOnGamePage) {
    console.log('🚫 RESUME GATE: Hiding banner on game page:', pathname);
    return null;
  }
  
  return <ResumeGameBanner />;
}