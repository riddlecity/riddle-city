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

const siteUrl = "https://www.riddlecity.co.uk";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Riddle City - Outdoor Puzzle Adventures",
    template: "%s | Riddle City",
  },
  description:
    "Riddle City is an outdoor puzzle adventure where you scan QR codes, solve riddles, and explore your town or city with friends and family.",
  keywords: [
    "outdoor puzzle adventure",
    "riddle trail",
    "city treasure hunt",
    "QR code adventure",
    "family day out",
    "things to do",
    "riddle city",
  ],
  authors: [{ name: "Riddle City", url: siteUrl }],
  creator: "Riddle City",
  publisher: "Riddle City",
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: siteUrl,
    siteName: "Riddle City",
    title: "Riddle City - Outdoor Puzzle Adventures",
    description:
      "Scan QR codes, solve riddles, and explore your town or city. A fun outdoor adventure for friends and families.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Riddle City - Outdoor Puzzle Adventures",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Riddle City - Outdoor Puzzle Adventures",
    description:
      "Scan QR codes, solve riddles, and explore your town or city with friends and family.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  other: {
    "msapplication-TileColor": "#dc2626",
    "msapplication-config": "/browserconfig.xml",
  },
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
  const siteUrl = "https://www.riddlecity.co.uk";

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Riddle City",
    url: siteUrl,
    logo: `${siteUrl}/riddle-city-logo.png`,
    contactPoint: {
      "@type": "ContactPoint",
      email: "hello@riddlecity.co.uk",
      contactType: "customer support",
    },
    sameAs: [],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Riddle City",
    url: siteUrl,
    description:
      "Outdoor puzzle adventures — scan QR codes, solve riddles, and explore your city with friends and family.",
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {/* Standard favicon links for desktop browsers */}
        <link rel="icon" type="image/x-icon" href="/favicon-custom.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-custom.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-custom.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon-custom.png" />
        
        {/* Mobile browser theme colors */}
        <meta name="theme-color" content="#dc2626" />
        <meta name="msapplication-navbutton-color" content="#dc2626" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Riddle City" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="mask-icon" href="/favicon-custom.png" color="#dc2626" />
      </head>
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
