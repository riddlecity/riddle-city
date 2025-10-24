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

// Get opening hours for a specific riddle from database
async function getRiddleOpeningHours(riddleId: string): Promise<DatabaseOpeningHours | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('riddles')
      .select('static_opening_hours, location_name')
      .eq('id', riddleId)
      .single();

    if (error || !data) {
      console.log(`⚠️ No opening hours found for riddle ${riddleId}`);
      return null;
    }

    return data.static_opening_hours as DatabaseOpeningHours;
  } catch (error) {
    console.error('Error fetching opening hours:', error);
    return null;
  }
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
function getNextOpeningTime(hours: DatabaseOpeningHours, ukTime: Date): { day: string; time: string } | null {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  let checkDay = ukTime.getDay();

  // Check next 7 days
  for (let i = 0; i < 7; i++) {
    const dayName = dayNames[checkDay] as keyof DatabaseOpeningHours;
    const dayHours = hours[dayName];

    if (dayHours) {
      // If it's today, check if we're before opening time
      if (i === 0) {
        const currentMinutes = ukTime.getHours() * 60 + ukTime.getMinutes();
        const [openHour, openMinute] = dayHours.open.split(':').map(Number);
        const openMinutes = openHour * 60 + openMinute;

        if (currentMinutes < openMinutes) {
          return { day: 'today', time: dayHours.open };
        }
      } else {
        // Future day
        const dayName = i === 1 ? 'tomorrow' : dayNames[checkDay];
        return { day: dayName, time: dayHours.open };
      }
    }

    checkDay = (checkDay + 1) % 7;
  }

  return null;
}

// Main function to check location hours and generate warnings
export async function checkLocationHours(riddleId: string, locationName?: string): Promise<TimeWarning | null> {
  try {
    // Check for bank holiday first
    if (isTodayBankHoliday()) {
      return {
        type: 'bank_holiday',
        message: `🏦 Bank holiday hours may vary for ${locationName || 'this location'}`,
        severity: 'medium',
        location: locationName || 'Unknown'
      };
    }

    const hours = await getRiddleOpeningHours(riddleId);
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
          message: `⏰ ${locationName || 'This location'} closes in ${minutes} minutes`,
          severity: 'high',
          location: locationName || 'Unknown',
          hoursUntilClose: hoursLeft
        };
      } else if (hoursLeft !== null && hoursLeft <= 2) {
        // Closing in 2 hours
        return {
          type: 'closing_soon',
          message: `⏰ ${locationName || 'This location'} closes in ${Math.round(hoursLeft)} hours`,
          severity: 'medium',
          location: locationName || 'Unknown',
          hoursUntilClose: hoursLeft
        };
      }

      // Open and not closing soon
      return {
        type: 'open',
        message: `✅ ${locationName || 'This location'} is currently open`,
        severity: 'low',
        location: locationName || 'Unknown'
      };
    } else {
      // Location is closed
      const nextOpening = getNextOpeningTime(hours, ukTime);
      
      if (nextOpening) {
        return {
          type: 'closed',
          message: `❌ ${locationName || 'This location'} is currently closed. Opens ${nextOpening.day} at ${nextOpening.time}`,
          severity: 'high',
          location: locationName || 'Unknown',
          opensAt: nextOpening.time
        };
      } else {
        return {
          type: 'closed',
          message: `❌ ${locationName || 'This location'} is currently closed`,
          severity: 'high',
          location: locationName || 'Unknown'
        };
      }
    }
  } catch (error) {
    console.error('Error checking location hours:', error);
    return null;
  }
}