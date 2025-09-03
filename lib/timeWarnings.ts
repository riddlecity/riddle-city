import { OpeningHours } from './googlePlaces';

export interface TimeWarning {
  type: 'closed' | 'closing_soon' | 'open';
  message: string;
  severity: 'high' | 'medium' | 'low';
  location: string;
  closingTime?: string;
  hoursUntilClose?: number;
  hoursUntilOpen?: number; // New field for closed locations
  opensAt?: string; // New field for when closed location opens
}

// Enhanced interface for cached opening hours
interface CachedOpeningHours {
  open_now?: boolean;
  periods?: Array<{
    close?: { day: number; time: string };
    open?: { day: number; time: string };
  }>;
  weekday_text?: string[];
  parsed_hours?: {
    [key: string]: { open: string; close: string } | null;
  };
}

// Get current UK time as a proper Date object
export function getUKTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
}

// Check if a location is currently open (enhanced for both formats)
export function isLocationOpen(hours: OpeningHours | CachedOpeningHours, ukTime: Date = getUKTime()): boolean {
  // Handle new cached format
  if ('parsed_hours' in hours && hours.parsed_hours) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[ukTime.getDay()];
    const todayHours = hours.parsed_hours[currentDay];
    
    if (!todayHours) return false;
    
    const currentMinutes = ukTime.getHours() * 60 + ukTime.getMinutes();
    const [openHour, openMinute] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMinute] = todayHours.close.split(':').map(Number);
    
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;
    
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }
  
  // Handle legacy format
  if ('monday' in hours) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[ukTime.getDay()] as keyof OpeningHours;
    const todayHours = hours[currentDay];
    
    if (!todayHours) return false;
    
    const currentMinutes = ukTime.getHours() * 60 + ukTime.getMinutes();
    const [openHour, openMinute] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMinute] = todayHours.close.split(':').map(Number);
    
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;
    
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }
  
  return false;
}

// Get hours until location closes (enhanced for both formats)
export function hoursUntilClose(hours: OpeningHours | CachedOpeningHours, ukTime: Date = getUKTime()): number | null {
  // Handle new cached format
  if ('parsed_hours' in hours && hours.parsed_hours) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[ukTime.getDay()];
    const todayHours = hours.parsed_hours[currentDay];
    
    if (!todayHours) return null;
    
    const currentMinutes = ukTime.getHours() * 60 + ukTime.getMinutes();
    const [closeHour, closeMinute] = todayHours.close.split(':').map(Number);
    const closeMinutes = closeHour * 60 + closeMinute;
    
    const minutesUntilClose = closeMinutes - currentMinutes;
    return minutesUntilClose > 0 ? minutesUntilClose / 60 : 0;
  }
  
  // Handle legacy format
  if ('monday' in hours) {
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
  
  return null;
}

// NEW: Get hours until location opens (for closed locations)
export function hoursUntilOpen(hours: OpeningHours | CachedOpeningHours, ukTime: Date = getUKTime()): { hours: number; opensAt: string } | null {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  // Try to find the next opening time starting from today
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const checkDate = new Date(ukTime);
    checkDate.setDate(checkDate.getDate() + dayOffset);
    const checkDay = dayNames[checkDate.getDay()];
    
    let dayHours = null;
    
    // Handle new cached format
    if ('parsed_hours' in hours && hours.parsed_hours) {
      dayHours = hours.parsed_hours[checkDay];
    }
    // Handle legacy format
    else if ('monday' in hours) {
      dayHours = hours[checkDay as keyof OpeningHours];
    }
    
    if (dayHours) {
      const [openHour, openMinute] = dayHours.open.split(':').map(Number);
      
      if (dayOffset === 0) {
        // Today - check if opening time is in the future
        const currentMinutes = ukTime.getHours() * 60 + ukTime.getMinutes();
        const openMinutes = openHour * 60 + openMinute;
        
        if (openMinutes > currentMinutes) {
          const minutesUntilOpen = openMinutes - currentMinutes;
          return {
            hours: minutesUntilOpen / 60,
            opensAt: dayHours.open
          };
        }
      } else {
        // Future day - calculate time difference
        const openingTime = new Date(checkDate);
        openingTime.setHours(openHour, openMinute, 0, 0);
        
        const hoursUntilOpen = (openingTime.getTime() - ukTime.getTime()) / (1000 * 60 * 60);
        
        return {
          hours: hoursUntilOpen,
          opensAt: `${checkDay.charAt(0).toUpperCase() + checkDay.slice(1)} at ${dayHours.open}`
        };
      }
    }
  }
  
  return null; // Location appears to be permanently closed
}

