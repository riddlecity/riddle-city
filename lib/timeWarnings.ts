import { OpeningHours } from './googlePlaces';

export interface TimeWarning {
  type: 'closed' | 'closing_soon' | 'open';
  message: string;
  severity: 'high' | 'medium' | 'low';
  location: string;
  closingTime?: string;
  hoursUntilClose?: number;
}

// Get current UK time as a proper Date object
export function getUKTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
}

// Check if a location is currently open
export function isLocationOpen(hours: OpeningHours, ukTime: Date = getUKTime()): boolean {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[ukTime.getDay()] as keyof OpeningHours;
  const todayHours = hours[currentDay];
  
  if (!todayHours) return false; // Closed if no hours defined
  
  const currentMinutes = ukTime.getHours() * 60 + ukTime.getMinutes();
  const [openHour, openMinute] = todayHours.open.split(':').map(Number);
  const [closeHour, closeMinute] = todayHours.close.split(':').map(Number);
  
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;
  
  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

// Get hours until location closes
export function hoursUntilClose(hours: OpeningHours, ukTime: Date = getUKTime()): number | null {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[ukTime.getDay()] as keyof OpeningHours;
  const todayHours = hours[currentDay];
  
  if (!todayHours) return null;
  
  const currentMinutes = ukTime.getHours() * 60 + ukTime.getMinutes();
  const [closeHour, closeMinute] = todayHours.close.split(':').map(Number);
  const closeMinutes = closeHour * 60 + closeMinute;
  
  const minutesUntilClose = closeMinutes - currentMinutes;
  return minutesUntilClose > 0 ? minutesUntilClose / 60 : 0;
}

// Generate time-based warning for a location
export function generateLocationWarning(
  locationName: string, 
  hours: OpeningHours, 
  ukTime: Date = getUKTime()
): TimeWarning | null {
  const isOpen = isLocationOpen(hours, ukTime);
  const hoursLeft = hoursUntilClose(hours, ukTime);
  
  if (!isOpen) {
    return {
      type: 'closed',
      message: `⚠️ ${locationName} is currently closed`,
      severity: 'high',
      location: locationName
    };
  }
  
  if (hoursLeft !== null && hoursLeft <= 2) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[ukTime.getDay()] as keyof OpeningHours;
    const todayHours = hours[currentDay];
    const closingTime = todayHours?.close || 'unknown time';
    
    return {
      type: 'closing_soon',
      message: `⏰ Warning: Access to this riddle closes at ${closingTime}`,
      severity: hoursLeft <= 1 ? 'high' : 'medium',
      location: locationName,
      closingTime,
      hoursUntilClose: hoursLeft
    };
  }
  
  return {
    type: 'open',
    message: `✅ ${locationName} is currently open`,
    severity: 'low',
    location: locationName
  };
}

// Check multiple locations and get overall warning status
export function getOverallTimeWarning(
  locations: Array<{ name: string; hours: OpeningHours }>,
  ukTime: Date = getUKTime()
): {
  shouldWarn: boolean;
  closedCount: number;
  closingSoonCount: number;
  message: string;
  severity: 'high' | 'medium' | 'low';
} {
  const warnings = locations.map(loc => generateLocationWarning(loc.name, loc.hours, ukTime));
  const closedCount = warnings.filter(w => w?.type === 'closed').length;
  const closingSoonCount = warnings.filter(w => w?.type === 'closing_soon').length;
  
  let message = '';
  let severity: 'high' | 'medium' | 'low' = 'low';
  let shouldWarn = false;
  
  if (closedCount > 0) {
    shouldWarn = true;
    severity = 'high';
    message = `⚠️ ${closedCount} riddle location${closedCount > 1 ? 's are' : ' is'} currently closed. Some riddles will not be accessible at this time. Are you sure you wish to continue?`;
  } else if (closingSoonCount > 0) {
    shouldWarn = true;
    severity = closingSoonCount > 2 ? 'high' : 'medium';
    message = `⏰ ${closingSoonCount} riddle location${closingSoonCount > 1 ? 's close' : ' closes'} within 2 hours. You may need to hurry to complete all riddles. Are you sure you wish to continue?`;
  }
  
  return {
    shouldWarn,
    closedCount,
    closingSoonCount,
    message,
    severity
  };
}
