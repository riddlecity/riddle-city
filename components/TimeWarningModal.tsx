interface TimeWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  warning: {
    message: string;
    severity: 'high' | 'medium' | 'low';
    closedCount: number;
    closingSoonCount: number;
    closingSoonDetails: Array<{ riddleNumber: string; closingTime: string; hoursLeft?: number }>;
    closedDetails: Array<{ riddleNumber: string; hoursUntilOpen?: number; opensAt?: string }>;
  };
}

// Helper function to get ordinal numbers (1st, 2nd, 3rd, etc.)
function getOrdinal(num: number): string {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const remainder = num % 100;
  return num + (suffix[(remainder - 20) % 10] || suffix[remainder] || suffix[0]);
}

export default function TimeWarningModal({ 
  isOpen, 
  onClose, 
  onContinue, 
  warning 
}: TimeWarningModalProps) {
  if (!isOpen) return null;

  const getSeverityStyles = () => {
    switch (warning.severity) {
      case 'high':
        return {
          background: 'bg-red-900/90 border-red-400',
          button: 'bg-red-600 hover:bg-red-700',
          icon: '🚨',
          textColor: 'text-red-100'
        };
      case 'medium':
        return {
          background: 'bg-yellow-900/90 border-yellow-400',
          button: 'bg-yellow-600 hover:bg-yellow-700',
          icon: '⚠️',
          textColor: 'text-yellow-100'
        };
      default:
        return {
          background: 'bg-blue-900/90 border-blue-400',
          button: 'bg-blue-600 hover:bg-blue-700',
          icon: 'ℹ️',
          textColor: 'text-blue-100'
        };
    }
  };

  const styles = getSeverityStyles();

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className={`max-w-md w-full ${styles.background} border-2 rounded-xl p-6 shadow-2xl`}>
        <div className="text-center mb-4">
          <div className="text-5xl mb-3">{styles.icon}</div>
          <h3 className="text-xl font-bold text-white mb-4">
            Location Hours Warning
          </h3>
          <p className={`text-base ${styles.textColor} leading-relaxed font-medium`}>
            {warning.message}
          </p>
        </div>

        {/* Additional details */}
        <div className="bg-black/30 rounded-lg p-4 mb-6 text-sm">
          <p className="mb-2 text-white font-medium">
            📍 <strong>Closed locations:</strong> <span className="text-red-300">{warning.closedCount}</span>
          </p>
          <p className="mb-3 text-white font-medium">
            ⏰ <strong>Closing soon:</strong> <span className="text-yellow-300">{warning.closingSoonCount}</span>
          </p>
          
          {/* Show closed locations with opening times */}
          {warning.closedDetails.length > 0 && (
            <div className="border-t border-white/20 pt-3 mb-3">
              <p className="text-white/90 font-medium mb-2 text-xs">CLOSED - OPENING TIMES:</p>
              {warning.closedDetails.map((location, index) => (
                <div key={index} className="text-red-200 text-xs mb-1">
                  🔒 The <strong>{getOrdinal(parseInt(location.riddleNumber))} riddle</strong> is closed
                  {location.hoursUntilOpen !== undefined && (
                    <span className="text-green-300 block ml-4">
                      ➜ Opens in {
                        location.hoursUntilOpen < 1 
                          ? `${Math.round(location.hoursUntilOpen * 60)} minute${Math.round(location.hoursUntilOpen * 60) !== 1 ? 's' : ''}` 
                          : location.hoursUntilOpen < 24 
                          ? `${(Math.round(location.hoursUntilOpen * 10) / 10)} hour${(Math.round(location.hoursUntilOpen * 10) / 10) !== 1 ? 's' : ''}`
                          : location.opensAt || 'later'
                      }
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Show closing times with riddle numbers (no location spoilers) */}
          {warning.closingSoonDetails.length > 0 && (
            <div className="border-t border-white/20 pt-3">
              <p className="text-white/90 font-medium mb-2 text-xs">CLOSING TIMES:</p>
              {warning.closingSoonDetails.map((location, index) => (
                <div key={index} className="text-yellow-200 text-xs mb-1">
                  🕐 The <strong>{getOrdinal(parseInt(location.riddleNumber))} riddle</strong> location closes at <span className="font-bold">{location.closingTime}</span>
                  {location.hoursLeft !== undefined && (
                    <span className="text-orange-300 block ml-4">
                      ➜ {
                        location.hoursLeft < 1 
                          ? `Only ${Math.round(location.hoursLeft * 60)} minute${Math.round(location.hoursLeft * 60) !== 1 ? 's' : ''} left!` 
                          : `${(Math.round(location.hoursLeft * 10) / 10)} hour${(Math.round(location.hoursLeft * 10) / 10) !== 1 ? 's' : ''} remaining`
                      }
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 border border-gray-500"
          >
            Go Back
          </button>
          <button
            onClick={onContinue}
            className={`flex-1 ${styles.button} text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200`}
          >
            Continue Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
