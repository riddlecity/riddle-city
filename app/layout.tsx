import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GameLayoutWrapper from "@/components/GameLayoutWrapper";
import Footer from "@/components/Footer";

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
  description: "Puzzle-based adventures through your town or city. Scan QR codes, solve riddles, and explore with friends.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <GameLayoutWrapper>
          <div className="flex-1">
            {children}
          </div>
          <Footer />
        </GameLayoutWrapper>
      </body>
    </html>
  );
}