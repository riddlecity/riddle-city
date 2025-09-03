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
          background: 'bg-red-900/90 border-red-400',
          button: 'bg-red-600 hover:bg-red-700',
          icon: '🚨',
          textColor: 'text-red-100'
        };
      default:
        return {
          background: 'bg-yellow-900/90 border-yellow-400',
          button: 'bg-yellow-600 hover:bg-yellow-700',
          icon: '⚠️',
          textColor: 'text-yellow-100'
        };
    }
  };

  const styles = getSeverityStyles();

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className={`max-w-md w-full ${styles.background} border-2 rounded-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">{styles.icon}</div>
          <h3 className="text-xl font-bold text-white mb-3">
            Location Hours Warning
          </h3>
          <p className={`text-lg ${styles.textColor} leading-relaxed font-medium`}>
            {warning.message}
          </p>
        </div>

        {/* Simple action-focused message */}
        <div className="bg-black/30 rounded-lg p-4 mb-6 text-center">
          <div className={`text-sm ${styles.textColor} opacity-90`}>
            {(warning.closedCount > 0 || warning.closingSoonCount > 0) 
              ? "You can still play, but some locations may not be accessible. Continue anyway?" 
              : "Ready to start your adventure?"
            }
          </div>
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
