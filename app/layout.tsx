// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GameLayoutWrapper from "@/components/GameLayoutWrapper";
import Footer from "@/components/Footer";
import ResumeGameGate from "@/components/ResumeGameGate"; // ⬅️ NEW

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Riddle City - Your Mystery Awaits",
  description:
    "Puzzle-based adventures through your town or city. Scan QR codes, solve riddles, and explore with friends.",
  icons: { icon: "/favicon-custom.ico" },
};

// ✅ Make the viewport fill behind notches and handle mobile URL bars correctly
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black flex flex-col
                    min-h-[100svh] md:min-h-dvh`}
      >
        <GameLayoutWrapper>
          <div className="flex-1">{children}</div>
          <Footer />
        </GameLayoutWrapper>

        {/* 🔔 Global resume banner, hidden on /riddle/[id] */}
        <ResumeGameGate />
      </body>
    </html>
  );
}
