// components/GameLayoutWrapper.tsx
'use client';
import ResumeGameBanner from './ResumeGameBanner';
import Footer from './Footer';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface GameLayoutWrapperProps {
  children: React.ReactNode;
}

export default function GameLayoutWrapper({ children }: GameLayoutWrapperProps) {
  const pathname = usePathname();
  const [bannerVisible, setBannerVisible] = useState(false);
  
  const excludedPaths = [
    '/riddle/',
    '/adventure-complete/',
    '/api/',
    '/barnsley/date/start/',
  ];
  
  const isExcluded = excludedPaths.some(path => pathname?.startsWith(path));
  const shouldShowBanner = !isExcluded;
  // 🔒 Gameplay pages (riddle/adventure-complete) are locked to exactly one
  // viewport height with no scrolling - the marketing Footer would push the
  // page taller than the screen and force scrolling, so it's hidden there.
  const shouldShowFooter = !isExcluded;

  return (
    <>
      {shouldShowBanner && (
        <ResumeGameBanner onVisibilityChange={setBannerVisible} />
      )}
      <div className={`flex-1 ${bannerVisible ? 'pt-16' : ''}`}> {/* Only add padding if banner is actually visible */}
        {children}
      </div>
      {shouldShowFooter && <Footer />}
    </>
  );
}