// Generate time-based warning for a location (without revealing location name)
export function generateLocationWarning(
  locationName: string, 
  hours: OpeningHours | CachedOpeningHours, 
  ukTime: Date = getUKTime()
): TimeWarning | null {
  const isOpen = isLocationOpen(hours, ukTime);
  
  if (!isOpen) {
    // Location is closed - calculate when it opens
    const openingInfo = hoursUntilOpen(hours, ukTime);
    
    if (openingInfo) {
      const hoursUntil = openingInfo.hours;
      let message = '';
      let severity: 'high' | 'medium' | 'low' = 'high';
      
      if (hoursUntil < 1) {
        const minutesUntil = Math.round(hoursUntil * 60);
        message = `⚠️ A riddle location is currently closed but opens in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}`;
        severity = 'medium';
      } else if (hoursUntil < 24) {
        const roundedHours = Math.round(hoursUntil * 10) / 10;
        message = `⚠️ A riddle location is currently closed but opens in ${roundedHours} hour${roundedHours !== 1 ? 's' : ''}`;
        severity = 'high';
      } else {
        message = `⚠️ A riddle location is currently closed and opens ${openingInfo.opensAt}`;
        severity = 'high';
      }
      
      return {
        type: 'closed',
        message,
        severity,
        location: locationName,
        hoursUntilOpen: hoursUntil,
        opensAt: openingInfo.opensAt
      };
    } else {
      return {
        type: 'closed',
        message: `⚠️ A riddle location is currently closed`,
        severity: 'high',
        location: locationName
      };
    }
  }
  
  // Location is open - check if closing soon
  const hoursLeft = hoursUntilClose(hours, ukTime);
  
  if (hoursLeft !== null && hoursLeft <= 2) {
    let closingTime = 'unknown time';
    
    // Get closing time from either format
    if ('parsed_hours' in hours && hours.parsed_hours) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = dayNames[ukTime.getDay()];
      const todayHours = hours.parsed_hours[currentDay];
      closingTime = todayHours?.close || 'unknown time';
    } else if ('monday' in hours) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = dayNames[ukTime.getDay()] as keyof OpeningHours;
      const todayHours = hours[currentDay];
      closingTime = todayHours?.close || 'unknown time';
    }
    
    let message = '';
    if (hoursLeft < 1) {
      const minutesLeft = Math.round(hoursLeft * 60);
      message = `⏰ Warning: A riddle location closes in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''} (at ${closingTime})`;
    } else {
      const roundedHours = Math.round(hoursLeft * 10) / 10;
      message = `⏰ Warning: A riddle location closes in ${roundedHours} hour${roundedHours !== 1 ? 's' : ''} (at ${closingTime})`;
    }
    
    return {
      type: 'closing_soon',
      message,
      severity: hoursLeft <= 1 ? 'high' : 'medium',
      location: locationName,
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
  locations: Array<{ name: string; hours: OpeningHours | CachedOpeningHours; riddle_order?: number }>,
  ukTime: Date = getUKTime()
): {
  shouldWarn: boolean;
  closedCount: number;
  closingSoonCount: number;
  message: string;
  severity: 'high' | 'medium' | 'low';
  closingSoonDetails: Array<{ riddleNumber: string; closingTime: string; hoursLeft?: number }>;
  closedDetails: Array<{ riddleNumber: string; hoursUntilOpen?: number; opensAt?: string }>;
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
      closingTime: w!.closingTime || 'unknown time',
      hoursLeft: w!.hoursUntilClose
    }));
  
  // Get details of closed locations with opening times
  const closedDetails = warnings
    .filter(w => w?.type === 'closed')
    .map(w => ({
      riddleNumber: w!.riddleNumber,
      hoursUntilOpen: w!.hoursUntilOpen,
      opensAt: w!.opensAt
    }));
  
  let message = '';
  let severity: 'high' | 'medium' | 'low' = 'low';
  let shouldWarn = false;
  
  if (closedCount > 0) {
    shouldWarn = true;
    severity = 'high';
    
    // Find the earliest opening time for better messaging
    const nextOpening = closedDetails
      .filter(d => d.hoursUntilOpen !== undefined)
      .sort((a, b) => (a.hoursUntilOpen || 999) - (b.hoursUntilOpen || 999))[0];
    
    if (nextOpening && nextOpening.hoursUntilOpen !== undefined) {
      const hoursUntil = nextOpening.hoursUntilOpen;
      
      if (hoursUntil < 1) {
        const minutesUntil = Math.round(hoursUntil * 60);
        message = `⚠️ ${closedCount} riddle location${closedCount > 1 ? 's are' : ' is'} currently closed, but the next one opens in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}. You may want to wait before starting. Are you sure you wish to continue?`;
      } else if (hoursUntil < 2) {
        const roundedHours = Math.round(hoursUntil * 10) / 10;
        message = `⚠️ ${closedCount} riddle location${closedCount > 1 ? 's are' : ' is'} currently closed, but the next one opens in ${roundedHours} hour${roundedHours !== 1 ? 's' : ''}. You may want to wait before starting. Are you sure you wish to continue?`;
        severity = 'medium';
      } else {
        message = `⚠️ ${closedCount} riddle location${closedCount > 1 ? 's are' : ' is'} currently closed. Some riddles will not be accessible at this time. Are you sure you wish to continue?`;
      }
    } else {
      message = `⚠️ ${closedCount} riddle location${closedCount > 1 ? 's are' : ' is'} currently closed. Some riddles will not be accessible at this time. Are you sure you wish to continue?`;
    }
  } else if (closingSoonCount > 0) {
    shouldWarn = true;
    severity = closingSoonCount > 2 ? 'high' : 'medium';
    
    // Find the earliest closing time for better messaging
    const nextClosing = closingSoonDetails
      .sort((a, b) => (a.hoursLeft || 999) - (b.hoursLeft || 999))[0];
    
    if (closingSoonCount === 1) {
      const hoursLeft = nextClosing.hoursLeft || 0;
      if (hoursLeft < 1) {
        const minutesLeft = Math.round(hoursLeft * 60);
        message = `⏰ The ${getOrdinal(parseInt(nextClosing.riddleNumber))} riddle location closes in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}! You'll need to hurry to complete all riddles. Are you sure you wish to continue?`;
        severity = 'high';
      } else {
        message = `⏰ The ${getOrdinal(parseInt(nextClosing.riddleNumber))} riddle location closes at ${nextClosing.closingTime}. You may need to hurry to complete all riddles. Are you sure you wish to continue?`;
      }
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
    closingSoonDetails,
    closedDetails
  };
}

// Helper function to get ordinal numbers (1st, 2nd, 3rd, etc.)
function getOrdinal(num: number): string {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const remainder = num % 100;
  return num + (suffix[(remainder - 20) % 10] || suffix[remainder] || suffix[0]);
}
