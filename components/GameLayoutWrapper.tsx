// components/GameLayoutWrapper.tsx
'use client';
import ResumeGameBanner from './ResumeGameBanner';
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
  
  const shouldShowBanner = !excludedPaths.some(path => pathname.startsWith(path));

  return (
    <>
      {shouldShowBanner && (
        <ResumeGameBanner onVisibilityChange={setBannerVisible} />
      )}
      <div className={bannerVisible ? 'pt-16' : ''}> {/* Only add padding if banner is actually visible */}
        {children}
      </div>
    </>
  );
}