import { OpeningHours } from '../lib/googlePlaces';
import { generateLocationWarning, getUKTime } from '../lib/timeWarnings';

interface RiddleLocationWarningProps {
  locationName: string;
  openingHours: OpeningHours;
  className?: string;
}

export default function RiddleLocationWarning({ 
  locationName, 
  openingHours, 
  className = '' 
}: RiddleLocationWarningProps) {
  const ukTime = getUKTime();
  const warning = generateLocationWarning(locationName, openingHours, ukTime);

  if (!warning || warning.type === 'open') {
    return null; // Don't show anything if location is open with plenty of time
  }

  const getWarningStyles = () => {
    switch (warning.severity) {
      case 'high':
        return 'bg-red-600/20 border-red-500/50 text-red-200';
      case 'medium':
        return 'bg-yellow-600/20 border-yellow-500/50 text-yellow-200';
      default:
        return 'bg-blue-600/20 border-blue-500/50 text-blue-200';
    }
  };

  return (
    <div className={`border rounded-lg p-3 mb-4 ${getWarningStyles()} ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">
          {warning.type === 'closed' ? '🚫' : '⏰'}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium">
            {warning.message}
          </p>
          {warning.hoursUntilClose && warning.hoursUntilClose <= 1 && (
            <p className="text-xs mt-1 opacity-80">
              Hurry! Only {Math.round(warning.hoursUntilClose * 60)} minutes remaining
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
