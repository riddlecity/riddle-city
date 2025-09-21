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
  // Use Intl.DateTimeFormat for more reliable timezone conversion
  const now = new Date();
  const ukTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now);

  const year = parseInt(ukTime.find(part => part.type === 'year')?.value || '0');
  const month = parseInt(ukTime.find(part => part.type === 'month')?.value || '1') - 1; // Month is 0-indexed
  const day = parseInt(ukTime.find(part => part.type === 'day')?.value || '1');
  const hour = parseInt(ukTime.find(part => part.type === 'hour')?.value || '0');
  const minute = parseInt(ukTime.find(part => part.type === 'minute')?.value || '0');
  const second = parseInt(ukTime.find(part => part.type === 'second')?.value || '0');

  return new Date(year, month, day, hour, minute, second);
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
    let closeMinutes = closeHour * 60 + closeMinute;
    
    // Handle midnight closures (00:00, 00:30, etc.) - they close the next day
    if (closeHour === 0 || (closeHour === 0 && closeMinute > 0)) {
      closeMinutes += 24 * 60; // Add 24 hours
    }
    
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
    let closeMinutes = closeHour * 60 + closeMinute;
    
    // Handle midnight closures (00:00, 00:30, etc.) - they close the next day
    if (closeHour === 0 || (closeHour === 0 && closeMinute > 0)) {
      closeMinutes += 24 * 60; // Add 24 hours
    }
    
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
    let closeMinutes = closeHour * 60 + closeMinute;
    
    // Handle midnight closures (00:00, 00:30, etc.) - they close the next day
    if (closeHour === 0 || (closeHour === 0 && closeMinute > 0)) {
      closeMinutes += 24 * 60; // Add 24 hours
    }
    
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
    let closeMinutes = closeHour * 60 + closeMinute;
    
    // Handle midnight closures (00:00, 00:30, etc.) - they close the next day
    if (closeHour === 0 || (closeHour === 0 && closeMinute > 0)) {
      closeMinutes += 24 * 60; // Add 24 hours
    }
    
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
    
    // Separate riddles by those opening soon vs closed all day
    const openingSoonRiddles: Array<{riddleNumber: string; hoursUntilOpen: number}> = [];
    const closedAllDayRiddles: string[] = [];
    
    closedDetails.forEach(d => {
      if (d.hoursUntilOpen !== undefined && d.hoursUntilOpen < 6) {
        // Opening within 6 hours - worth mentioning
        openingSoonRiddles.push({
          riddleNumber: d.riddleNumber,
          hoursUntilOpen: d.hoursUntilOpen
        });
      } else {
        // Closed all day or opening tomorrow
        closedAllDayRiddles.push(d.riddleNumber);
      }
    });
    
    // Sort by riddle number for consistent display
    openingSoonRiddles.sort((a, b) => parseInt(a.riddleNumber) - parseInt(b.riddleNumber));
    closedAllDayRiddles.sort((a, b) => parseInt(a) - parseInt(b));
    
    const messageParts: string[] = [];
    
    // Handle riddles closed all day
    if (closedAllDayRiddles.length > 0) {
      if (closedAllDayRiddles.length === 1) {
        messageParts.push(`Access to Riddle ${closedAllDayRiddles[0]} is now closed`);
      } else {
        messageParts.push(`Access to Riddles ${closedAllDayRiddles.join(', ')} is now closed`);
      }
    }
    
    // Handle riddles opening soon
    if (openingSoonRiddles.length > 0) {
      const openingTexts = openingSoonRiddles.map(r => {
        if (r.hoursUntilOpen < 1) {
          const minutes = Math.round(r.hoursUntilOpen * 60);
          return `Riddle ${r.riddleNumber} opens in ${minutes}m`;
        } else {
          const hours = Math.ceil(r.hoursUntilOpen * 2) / 2;
          return `Riddle ${r.riddleNumber} opens in ${hours}h`;
        }
      });
      messageParts.push(...openingTexts);
    }
    
    // Handle riddles closing soon (only when there are also closed riddles)
    if (closingSoonCount > 0) {
      const sortedClosingDetails = closingSoonDetails.sort((a, b) => (a.hoursLeft || 999) - (b.hoursLeft || 999));
      
      sortedClosingDetails.forEach(d => {
        const hoursLeft = d.hoursLeft || 0;
        if (hoursLeft < 1) {
          const minutesLeft = Math.round(hoursLeft * 60);
          messageParts.push(`Riddle ${d.riddleNumber} closes in ${minutesLeft}m`);
        } else {
          const roundedHours = Math.ceil(hoursLeft * 2) / 2;
          messageParts.push(`Riddle ${d.riddleNumber} closes in ${roundedHours}h`);
        }
      });
    }
    
    message = `⚠️ ${messageParts.join('. ')}`;
    
    // Set severity based on what's happening
    if (openingSoonRiddles.some(r => r.hoursUntilOpen < 1)) {
      severity = 'medium'; // Something opens soon
    } else if (openingSoonRiddles.length > 0) {
      severity = 'medium'; // Something opens later today  
    } else {
      severity = 'high'; // Everything closed all day
    }
  } else if (closingSoonCount > 0) {
    shouldWarn = true;
    severity = 'medium';
    
    // Sort closing soon details by time remaining (earliest first)
    const sortedClosingDetails = closingSoonDetails.sort((a, b) => (a.hoursLeft || 999) - (b.hoursLeft || 999));
    
    const messageParts: string[] = [];
    
    // Create clear individual messages for each riddle
    sortedClosingDetails.forEach(d => {
      const hoursLeft = d.hoursLeft || 0;
      if (hoursLeft < 1) {
        const minutesLeft = Math.round(hoursLeft * 60);
        messageParts.push(`Riddle ${d.riddleNumber} closes in ${minutesLeft}m`);
        severity = 'high'; // Very urgent
      } else {
        const roundedHours = Math.ceil(hoursLeft * 2) / 2;
        messageParts.push(`Riddle ${d.riddleNumber} closes in ${roundedHours}h`);
      }
    });
    
    if (messageParts.length === 1) {
      message = `⏰ ${messageParts[0]}`;
    } else {
      message = `⏰ ${messageParts.join('. ')}`;
    }
  }
  
  // Handle case where no riddles are permanently closed, but some are opening soon
  // This is especially useful for early morning starts
  if (!shouldWarn && closedDetails.length > 0) {
    const earlyOpeningRiddles = closedDetails.filter(d => 
      d.hoursUntilOpen !== undefined && d.hoursUntilOpen < 4 // Opening within 4 hours
    );
    
    if (earlyOpeningRiddles.length > 0) {
      shouldWarn = true;
      severity = 'medium';
      
      // Sort by opening time (earliest first)
      earlyOpeningRiddles.sort((a, b) => (a.hoursUntilOpen || 999) - (b.hoursUntilOpen || 999));
      
      const openingTexts = earlyOpeningRiddles.map(r => {
        if (r.hoursUntilOpen! < 1) {
          const minutes = Math.round(r.hoursUntilOpen! * 60);
          return `Riddle ${r.riddleNumber} opens in ${minutes}m`;
        } else {
          const hours = Math.ceil(r.hoursUntilOpen! * 2) / 2;
          return `Riddle ${r.riddleNumber} opens in ${hours}h`;
        }
      });
      
      if (openingTexts.length === 1) {
        message = `🕐 ${openingTexts[0]}`;
      } else {
        message = `🕐 ${openingTexts.join('. ')}`;
      }
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
