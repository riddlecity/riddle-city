// components/ResumeGameGate.tsx
"use client";

import { usePathname } from "next/navigation";
import ResumeGameBanner from "./ResumeGameBanner";

export default function ResumeGameGate() {
  const pathname = usePathname() || "";

  // Hide the banner on any riddle page
  if (pathname.startsWith("/riddle/")) return null;

  return <ResumeGameBanner />;
}
