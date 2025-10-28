// Updated time warnings system using database instead of cache
// lib/timeWarnings.ts

import { createClient } from './supabase/server';
import { isTodayBankHoliday } from './bankHolidays';

export interface TimeWarning {
  type: 'closed' | 'closing_soon' | 'open' | 'bank_holiday';
  message: string;
  severity: 'high' | 'medium' | 'low';
  location: string;
  closingTime?: string;
  hoursUntilClose?: number;
  hoursUntilOpen?: number;
  opensAt?: string;
  closedToday?: boolean; // True if closed for the entire day
  isBankHoliday?: boolean; // True if today is a UK bank holiday
}

// Database opening hours format
interface DatabaseOpeningHours {
  monday?: { open: string; close: string } | null;
  tuesday?: { open: string; close: string } | null;
  wednesday?: { open: string; close: string } | null;
  thursday?: { open: string; close: string } | null;
  friday?: { open: string; close: string } | null;
  saturday?: { open: string; close: string } | null;
  sunday?: { open: string; close: string } | null;
}

// Get current UK time
export function getUKTime(): Date {
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
  const month = parseInt(ukTime.find(part => part.type === 'month')?.value || '1') - 1;
  const day = parseInt(ukTime.find(part => part.type === 'day')?.value || '1');
  const hour = parseInt(ukTime.find(part => part.type === 'hour')?.value || '0');
  const minute = parseInt(ukTime.find(part => part.type === 'minute')?.value || '0');
  const second = parseInt(ukTime.find(part => part.type === 'second')?.value || '0');

  return new Date(year, month, day, hour, minute, second);
}



