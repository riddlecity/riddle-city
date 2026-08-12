'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  groupId: string;
  isLeader: boolean;
  riddleId: string;
  trackId: string;
  isFinalRiddle: boolean;
}

interface TimeWarning {
  type: 'closed' | 'closing_soon' | 'open';
  severity: 'high' | 'medium' | 'low';
  hoursUntilClose?: number;
  message: string;
}

export default function ConditionalSkipRiddleForm({ groupId, isLeader, riddleId, trackId, isFinalRiddle }: Props) {
  const [isSkipping, setIsSkipping] = useState(false);
  const [warning, setWarning] = useState<TimeWarning | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
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

        console.log('ConditionalSkip: Checking hours for riddle', riddleId, 'opening_hours:', opening_hours);

        if (!opening_hours?.parsed_hours || !isMounted) {
          console.log('ConditionalSkip: No opening hours data available');
          if (isMounted) setLoading(false);
          return;
        }

        // Get UK time
        const ukTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDay = dayNames[ukTime.getDay()];
        const todayHours = opening_hours.parsed_hours[currentDay];

        console.log('ConditionalSkip: Current day:', currentDay, 'Hours:', todayHours);

        if (!todayHours) {
          // Location is closed today
          console.log('ConditionalSkip: Location CLOSED today');
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

  // Anyone can skip if the location is closed, or closing within 10 minutes.
  // This is just for showing/hiding the button - the server independently
  // re-verifies eligibility from the riddle's opening hours before allowing
  // a non-leader skip to actually go through.
  const canAnyoneSkip = () => {
    if (!warning) return false;

    if (warning.type === 'closed') {
      return true;
    }

    if (warning.type === 'closing_soon' && warning.hoursUntilClose !== undefined) {
      const minutesUntilClose = warning.hoursUntilClose * 60;
      return minutesUntilClose <= 10;
    }

    return false;
  };

  const isEmergencySkip = canAnyoneSkip();
  const shouldShowSkip = isLeader || isEmergencySkip;

  // 🔒 Only the group leader can skip a riddle - UNLESS the location itself
  // is closed or closing very soon. The server enforces this independently.
  if (loading || !shouldShowSkip) {
    return null;
  }

  const handleSkip = async () => {
    if (isSkipping) return;
    
    setIsSkipping(true);
    setShowConfirm(false);
    try {
      const response = await fetch('/api/skip-riddle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, isEmergencySkip }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Skip successful: ${isEmergencySkip ? 'Emergency' : 'Normal'} skip`);
        
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

  const skipActionText = isFinalRiddle ? 'Skip to complete' : 'Skip to next riddle';
  const skipSubtitle = isEmergencySkip && !isLeader ? 'Location unavailable?' : 'QR missing? Not working?';

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isSkipping}
        className="text-white text-left hover:text-white/80 active:scale-95 transition-all duration-200 min-h-[48px] px-3 py-2 rounded-lg hover:bg-white/10"
      >
        <div className="text-xs sm:text-xs text-white/60 mb-0.5">{skipSubtitle}</div>
        <div className="text-sm sm:text-base font-medium">
          {isSkipping ? 'Skipping...' : skipActionText}
        </div>
        {isEmergencySkip && !isLeader && (
          <div className="text-xs text-white/40 mt-0.5">
            (Emergency skip available)
          </div>
        )}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/20 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 text-center">Skip this riddle?</h3>
            <p className="text-white/70 text-sm mb-6 text-center">
              {isFinalRiddle
                ? 'This will mark the adventure as complete for the whole team.'
                : 'Are you sure you want to skip? Your whole team will move on to the next riddle, and you may only go back one riddle - even if you skip several in a row.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 min-h-[48px] bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSkip}
                disabled={isSkipping}
                className="flex-1 min-h-[48px] bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-60"
              >
                {isSkipping ? 'Skipping...' : 'Yes, skip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
