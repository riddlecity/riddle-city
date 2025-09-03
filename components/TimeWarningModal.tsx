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

// Helper function to format hours to nearest 0.5
function formatHours(hours: number): string {
  const rounded = Math.ceil(hours * 2) / 2; // Round up to nearest 0.5
  return rounded.toString();
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
      <div className={`max-w-2xl w-full ${styles.background} border-2 rounded-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">{styles.icon}</div>
          <h3 className="text-xl font-bold text-white mb-3">
            Location Hours Warning
          </h3>
          <p className={`text-base ${styles.textColor} leading-relaxed font-medium`}>
            {warning.message}
          </p>
        </div>

        {/* Compact Summary - Side by Side */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <div className="text-red-300 font-bold text-lg">{warning.closedCount}</div>
            <div className="text-white text-sm">📍 Closed locations</div>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <div className="text-yellow-300 font-bold text-lg">{warning.closingSoonCount}</div>
            <div className="text-white text-sm">⏰ Closing soon</div>
          </div>
        </div>

        {/* Detailed Information - Compact Grid Layout */}
        <div className="bg-black/30 rounded-lg p-4 mb-6 text-sm space-y-4">
          
          {/* Show closed locations with opening times - 2 Column Grid */}
          {warning.closedDetails.length > 0 && (
            <div>
              <p className="text-white/90 font-medium mb-3 text-xs border-b border-white/20 pb-1">
                🔒 CLOSED - OPENING TIMES:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {warning.closedDetails.map((location, index) => (
                  <div key={index} className="bg-black/20 rounded p-2">
                    <div className="text-red-200 text-xs font-medium">
                      {getOrdinal(parseInt(location.riddleNumber))} riddle is closed
                    </div>
                    {location.hoursUntilOpen !== undefined && (
                      <div className="text-green-300 text-xs mt-1">
                        ➜ Opens in {
                          location.hoursUntilOpen < 1 
                            ? `${Math.round(location.hoursUntilOpen * 60)}m` 
                            : location.hoursUntilOpen < 24 
                            ? `${formatHours(location.hoursUntilOpen)}h`
                            : location.opensAt || 'later'
                        }
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Show closing times - 2 Column Grid */}
          {warning.closingSoonDetails.length > 0 && (
            <div>
              <p className="text-white/90 font-medium mb-3 text-xs border-b border-white/20 pb-1">
                ⏰ CLOSING TIMES:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {warning.closingSoonDetails.map((location, index) => (
                  <div key={index} className="bg-black/20 rounded p-2">
                    <div className="text-yellow-200 text-xs font-medium">
                      {getOrdinal(parseInt(location.riddleNumber))} riddle closes at {location.closingTime}
                    </div>
                    {location.hoursLeft !== undefined && (
                      <div className="text-orange-300 text-xs mt-1">
                        ➜ {
                          location.hoursLeft < 1 
                            ? `${Math.round(location.hoursLeft * 60)}m left!` 
                            : `${formatHours(location.hoursLeft)}h left`
                        }
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