// Check if location is currently open
function isLocationOpen(hours: DatabaseOpeningHours, ukTime: Date): boolean {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[ukTime.getDay()] as keyof DatabaseOpeningHours;
  const todayHours = hours[currentDay];

  if (!todayHours) {
    return false; // Closed today
  }

  const currentMinutes = ukTime.getHours() * 60 + ukTime.getMinutes();
  const [openHour, openMinute] = todayHours.open.split(':').map(Number);
  const [closeHour, closeMinute] = todayHours.close.split(':').map(Number);

  const openMinutes = openHour * 60 + openMinute;
  let closeMinutes = closeHour * 60 + closeMinute;

  // Handle midnight closures (e.g., 00:00 or 00:30)
  if (closeHour === 0 || (closeHour === 0 && closeMinute > 0)) {
    closeMinutes += 24 * 60; // Add 24 hours for next day
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

// Calculate hours until location closes
function hoursUntilClose(hours: DatabaseOpeningHours, ukTime: Date): number | null {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[ukTime.getDay()] as keyof DatabaseOpeningHours;
  const todayHours = hours[currentDay];

  if (!todayHours) {
    return null; // Closed today
  }

  const currentMinutes = ukTime.getHours() * 60 + ukTime.getMinutes();
  const [closeHour, closeMinute] = todayHours.close.split(':').map(Number);
  let closeMinutes = closeHour * 60 + closeMinute;

  // Handle midnight closures
  if (closeHour === 0 || (closeHour === 0 && closeMinute > 0)) {
    closeMinutes += 24 * 60;
  }

  if (currentMinutes >= closeMinutes) {
    return null; // Already closed
  }

  return (closeMinutes - currentMinutes) / 60;
}

// Get next opening time for closed location
function getNextOpeningTime(hours: DatabaseOpeningHours, ukTime: Date): { day: string; time: string; hoursUntilOpen?: number; closedToday?: boolean } | null {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  let checkDay = ukTime.getDay();
  const currentMinutes = ukTime.getHours() * 60 + ukTime.getMinutes();
  
  // Check if there are ANY hours for today
  const todayDayName = dayNames[ukTime.getDay()] as keyof DatabaseOpeningHours;
  const hasTodayHours = !!hours[todayDayName];

  // Check next 7 days
  for (let i = 0; i < 7; i++) {
    const dayName = dayNames[checkDay] as keyof DatabaseOpeningHours;
    const dayHours = hours[dayName];

    if (dayHours) {
      // If it's today, check if we're before opening time
      if (i === 0) {
        const [openHour, openMinute] = dayHours.open.split(':').map(Number);
        const openMinutes = openHour * 60 + openMinute;

        if (currentMinutes < openMinutes) {
          // Opens later today
          const hoursUntilOpen = (openMinutes - currentMinutes) / 60;
          return { 
            day: 'today', 
            time: formatTime(dayHours.open),
            hoursUntilOpen,
            closedToday: false
          };
        }
      } else {
        // Future day
        const dayLabel = i === 1 ? 'tomorrow' : dayNames[checkDay];
        return { 
          day: dayLabel, 
          time: formatTime(dayHours.open),
          closedToday: !hasTodayHours // Only "closed today" if location has no hours for today at all
        };
      }
    }

    checkDay = (checkDay + 1) % 7;
  }

  return null;
}

// Format time from 24h to 12h with AM/PM
function formatTime(time24: string): string {
  const [hour, minute] = time24.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minute.toString().padStart(2, '0')}${period}`;
}

// Main function to check location hours and generate warnings
export async function checkLocationHours(riddleId: string): Promise<TimeWarning | null> {
  try {
    // Get opening hours and location name from database
    const supabase = await createClient();
    const { data: riddleData, error } = await supabase
      .from('riddles')
      .select('opening_hours, location_id')
      .eq('id', riddleId)
      .single();

    if (error || !riddleData) {
      return null; // No riddle data available
    }

    const hours = riddleData.opening_hours as DatabaseOpeningHours;
    // Don't use location name in warnings - use generic "this location" to avoid spoiling the riddle
    const actualLocationName = 'this location';

    // Check for bank holiday
    const isBankHoliday = isTodayBankHoliday();

    if (!hours) {
      return null; // No hours data available
    }

    const ukTime = getUKTime();
    const open = isLocationOpen(hours, ukTime);

    if (open) {
      const hoursLeft = hoursUntilClose(hours, ukTime);
      
      if (hoursLeft !== null && hoursLeft <= 1) {
        // Closing soon
        const minutes = Math.round(hoursLeft * 60);
        return {
          type: 'closing_soon',
          message: `⏰ This location closes in ${minutes} minutes`,
          severity: 'high',
          location: actualLocationName,
          hoursUntilClose: hoursLeft,
          isBankHoliday
        };
      } else if (hoursLeft !== null && hoursLeft <= 2) {
        // Closing in 2 hours
        return {
          type: 'closing_soon',
          message: `⏰ This location closes in ${Math.round(hoursLeft)} hours`,
          severity: 'medium',
          location: actualLocationName,
          hoursUntilClose: hoursLeft,
          isBankHoliday
        };
      }

      // Open and not closing soon
      return {
        type: 'open',
        message: `✅ This location is currently open`,
        severity: 'low',
        location: actualLocationName,
        isBankHoliday
      };
    } else {
      // Location is closed
      const nextOpening = getNextOpeningTime(hours, ukTime);
      
      if (nextOpening) {
        return {
          type: 'closed',
          message: nextOpening.closedToday 
            ? `❌ This location is currently closed. Opens ${nextOpening.day} at ${nextOpening.time}`
            : `❌ This location is currently closed. Opens ${nextOpening.day} at ${nextOpening.time}`,
          severity: 'high',
          location: actualLocationName,
          opensAt: nextOpening.time,
          hoursUntilOpen: nextOpening.hoursUntilOpen,
          closedToday: nextOpening.closedToday,
          isBankHoliday
        };
      } else {
        return {
          type: 'closed',
          message: `❌ This location is currently closed`,
          severity: 'high',
          location: actualLocationName,
          closedToday: true,
          isBankHoliday
        };
      }
    }
  } catch (error) {
    console.error('Error checking location hours:', error);
    return null;
  }
}

// Check multiple riddles and return overall warning status for payment page
export async function checkMultipleLocationHours(trackId: string): Promise<{
  shouldWarn: boolean;
  closedCount: number;
  closingSoonCount: number;
  openingSoonCount: number;
  isBankHoliday: boolean;
  message: string;
  severity: 'high' | 'medium' | 'low';
  closingSoonDetails: Array<{ riddleNumber: string; closingTime: string; hoursLeft?: number }>;
  closedDetails: Array<{ riddleNumber: string; hoursUntilOpen?: number; opensAt?: string; closedToday?: boolean }>;
  openingSoonDetails: Array<{ riddleNumber: string; opensAt: string; hoursUntilOpen?: number }>;
}> {
  try {
    // Check if it's a bank holiday first
    const bankHoliday = isTodayBankHoliday();
    
    const supabase = await createClient();
    
    // Get all riddles for this track with opening hours
    const { data: riddles, error } = await supabase
      .from('riddles')
      .select('id, location_id, opening_hours, order_index')
      .eq('track_id', trackId)
      .order('order_index');

    if (error || !riddles) {
      return {
        shouldWarn: bankHoliday,
        closedCount: 0,
        closingSoonCount: 0,
        openingSoonCount: 0,
        isBankHoliday: bankHoliday,
        message: bankHoliday ? '🏦 It\'s a UK bank holiday - opening times may vary' : '',
        severity: bankHoliday ? 'medium' : 'low',
        closingSoonDetails: [],
        closedDetails: [],
        openingSoonDetails: []
      };
    }

    const warnings = [];
    const closingSoonDetails = [];
    const closedDetails = [];
    const openingSoonDetails = [];

    // Check each riddle location
    for (const riddle of riddles) {
      if (!riddle.opening_hours) continue;
      
      const warning = await checkLocationHours(riddle.id);
      if (warning && (warning.type === 'closed' || warning.type === 'closing_soon')) {
        warnings.push({
          ...warning,
          riddleNumber: `${riddle.order_index || 'Unknown'}`
        });

        if (warning.type === 'closing_soon') {
          closingSoonDetails.push({
            riddleNumber: `${riddle.order_index || 'Unknown'}`,
            closingTime: warning.closingTime || 'Unknown',
            hoursLeft: warning.hoursUntilClose
          });
        } else if (warning.type === 'closed') {
          // Check if opening within 2 hours
          if (warning.hoursUntilOpen !== undefined && warning.hoursUntilOpen <= 2) {
            openingSoonDetails.push({
              riddleNumber: `${riddle.order_index || 'Unknown'}`,
              opensAt: warning.opensAt || 'Unknown',
              hoursUntilOpen: warning.hoursUntilOpen
            });
          }
          
          closedDetails.push({
            riddleNumber: `${riddle.order_index || 'Unknown'}`,
            opensAt: warning.opensAt,
            hoursUntilOpen: warning.hoursUntilOpen,
            closedToday: warning.closedToday
          });
        }
      }
    }

    const closedCount = warnings.filter(w => w.type === 'closed').length;
    const closingSoonCount = warnings.filter(w => w.type === 'closing_soon').length;
    const openingSoonCount = openingSoonDetails.length;
    
    // Return warning if there are issues OR if it's a bank holiday
    if (closedCount > 0 || closingSoonCount > 0 || openingSoonCount > 0 || bankHoliday) {
      let message = '';
      let severity: 'high' | 'medium' | 'low' = 'low';
      
      if (bankHoliday && (closedCount > 0 || closingSoonCount > 0)) {
        message = `🏦 Bank holiday + ${closedCount + closingSoonCount} location${closedCount + closingSoonCount > 1 ? 's' : ''} may be affected`;
        severity = 'high';
      } else if (closedCount > 0 && closingSoonCount > 0) {
        message = `${closedCount} location${closedCount > 1 ? 's' : ''} currently closed and ${closingSoonCount} closing soon`;
        severity = 'high';
      } else if (closedCount > 0) {
        message = `${closedCount} location${closedCount > 1 ? 's are' : ' is'} currently closed`;
        severity = 'high';
      } else if (closingSoonCount > 0) {
        message = `${closingSoonCount} location${closingSoonCount > 1 ? 's are' : ' is'} closing soon`;
        severity = 'medium';
      } else if (openingSoonCount > 0) {
        message = `${openingSoonCount} location${openingSoonCount > 1 ? 's' : ''} opening soon`;
        severity = 'medium';
      } else if (bankHoliday) {
        message = '🏦 It\'s a UK bank holiday - opening times may vary';
        severity = 'medium';
      }

      return {
        shouldWarn: true,
        closedCount,
        closingSoonCount,
        openingSoonCount,
        isBankHoliday: bankHoliday,
        message,
        severity,
        closingSoonDetails,
        closedDetails,
        openingSoonDetails
      };
    }

    return {
      shouldWarn: false,
      closedCount: 0,
      closingSoonCount: 0,
      openingSoonCount: 0,
      isBankHoliday: false,
      message: '',
      severity: 'low',
      closingSoonDetails: [],
      closedDetails: [],
      openingSoonDetails: []
    };

  } catch (error) {
    console.error('Error checking multiple location hours:', error);
    return {
      shouldWarn: false,
      closedCount: 0,
      closingSoonCount: 0,
      openingSoonCount: 0,
      isBankHoliday: false,
      message: '',
      severity: 'low',
      closingSoonDetails: [],
      closedDetails: [],
      openingSoonDetails: []
    };
  }
}