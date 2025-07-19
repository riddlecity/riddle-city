// components/LogoLink.tsx
'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface LogoLinkProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  confirmMessage?: string;
}

export default function LogoLink({ 
  size = 'medium', 
  className = '',
  confirmMessage = "Are you sure you want to return to About Us? This will cancel your current progress."
}: LogoLinkProps) {
  const router = useRouter();

  // Handle logo click with confirmation
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const confirmed = window.confirm(confirmMessage);
    if (confirmed) {
      router.push('/');
    }
  };

  // Size configurations
  const sizeClasses = {
    small: 'w-[60px] h-[60px] md:w-[80px] md:h-[80px]',
    medium: 'w-[80px] h-[80px] md:w-[100px] md:h-[100px]',
    large: 'w-[100px] h-[100px] md:w-[120px] md:h-[120px]'
  };

  const sizeValues = {
    small: { width: 60, height: 60 },
    medium: { width: 80, height: 80 },
    large: { width: 100, height: 100 }
  };

  return (
    <div className={`absolute top-4 left-4 md:top-6 md:left-6 z-10 ${className}`}>
      <button 
        onClick={handleLogoClick} 
        className="focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg"
        title="Return to About Riddle City"
      >
        <Image
          src="/riddle-city-logo.png"
          alt="Riddle City Logo - Return to About Us"
          width={sizeValues[size].width}
          height={sizeValues[size].height}
          className={`${sizeClasses[size]} drop-shadow-lg hover:scale-105 transition-transform duration-200 cursor-pointer`}
          priority
        />
      </button>
    </div>
  );
}