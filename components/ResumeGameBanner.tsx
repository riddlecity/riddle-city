// components/ResumeGameBanner.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface ActiveGameResponse {
  isActive: boolean;
  isFinished?: boolean;
  currentRiddleId?: string | null;
  groupId?: string;
  gameStarted?: string;
}

export default function ResumeGameBanner() {
  const [visible, setVisible] = useState(false);
  const [teamName, setTeamName] = useState<string>('Your Team');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [currentRiddleId, setCurrentRiddleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const tick = useRef<NodeJS.Timeout | null>(null);

  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
    return null;
  };

  const check = async () => {
    try {
      const cGroup = getCookie('group_id');
      const cUser = getCookie('user_id');
      const cTeam = getCookie('team_name') || 'Your Team';

      if (!cGroup || !cUser) {
        setVisible(false);
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/check-active-game?groupId=${encodeURIComponent(cGroup)}&userId=${encodeURIComponent(cUser)}`, { cache: 'no-store' });
      if (!res.ok) {
        setVisible(false);
        setLoading(false);
        return;
      }
      const data: ActiveGameResponse = await res.json();

      if (data.isActive && !data.isFinished) {
        setTeamName(cTeam);
        setGroupId(data.groupId ?? cGroup);
        setCurrentRiddleId(data.currentRiddleId ?? null);
        // respect “hide for this tab” if user dismissed earlier
        const hidden = sessionStorage.getItem('resume_banner_hidden') === '1';
        setVisible(!hidden);
      } else {
        setVisible(false);
      }
    } catch {
      setVisible(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    check(); // initial
    tick.current = setInterval(check, 10000); // poll every 10s
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, []);

  if (loading || !visible || !groupId) return null;

  const href = currentRiddleId ? `/riddle/${currentRiddleId}` : `/waiting/${groupId}`;

  const dismiss = () => {
    sessionStorage.setItem('resume_banner_hidden', '1');
    setVisible(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎮</div>
            <div>
              <div className="font-semibold">
                You have an active game as "{teamName}"
              </div>
              <div className="text-sm text-white/80">
                Continue your adventure where you left off
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={href}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
            >
              <span>🚀</span>
              Resume Game
            </Link>

            <button
              onClick={dismiss}
              className="text-white/90 hover:text-white transition-colors duration-200 p-2"
              title="Dismiss banner (this tab)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
