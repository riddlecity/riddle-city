interface StartFreshModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function StartFreshModal({ 
  isOpen, 
  onClose, 
  onConfirm 
}: StartFreshModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-gradient-to-br from-red-900/95 to-red-950/95 border-2 border-red-500/50 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3 animate-pulse">⚠️</div>
          <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">
            Warning: Starting Fresh
          </h3>
          <p className="text-lg text-red-100 leading-relaxed font-medium mb-4">
            This will permanently delete your current adventure progress.
          </p>
        </div>

        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/10">
          <div className="text-sm text-red-100 leading-relaxed space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-xl">🔒</span>
              <p className="flex-1">
                <span className="font-semibold text-white">You will lose access to your current game</span>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">❌</span>
              <p className="flex-1">
                <span className="font-semibold text-white">All progress will be lost</span>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">💳</span>
              <p className="flex-1">
                <span className="font-semibold text-white">You will need to pay again to start a new adventure</span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-red-100 mb-6 text-sm">
          Are you sure you want to start fresh?
        </p>

        <div className="flex gap-3 flex-col sm:flex-row">
          <button
            onClick={onClose}
            className="flex-1 bg-white/10 hover:bg-white/20 border-2 border-white/20 hover:border-white/40 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Start Fresh
          </button>
        </div>
      </div>
    </div>
  );
}
