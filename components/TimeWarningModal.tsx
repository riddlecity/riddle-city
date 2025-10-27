interface TimeWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  warning: {
    message: string;
    severity: 'high' | 'medium' | 'low';
    closedCount: number;
    closingSoonCount: number;
    isBankHoliday: boolean;
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
          background: 'bg-gradient-to-br from-red-900/95 to-red-950/95',
          border: 'border-red-500/50',
          buttonContinue: 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700',
          buttonBack: 'bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/40',
          icon: '🚨',
          textColor: 'text-red-100',
          heading: 'text-white'
        };
      case 'medium':
        return {
          background: 'bg-gradient-to-br from-yellow-900/95 to-orange-950/95',
          border: 'border-yellow-500/50',
          buttonContinue: 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700',
          buttonBack: 'bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/40',
          icon: '⚠️',
          textColor: 'text-yellow-100',
          heading: 'text-white'
        };
      default:
        return {
          background: 'bg-gradient-to-br from-blue-900/95 to-blue-950/95',
          border: 'border-blue-500/50',
          buttonContinue: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
          buttonBack: 'bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/40',
          icon: 'ℹ️',
          textColor: 'text-blue-100',
          heading: 'text-white'
        };
    }
  };

  const styles = getSeverityStyles();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className={`max-w-md w-full ${styles.background} border-2 ${styles.border} rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto backdrop-blur-md`}>
        <div className="text-center mb-6">
          <div className="text-5xl mb-3 animate-pulse">{styles.icon}</div>
          <h3 className={`text-2xl font-bold ${styles.heading} mb-4 tracking-tight`}>
            Location Hours Notice
          </h3>
          <p className={`text-lg ${styles.textColor} leading-relaxed font-medium`}>
            {warning.message}
          </p>
        </div>

        {/* Bank Holiday Warning */}
        {warning.isBankHoliday && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/20">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🏦</div>
              <div className="flex-1">
                <p className="text-white font-semibold mb-1">UK Bank Holiday</p>
                <p className="text-white/80 text-sm leading-relaxed">
                  Some locations may have different opening hours today. We recommend checking directly with venues before visiting.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Location Status Info */}
        {(warning.closedCount > 0 || warning.closingSoonCount > 0) && (
          <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/10">
            <div className={`text-sm ${styles.textColor} opacity-90 leading-relaxed`}>
              You can still start your adventure, but some locations may not be accessible right now. 
              {warning.closedCount > 0 && warning.closingSoonCount === 0 && (
                <span className="block mt-2 font-medium">
                  {warning.closedCount} location{warning.closedCount > 1 ? 's are' : ' is'} currently closed.
                </span>
              )}
              {warning.closingSoonCount > 0 && warning.closedCount === 0 && (
                <span className="block mt-2 font-medium">
                  {warning.closingSoonCount} location{warning.closingSoonCount > 1 ? 's are' : ' is'} closing soon.
                </span>
              )}
              {warning.closedCount > 0 && warning.closingSoonCount > 0 && (
                <span className="block mt-2 font-medium">
                  {warning.closedCount} closed, {warning.closingSoonCount} closing soon.
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={`flex-1 ${styles.buttonBack} text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 border`}
          >
            Go Back
          </button>
          <button
            onClick={onContinue}
            className={`flex-1 ${styles.buttonContinue} text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl`}
          >
            Continue Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
