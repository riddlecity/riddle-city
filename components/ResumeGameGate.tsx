// components/ResumeGameGate.tsx
"use client";
import { usePathname } from "next/navigation";
import ResumeGameBanner from "./ResumeGameBanner";

export default function ResumeGameGate() {
  const pathname = usePathname() || "";
  
  // Hide the banner on game-related pages to avoid confusion
  const gamePages = [
    '/riddle/',           // Active riddle pages
    '/waiting/',          // Waiting rooms  
    '/start/',            // Start pages (post-payment)
    '/adventure-complete/', // Completion pages
    '/game-confirmation/', // Game confirmation pages
    '/join/'              // Join pages
  ];
  
  // Check if current path matches any game page
  const isOnGamePage = gamePages.some(page => pathname.includes(page));
  
  if (isOnGamePage) {
    console.log('🚫 RESUME GATE: Hiding banner on game page:', pathname);
    return null;
  }
  
  return <ResumeGameBanner />;
}