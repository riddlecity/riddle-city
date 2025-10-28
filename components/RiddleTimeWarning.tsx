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
        return 'bg-gradient-to-r from-red-900/95 to-red-950/95 border-red-500/50 backdrop-blur-sm';
      case 'medium':
        return 'bg-gradient-to-r from-yellow-900/95 to-orange-950/95 border-yellow-500/50 backdrop-blur-sm';
      case 'low':
        return 'bg-gradient-to-r from-blue-900/95 to-blue-950/95 border-blue-500/50 backdrop-blur-sm';
      default:
        return 'bg-gradient-to-r from-gray-900/95 to-gray-950/95 border-gray-500/50 backdrop-blur-sm';
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
    <div className="w-full px-4 z-10 mb-4">
      <div className={`p-4 rounded-xl border-2 ${getWarningStyles()} text-white shadow-lg`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">{getWarningIcon()}</span>
          <div className="flex-1">
            <p className="font-semibold text-white leading-tight">{warning.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}