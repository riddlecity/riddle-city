// components/RiddleTimeWarning.tsx
'use client';

import { useState, useEffect } from 'react';

interface TimeWarningProps {
  riddleId: string;
  trackId: string;
}

interface LocationWarning {
  type: 'closed' | 'closing_soon' | 'open' | 'bank_holiday';
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
  const [_riddleNumber, setRiddleNumber] = useState<string>(riddleId);

  // Get actual riddle position from database order_index
  useEffect(() => {
    async function getRiddlePosition() {
      try {
        const response = await fetch(`/api/locations/${trackId}/hours`);
        if (response.ok) {
          const data = await response.json();
          const riddles = data.locations || [];
          
          // Find this riddle's position in the ordered list
          const riddleIndex = riddles.findIndex((r: any) => r.id === riddleId);
          if (riddleIndex !== -1) {
            setRiddleNumber(String(riddleIndex + 1)); // Convert to 1-based position
          }
        }
      } catch (error) {
        console.log('Could not fetch riddle position:', error);
      }
    }
    
    getRiddlePosition();
  }, [riddleId, trackId]);

  // Check location hours and get warnings
  useEffect(() => {
    async function checkLocationHours() {
      try {
        // Use new database-based time warnings system
        const response = await fetch(`/api/riddles/${riddleId}/time-warning`);
        if (!response.ok) {
          console.log('No time warning data available');
          return;
        }

        const timeWarning = await response.json();
        
        if (timeWarning && timeWarning.type) {
          setWarning({
            type: timeWarning.type,
            message: timeWarning.message,
            severity: timeWarning.severity,
            closingTime: timeWarning.closingTime,
            hoursUntilClose: timeWarning.hoursUntilClose,
            hoursUntilOpen: timeWarning.hoursUntilOpen,
            opensAt: timeWarning.opensAt
          });
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
  }, [riddleId]);

  if (loading || !warning) {
    return null;
  }

  const getWarningStyles = () => {
    switch (warning.severity) {
      case 'high':
        return 'bg-red-600 border-red-500';
      case 'medium':
        return 'bg-orange-600 border-orange-500';
      case 'low':
        return 'bg-blue-600 border-blue-500';
      default:
        return 'bg-gray-600 border-gray-500';
    }
  };

  const getWarningIcon = () => {
    switch (warning.type) {
      case 'closed':
        return '🔒';
      case 'closing_soon':
        return '⏰';
      case 'open':
        return '✅';
      case 'bank_holiday':
        return '🏦';
      default:
        return '⚠️';
    }
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${getWarningStyles()} text-white mb-4`}>
      <div className="flex items-center space-x-2">
        <span className="text-xl">{getWarningIcon()}</span>
        <div className="flex-1">
          <p className="font-medium">{warning.message}</p>
          
          {warning.type === 'closing_soon' && warning.hoursUntilClose && (
            <p className="text-sm opacity-90 mt-1">
              {warning.hoursUntilClose < 1 
                ? `Closes in ${Math.round(warning.hoursUntilClose * 60)} minutes`
                : `Closes in ${Math.round(warning.hoursUntilClose)} hours`
              }
            </p>
          )}
          
          {warning.type === 'closed' && warning.opensAt && (
            <p className="text-sm opacity-90 mt-1">
              Opens at {warning.opensAt}
            </p>
          )}
          
          {warning.type === 'bank_holiday' && (
            <p className="text-sm opacity-90 mt-1">
              Check location directly for today's hours
            </p>
          )}
        </div>
      </div>
    </div>
  );
}