interface TimeWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  warning: {
    message: string;
    severity: 'high' | 'medium' | 'low';
    closedCount: number;
    closingSoonCount: number;
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
          background: 'bg-red-600/20 border-red-500/50',
          button: 'bg-red-600 hover:bg-red-700',
          icon: '🚨'
        };
      case 'medium':
        return {
          background: 'bg-yellow-600/20 border-yellow-500/50',
          button: 'bg-yellow-600 hover:bg-yellow-700',
          icon: '⚠️'
        };
      default:
        return {
          background: 'bg-blue-600/20 border-blue-500/50',
          button: 'bg-blue-600 hover:bg-blue-700',
          icon: 'ℹ️'
        };
    }
  };

  const styles = getSeverityStyles();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`max-w-md w-full ${styles.background} border rounded-xl p-6`}>
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">{styles.icon}</div>
          <h3 className="text-lg font-bold text-white mb-3">
            Location Hours Warning
          </h3>
          <p className="text-sm text-white/80 leading-relaxed">
            {warning.message}
          </p>
        </div>

        {/* Additional details */}
        <div className="bg-white/5 rounded-lg p-3 mb-4 text-xs text-white/70">
          <p className="mb-1">
            📍 <strong>Closed locations:</strong> {warning.closedCount}
          </p>
          <p>
            ⏰ <strong>Closing soon:</strong> {warning.closingSoonCount}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Go Back
          </button>
          <button
            onClick={onContinue}
            className={`flex-1 ${styles.button} text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200`}
          >
            Continue Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
