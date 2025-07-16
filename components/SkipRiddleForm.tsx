// components/SkipRiddleForm.tsx
'use client';

interface SkipRiddleFormProps {
  groupId: string;
}

export default function SkipRiddleForm({ groupId }: SkipRiddleFormProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch("/api/skip-riddle", {
        method: "POST",
        body: new URLSearchParams({ groupId }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.nextRiddleId) {
        window.location.href = `/riddle/${data.nextRiddleId}`;
      } else {
        alert("Could not skip riddle: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      alert("Error skipping riddle: " + error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="absolute bottom-4 right-4">
      <button
        type="submit"
        className="text-xs text-white/60 hover:text-white transition"
      >
        🚧 Skip this riddle
      </button>
    </form>
  );
}