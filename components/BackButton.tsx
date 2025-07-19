'use client';

export default function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className="w-full text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 text-center"
    >
      ← Back to Completion Page
    </button>
  );
}