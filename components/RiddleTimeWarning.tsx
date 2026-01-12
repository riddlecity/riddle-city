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

  if (loading || !warning || warning.type === 'open') {
    return null; // Don't show anything if loading, no warning, or location is open
  }

  const getWarningStyles = () => {
    switch (warning.severity) {
      case 'high':
        return 'bg-gradient-to-r from-red-950/80 to-purple-950/80 border-red-400/20 backdrop-blur-sm';
      case 'medium':
        return 'bg-gradient-to-r from-yellow-950/80 to-purple-950/80 border-yellow-400/20 backdrop-blur-sm';
      case 'low':
        return 'bg-gradient-to-r from-blue-950/80 to-purple-950/80 border-blue-400/20 backdrop-blur-sm';
      default:
        return 'bg-gradient-to-r from-gray-950/80 to-purple-950/80 border-gray-400/20 backdrop-blur-sm';
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

  // Format time remaining as minutes or hours
  const formatTimeRemaining = (hours: number): string => {
    const minutes = Math.round(hours * 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      const displayHours = Math.floor(hours);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${displayHours} hour${displayHours !== 1 ? 's' : ''}`;
      }
      return `${displayHours}h ${remainingMinutes}m`;
    }
  };

  // Get display message with time details
  const getDisplayMessage = () => {
    if (warning.type === 'closing_soon' && warning.hoursUntilClose !== undefined) {
      return `Closes in ${formatTimeRemaining(warning.hoursUntilClose)}`;
    }
    if (warning.type === 'closed' && warning.hoursUntilOpen !== undefined) {
      return `Opens in ${formatTimeRemaining(warning.hoursUntilOpen)}`;
    }
    return warning.message;
  };

  return (
    <div className="w-full px-4 z-10 mb-4">
      <div className={`p-4 rounded-xl border-2 ${getWarningStyles()} text-white shadow-lg`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">{getWarningIcon()}</span>
          <div className="flex-1">
            <p className="font-semibold text-white leading-tight">{getDisplayMessage()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}