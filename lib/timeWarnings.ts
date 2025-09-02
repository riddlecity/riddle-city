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

// Generate time-based warning for a location (without revealing location name)
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
      message: `⚠️ A riddle location is currently closed`,
      severity: 'high',
      location: locationName // Keep for internal use, don't show to user
    };
  }
  
  if (hoursLeft !== null && hoursLeft <= 2) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[ukTime.getDay()] as keyof OpeningHours;
    const todayHours = hours[currentDay];
    const closingTime = todayHours?.close || 'unknown time';
    
    return {
      type: 'closing_soon',
      message: `⏰ Warning: A riddle location closes at ${closingTime}`,
      severity: hoursLeft <= 1 ? 'high' : 'medium',
      location: locationName, // Keep for internal use
      closingTime,
      hoursUntilClose: hoursLeft
    };
  }
  
  return {
    type: 'open',
    message: `✅ All riddle locations are currently open`,
    severity: 'low',
    location: locationName
  };
}

// Check multiple locations and get overall warning status
export function getOverallTimeWarning(
  locations: Array<{ name: string; hours: OpeningHours; riddle_order?: number }>,
  ukTime: Date = getUKTime()
): {
  shouldWarn: boolean;
  closedCount: number;
  closingSoonCount: number;
  message: string;
  severity: 'high' | 'medium' | 'low';
  closingSoonDetails: Array<{ riddleNumber: string; closingTime: string }>;
} {
  const warnings = locations.map((loc, index) => {
    const warning = generateLocationWarning(loc.name, loc.hours, ukTime);
    return {
      ...warning,
      riddleNumber: loc.riddle_order ? `${loc.riddle_order}` : `${index + 1}`
    };
  });
  
  const closedCount = warnings.filter(w => w?.type === 'closed').length;
  const closingSoonCount = warnings.filter(w => w?.type === 'closing_soon').length;
  
  // Get details of locations closing soon with riddle numbers
  const closingSoonDetails = warnings
    .filter(w => w?.type === 'closing_soon')
    .map(w => ({
      riddleNumber: w!.riddleNumber,
      closingTime: w!.closingTime || 'unknown time'
    }));
  
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
    
    if (closingSoonCount === 1) {
      const location = closingSoonDetails[0];
      message = `⏰ The ${getOrdinal(parseInt(location.riddleNumber))} riddle location closes at ${location.closingTime}. You may need to hurry to complete all riddles. Are you sure you wish to continue?`;
    } else {
      message = `⏰ ${closingSoonCount} riddle locations close within 2 hours. You may need to hurry to complete all riddles. Are you sure you wish to continue?`;
    }
  }
  
  return {
    shouldWarn,
    closedCount,
    closingSoonCount,
    message,
    severity,
    closingSoonDetails
  };
}

// Helper function to get ordinal numbers (1st, 2nd, 3rd, etc.)
function getOrdinal(num: number): string {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const remainder = num % 100;
  return num + (suffix[(remainder - 20) % 10] || suffix[remainder] || suffix[0]);
}
