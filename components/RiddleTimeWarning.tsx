// components/RiddleTimeWarning.tsx
'use client';

import { useState, useEffect } from 'react';

interface TimeWarningProps {
  riddleId: string;
  trackId: string;
}

interface LocationWarning {
  type: 'closed' | 'closing_soon' | 'open';
  message: string;
  severity: 'high' | 'medium' | 'low';
  closingTime?: string;
  hoursUntilClose?: number;
  hoursUntilOpen?: number;
  opensAt?: string;
}

export default function RiddleTimeWarning({ riddleId, trackId }: TimeWarningProps) {
  const [warning, setWarning] = useState<LocationWarning | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkLocationHours() {
      try {
        // Get the riddle's location data
        const riddleResponse = await fetch(`/api/riddles/${riddleId}/location`);
        if (!riddleResponse.ok) {
          console.log('No location data found for riddle');
          setLoading(false);
          return;
        }

        const { google_place_url, location_name } = await riddleResponse.json();
        
        if (!google_place_url) {
          console.log('No Google Place URL for this riddle');
          setLoading(false);
          return;
        }

        // Get cached opening hours for this specific location
        const hoursResponse = await fetch('/api/cached-hours', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            google_place_url,
            location_name
          })
        });

        if (!hoursResponse.ok) {
          console.error('Failed to get opening hours');
          setLoading(false);
          return;
        }

        const { opening_hours } = await hoursResponse.json();
        
        if (!opening_hours || !opening_hours.parsed_hours) {
          console.log('No parsed hours available');
          setLoading(false);
          return;
        }

        // Calculate time warning for this specific location
        const ukTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDay = dayNames[ukTime.getDay()];
        const todayHours = opening_hours.parsed_hours[currentDay];

        if (!todayHours) {
          // Location is closed today
          setWarning({
            type: 'closed',
            message: `⚠️ This riddle's location is closed today. You can still solve the riddle, but won't be able to access the physical location.`,
            severity: 'high'
          });
          setLoading(false);
          return;
        }

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
            const minutesUntilOpen = openMinutes - currentMinutes;
            const hoursUntilOpen = minutesUntilOpen / 60;
            
            if (hoursUntilOpen < 1) {
              setWarning({
                type: 'closed',
                message: `⏰ This riddle's location opens in ${Math.round(minutesUntilOpen)} minutes (at ${todayHours.open})`,
                severity: 'medium',
                opensAt: todayHours.open
              });
            } else {
              const formattedHours = Math.ceil(hoursUntilOpen * 2) / 2; // Round up to nearest 0.5
              setWarning({
                type: 'closed',
                message: `⚠️ This riddle's location opens in ${formattedHours}h (at ${todayHours.open}). You can solve the riddle now, but won't have access until then.`,
                severity: 'high',
                opensAt: todayHours.open
              });
            }
          } else {
            // Location is closed for the day
            setWarning({
              type: 'closed',
              message: `⚠️ This riddle's location is closed for today (closed at ${todayHours.close}). You can still solve the riddle!`,
              severity: 'high'
            });
          }
        } else {
          // Location is open - check if closing soon
          const minutesUntilClose = closeMinutes - currentMinutes;
          const hoursUntilClose = minutesUntilClose / 60;

          if (hoursUntilClose <= 2) {
            let message = '';
            let severity: 'high' | 'medium' = 'medium';
            
            if (hoursUntilClose < 1) {
              const minutesLeft = Math.round(minutesUntilClose);
              message = `🚨 Hurry! This riddle's location closes in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''} (at ${todayHours.close})`;
              severity = 'high';
            } else {
              const roundedHours = Math.ceil(hoursUntilClose * 2) / 2;
              message = `⏰ This riddle's location closes in ${roundedHours} hour${roundedHours !== 1 ? 's' : ''} (at ${todayHours.close})`;
            }

            setWarning({
              type: 'closing_soon',
              message,
              severity,
              closingTime: todayHours.close,
              hoursUntilClose
            });
          }
          // If open with plenty of time, no warning needed
        }

      } catch (error) {
        console.error('Error checking location hours:', error);
      } finally {
        setLoading(false);
      }
    }

    checkLocationHours();

    // Refresh every 5 minutes to keep warnings current
    const interval = setInterval(checkLocationHours, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [riddleId, trackId]);

  if (loading || !warning) {
    return null;
  }

  const getWarningStyles = () => {
    switch (warning.severity) {
      case 'high':
        return 'bg-red-900/80 border-red-500 text-red-100';
      case 'medium':
        return 'bg-orange-900/80 border-orange-500 text-orange-100';
      default:
        return 'bg-blue-900/80 border-blue-500 text-blue-100';
    }
  };

  return (
    <div className="w-full px-4 pb-2 z-10">
      <div className={`rounded-lg border backdrop-blur-sm p-3 text-sm text-center ${getWarningStyles()}`}>
        <div className="font-medium">{warning.message}</div>
        {warning.type === 'closing_soon' && (
          <div className="text-xs mt-1 opacity-75">
            Complete this riddle before the location closes to ensure access.
          </div>
        )}
      </div>
    </div>
  );
}
