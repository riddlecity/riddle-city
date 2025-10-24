// Simple UK bank holiday detection
// lib/bankHolidays.ts

// Fixed UK bank holidays (these don't change year to year)
const fixedHolidays = [
  { month: 1, day: 1, name: "New Year's Day" },
  { month: 12, day: 25, name: "Christmas Day" },
  { month: 12, day: 26, name: "Boxing Day" }
];

// Function to get Easter Sunday for a given year (simplified algorithm)
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}

// Function to get UK bank holidays for a given year
export function getUKBankHolidays(year: number): Date[] {
  const holidays: Date[] = [];
  
  // Add fixed holidays
  fixedHolidays.forEach(holiday => {
    let holidayDate = new Date(year, holiday.month - 1, holiday.day);
    
    // If Christmas/Boxing Day falls on weekend, add substitute days
    if (holiday.month === 12) {
      const dayOfWeek = holidayDate.getDay();
      if (dayOfWeek === 0) { // Sunday
        holidayDate = new Date(year, holiday.month - 1, holiday.day + 1); // Monday
      } else if (dayOfWeek === 6) { // Saturday
        holidayDate = new Date(year, holiday.month - 1, holiday.day + 2); // Monday
      }
    }
    
    holidays.push(holidayDate);
  });
  
  // Add Easter-based holidays
  const easter = getEasterSunday(year);
  holidays.push(new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000)); // Good Friday
  holidays.push(new Date(easter.getTime() + 1 * 24 * 60 * 60 * 1000)); // Easter Monday
  
  // Add May bank holidays (first and last Monday)
  const firstMayMonday = getFirstMondayOfMonth(year, 5);
  const lastMayMonday = getLastMondayOfMonth(year, 5);
  holidays.push(firstMayMonday);
  holidays.push(lastMayMonday);
  
  // Add August bank holiday (last Monday)
  const augustBankHoliday = getLastMondayOfMonth(year, 8);
  holidays.push(augustBankHoliday);
  
  return holidays;
}

// Helper function to get first Monday of a month
function getFirstMondayOfMonth(year: number, month: number): Date {
  const firstDay = new Date(year, month - 1, 1);
  const dayOfWeek = firstDay.getDay();
  const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  return new Date(year, month - 1, 1 + daysToMonday);
}

// Helper function to get last Monday of a month
function getLastMondayOfMonth(year: number, month: number): Date {
  const lastDay = new Date(year, month, 0);
  const dayOfWeek = lastDay.getDay();
  const daysToLastMonday = dayOfWeek === 1 ? 0 : (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
  return new Date(year, month - 1, lastDay.getDate() - daysToLastMonday);
}

// Function to check if a date is a UK bank holiday
export function isBankHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const bankHolidays = getUKBankHolidays(year);
  
  return bankHolidays.some(holiday => {
    return holiday.toDateString() === date.toDateString();
  });
}

// Function to get UK time
export function getUKTime(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
}

// Main function to check if today is a bank holiday
export function isTodayBankHoliday(): boolean {
  const ukTime = getUKTime();
  return isBankHoliday(ukTime);
}