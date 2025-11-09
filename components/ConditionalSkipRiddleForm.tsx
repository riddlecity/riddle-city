'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  groupId: string;
  isLeader: boolean;
  riddleId: string;
  trackId: string;
}

interface TimeWarning {
  type: 'closed' | 'closing_soon' | 'open';
  severity: 'high' | 'medium' | 'low';
  hoursUntilClose?: number;
  message: string;
}

export default function ConditionalSkipRiddleForm({ groupId, isLeader, riddleId, trackId }: Props) {
  const [isSkipping, setIsSkipping] = useState(false);
  const [warning, setWarning] = useState<TimeWarning | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch location hours and determine warning status
  useEffect(() => {
    let isMounted = true;
    
    async function checkLocationHours() {
      if (!riddleId || !trackId) return;
      
      try {
        // Use AbortController for cleanup
        const controller = new AbortController();
        
        const response = await fetch(`/api/riddles/${riddleId}/location?trackId=${trackId}`, {
          signal: controller.signal
        });
        
        if (!response.ok || !isMounted) {
          if (isMounted) setLoading(false);
          return;
        }

        const data = await response.json();
        const { opening_hours } = data;

        if (!opening_hours?.parsed_hours || !isMounted) {
          if (isMounted) setLoading(false);
          return;
        }

        // Get UK time
        const ukTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDay = dayNames[ukTime.getDay()];
        const todayHours = opening_hours.parsed_hours[currentDay];

        if (!todayHours) {
          // Location is closed today
          if (isMounted) {
            setWarning({
              type: 'closed',
              message: 'Closed today',
              severity: 'high'
            });
          }
        } else {
          // Check if currently open and how much time until close
          const currentMinutes = ukTime.getHours() * 60 + ukTime.getMinutes();
          const [openHour, openMinute] = todayHours.open.split(':').map(Number);
          const [closeHour, closeMinute] = todayHours.close.split(':').map(Number);
          const openMinutes = openHour * 60 + openMinute;
          const closeMinutes = closeHour * 60 + closeMinute;

          const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

          if (!isOpen) {
            if (currentMinutes < openMinutes) {
              // Location hasn't opened yet today
              if (isMounted) {
                setWarning({
                  type: 'closed',
                  message: 'Not open yet',
                  severity: 'high'
                });
              }
            } else {
              // Location is closed for the day
              if (isMounted) {
                setWarning({
                  type: 'closed',
                  message: 'Closed for today',
                  severity: 'high'
                });
              }
            }
          } else {
            // Location is open - check if closing soon
            const minutesUntilClose = closeMinutes - currentMinutes;
            const hoursUntilClose = minutesUntilClose / 60;

            if (hoursUntilClose <= 2 && isMounted) {
              setWarning({
                type: 'closing_soon',
                message: 'Closing soon',
                severity: hoursUntilClose < 1 ? 'high' : 'medium',
                hoursUntilClose
              });
            }
          }
        }

      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error checking location hours:', error);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    checkLocationHours();
    
    return () => {
      isMounted = false;
    };
  }, [riddleId, trackId]);

  // Check if anyone can skip based on location status
  const canAnyoneSkip = () => {
    if (!warning) return false;
    
    // Allow anyone to skip if location is closed
    if (warning.type === 'closed') {
      return true;
    }
    
    // Allow anyone to skip if closing very soon (within 10 minutes)
    if (warning.type === 'closing_soon' && warning.hoursUntilClose !== undefined) {
      const minutesUntilClose = warning.hoursUntilClose * 60;
      return minutesUntilClose <= 10;
    }
    
    return false;
  };

  // Only show skip button if user is leader OR anyone can skip due to location issues
  const shouldShowSkip = isLeader || canAnyoneSkip();

  if (loading || !shouldShowSkip) {
    return null;
  }

  const handleSkip = async () => {
    if (isSkipping) return;
    
    setIsSkipping(true);
    try {
      const isEmergency = canAnyoneSkip();
      const response = await fetch('/api/skip-riddle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          groupId,
          isEmergencySkip: isEmergency
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Skip successful: ${isEmergency ? 'Emergency' : 'Normal'} skip`);
        
        // Navigate to next riddle or completion page
        if (data.completed) {
          router.push(`/adventure-complete/${groupId}`);
        } else if (data.nextRiddleId) {
          router.push(`/riddle/${data.nextRiddleId}`);
        } else {
          // Fallback - refresh the page
          router.refresh();
          setIsSkipping(false);
        }
      } else {
        console.error('Skip failed');
        setIsSkipping(false);
      }
    } catch (error) {
      console.error('Skip error:', error);
      setIsSkipping(false);
    }
  };

  // Get appropriate skip text based on why they can skip
  const getSkipText = () => {
    if (canAnyoneSkip()) {
      return {
        subtitle: 'Location unavailable?',
        action: 'Skip this riddle'
      };
    } else {
      return {
        subtitle: 'QR missing? Not working?',
        action: 'Skip to next riddle'
      };
    }
  };

  const skipText = getSkipText();

  return (
    <button
      onClick={handleSkip}
      disabled={isSkipping}
      className="text-white text-right hover:text-white/80 active:scale-95 transition-all duration-200 min-h-[48px] px-3 py-2 rounded-lg hover:bg-white/10"
    >
      <div className="text-xs sm:text-xs text-white/60 mb-0.5">{skipText.subtitle}</div>
      <div className="text-sm sm:text-base font-medium">
        {isSkipping ? 'Skipping...' : skipText.action}
      </div>
      {canAnyoneSkip() && !isLeader && (
        <div className="text-xs text-white/40 mt-0.5">
          (Emergency skip available)
        </div>
      )}
    </button>
  );
}
