// lib/locationEmergencySkip.ts
// Server-side check for whether a riddle's location is closed / closing very
// soon, used to allow ANY group member (not just the leader) to skip when
// the venue itself is unavailable. This must be computed server-side from
// the riddle's own opening_hours data - never trust a client-supplied flag,
// since that would let anyone bypass the leader-only skip restriction.

interface DayHours {
  open: string;  // "HH:MM"
  close: string; // "HH:MM"
}

type ParsedHours = Partial<Record<
  'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday',
  DayHours
>>;

const EMERGENCY_WINDOW_MINUTES = 10;

/**
 * Returns true if the location is currently closed, or will close within
 * EMERGENCY_WINDOW_MINUTES, based on its opening_hours data.
 */
export function isLocationEmergencySkippable(openingHoursRaw: unknown): boolean {
  if (!openingHoursRaw) return false;

  let parsedHours: ParsedHours | null = null;
  try {
    parsedHours = typeof openingHoursRaw === 'string'
      ? JSON.parse(openingHoursRaw)
      : (openingHoursRaw as ParsedHours);
  } catch {
    return false;
  }

  if (!parsedHours) return false;

  const ukTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const currentDay = dayNames[ukTime.getDay()];
  const todayHours = parsedHours[currentDay];

  // No hours listed for today = closed today
  if (!todayHours) return true;

  const currentMinutes = ukTime.getHours() * 60 + ukTime.getMinutes();
  const [openHour, openMinute] = todayHours.open.split(':').map(Number);
  const [closeHour, closeMinute] = todayHours.close.split(':').map(Number);
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;

  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  if (!isOpen) {
    // Not open yet today, or already closed for the day
    return true;
  }

  // Open, but check if closing within the emergency window
  const minutesUntilClose = closeMinutes - currentMinutes;
  return minutesUntilClose <= EMERGENCY_WINDOW_MINUTES;
}
