// components/GameLayoutWrapper.tsx
'use client';

import ResumeGameBanner from './ResumeGameBanner';
import { usePathname } from 'next/navigation';

interface GameLayoutWrapperProps {
  children: React.ReactNode;
}

export default function GameLayoutWrapper({ children }: GameLayoutWrapperProps) {
  const pathname = usePathname();
  
  // Don't show banner on these pages (already in game or payment flow)
  const excludedPaths = [
    '/riddle/',
    '/adventure-complete/',
    '/api/',
    '/riddlecity/barnsley/date/start/', // Payment success flow
  ];

  const shouldShowBanner = !excludedPaths.some(path => pathname.startsWith(path));

  return (
    <>
      {shouldShowBanner && <ResumeGameBanner />}
      <div className={shouldShowBanner ? 'pt-16' : ''}> {/* Add padding if banner is shown */}
        {children}
      </div>
    </>
  );
}