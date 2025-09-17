import { createClient } from './supabase/client';

const supabase = createClient();

export interface OpeningHours {
  monday?: { open: string; close: string } | null;
  tuesday?: { open: string; close: string } | null;
  wednesday?: { open: string; close: string } | null;
  thursday?: { open: string; close: string } | null;
  friday?: { open: string; close: string } | null;
  saturday?: { open: string; close: string } | null;
  sunday?: { open: string; close: string } | null;
}

export interface RiddleLocation {
  id: string;
  name: string;
  google_place_url?: string;
}

// Extract Place ID from Google URL
export function extractPlaceIdFromUrl(googleUrl: string): string | null {
  // For maps.app.goo.gl URLs, the ID after the last slash is the place ID
  // Example: https://maps.app.goo.gl/NvpzkEAzq6JCD5o49 -> NvpzkEAzq6JCD5o49
  
  const patterns = [
    /maps\.app\.goo\.gl\/([a-zA-Z0-9_-]+)/, // For maps.app.goo.gl URLs like yours
    /cid=(\d+)/,
    /place_id=([a-zA-Z0-9_-]+)/,
    /maps\/place\/[^\/]+\/[^\/]*data=.*!1s([a-zA-Z0-9_-]+)/,
    /goo\.gl\/maps\/([a-zA-Z0-9_-]+)/,
    /share\.google\/([a-zA-Z0-9_-]+)/ // For share.google URLs
  ];
  
  for (const pattern of patterns) {
    const match = googleUrl.match(pattern);
    if (match) {
      console.log('🔍 Extracted place ID:', match[1], 'from URL:', googleUrl);
      return match[1];
    }
  }
  
  console.log('🔍 No place ID found in URL:', googleUrl);
  return null;
}

// Helper function to resolve shortened Google URLs
export async function resolveGoogleUrl(shortUrl: string): Promise<string | null> {
  try {
    // For share.google URLs, we need to follow the redirect to get the full URL
    const response = await fetch(shortUrl, { 
      method: 'HEAD',
      redirect: 'follow'
    });
    
    return response.url; // This will be the resolved full URL
  } catch (error) {
    console.error('Error resolving Google URL:', error);
    return null;
  }
}

// Get current UK time
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

// Web scraping function to extract opening hours from Google Maps pages (free alternative to API)
async function scrapeGoogleMapsHours(googlePlaceUrl: string, locationName: string): Promise<any> {
  try {
    console.log('🔍 Scraping Google Maps URL:', googlePlaceUrl);
    
    // For maps.app.goo.gl URLs, follow redirect to get full Google Maps page
    if (googlePlaceUrl.includes('maps.app.goo.gl')) {
      console.log('🔍 Following redirect to full Google Maps URL...');
      
      // Follow the redirect to get the full Google Maps URL
      const resolveResponse = await fetch(googlePlaceUrl, {
        method: 'HEAD',
        redirect: 'follow'
      });
      
      const fullUrl = resolveResponse.url;
      console.log('🔍 Resolved to full URL:', fullUrl);
      
      // Fetch the Google Maps page HTML
      const pageResponse = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!pageResponse.ok) {
        throw new Error(`Failed to fetch page: ${pageResponse.status}`);
      }
      
      const html = await pageResponse.text();
      console.log('🔍 Successfully fetched Google Maps page HTML');
      
      // Extract opening hours from the HTML
      return parseGoogleMapsHTML(html, locationName);
    }
    
    return null;
  } catch (error) {
    console.error('🔍 Error scraping Google Maps for', locationName, ':', error);
    return null;
  }
}

// Helper function to convert 12-hour AM/PM time to 24-hour format
function convertAMPMToHours(timeStr: string): number | null {
  if (!timeStr) return null;
  
  // Clean up the time string
  const cleanTime = timeStr.trim().toLowerCase();
  
  // Handle midnight special case
  if (cleanTime.includes('12') && cleanTime.includes('am')) {
    const match = cleanTime.match(/12(?::(\d{2}))?/);
    if (match) {
      const minutes = match[1] ? parseInt(match[1]) : 0;
      return 0 + (minutes / 60); // 12 AM = 0 hours
    }
  }
  
  // Handle noon special case  
  if (cleanTime.includes('12') && cleanTime.includes('pm')) {
    const match = cleanTime.match(/12(?::(\d{2}))?/);
    if (match) {
      const minutes = match[1] ? parseInt(match[1]) : 0;
      return 12 + (minutes / 60); // 12 PM = 12 hours
    }
  }
  
  // Regular AM/PM parsing
  const match = cleanTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (match) {
    let hour = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const period = match[3];
    
    if (period === 'pm' && hour !== 12) {
      hour += 12;
    } else if (period === 'am' && hour === 12) {
      hour = 0;
    }
    
    return hour + (minutes / 60);
  }
  
  // Handle times without explicit AM/PM (assume context from other time)
  const numericMatch = cleanTime.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (numericMatch) {
    const hour = parseInt(numericMatch[1]);
    const minutes = numericMatch[2] ? parseInt(numericMatch[2]) : 0;
    
    // If it's 12, assume it's noon (12 PM) since most businesses are open during day
    if (hour === 12) {
      return 12 + (minutes / 60);
    }
    // If it's a small number (1-11), return as-is for context inference
    else if (hour >= 1 && hour <= 11) {
      return hour + (minutes / 60);
    }
  }
  
  return null;
}

// Parse opening hours from Google Maps HTML
function parseGoogleMapsHTML(html: string, locationName: string): any {
  try {
    console.log('🔍 Parsing Google Maps HTML for:', locationName);
    
    // Method 1: Look for nested array format (like Spiral City and Library uses)
    // Pattern: [["Day",dayNumber,[date],[["time–time",[[hour],[hour,minute]]]],status,type]
    // Also handle: [["Day",dayNumber,[date],[["Closed"]],status,type]
    const nestedArrayRegex = /\[\\?"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\?",\d+,\[[^\]]+\],\[\[\\?"([^"]*?)\\?"/g;
    let nestedMatch;
    const nestedMatches = [];
    
    // Also look for specific patterns in the HTML like "Saturday\",6,[2025,9,20],[[\"9:30 am–4 pm\",[[9,30],[16]]]]
    // This is more precise and captures the library's own data structure
    const specificPatternRegex = /"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\?",\d+,\[[\d,]+\],\[\[\\?"([^"]*?)\\?"/g;
    let specificMatch;
    
    // First try specific pattern (more accurate for cases like Library)
    while ((specificMatch = specificPatternRegex.exec(html)) !== null) {
      const day = specificMatch[1];
      const timeData = specificMatch[2];
      
      console.log(`   📅 Specific pattern found - ${day}: ${timeData}`);
      
      if (timeData === 'Closed' || timeData.toLowerCase().includes('closed')) {
        nestedMatches.push({ day, hours: 'Closed' });
      } else {
        nestedMatches.push({ day, hours: timeData });
      }
    }
    
    // If no specific matches, fall back to general nested array regex
    if (nestedMatches.length === 0) {
      while ((nestedMatch = nestedArrayRegex.exec(html)) !== null) {
        const day = nestedMatch[1];
        const timeRange = nestedMatch[2];
        
        console.log(`   📅 Nested format found - ${day}: ${timeRange}`);
        
        if (timeRange === 'Closed' || timeRange.toLowerCase().includes('closed')) {
          nestedMatches.push({ day, hours: 'Closed' });
        } else {
          nestedMatches.push({ day, hours: timeRange });
        }
      }
    }
    
    if (nestedMatches.length > 0) {
      console.log(`🔍 Found ${nestedMatches.length} nested array format matches`);
      
      const extractedHours: any = {};
      const seenDays = new Set<string>();
      
      nestedMatches.forEach((match) => {
        const dayKey = match.day.toLowerCase();
        
        // Only use the first occurrence of each day
        if (!seenDays.has(dayKey)) {
          seenDays.add(dayKey);
          
          if (match.hours === 'Closed') {
            extractedHours[dayKey] = { closed: true };
          } else {
            // Parse time range like "12–10:30 pm" or "11 am–11:30 pm"
            const timeMatch = match.hours.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[–-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
            if (timeMatch) {
              let openTime = timeMatch[1].trim();
              let closeTime = timeMatch[2].trim();
              
              // Handle cases where only the closing time has AM/PM
              // If opening time has no AM/PM but closing time does, infer the opening time's period
              if (!/am|pm/i.test(openTime) && /pm/i.test(closeTime)) {
                // If close time is PM and open time is a single digit or 12, it's likely PM too
                const openHour = parseInt(openTime);
                if (openHour === 12 || (openHour >= 1 && openHour <= 11)) {
                  openTime += ' pm';
                }
              }
              
              const openHour = convertAMPMToHours(openTime);
              const closeHour = convertAMPMToHours(closeTime);
              
              if (openHour !== null && closeHour !== null) {
                extractedHours[dayKey] = {
                  open: String(Math.floor(openHour)).padStart(2, '0') + ':' + String(Math.round((openHour % 1) * 60)).padStart(2, '0'),
                  close: String(Math.floor(closeHour)).padStart(2, '0') + ':' + String(Math.round((closeHour % 1) * 60)).padStart(2, '0')
                };
              }
            }
          }
        }
      });
      
      if (Object.keys(extractedHours).length >= 3) {
        console.log('✅ Extracted hours from nested array format for:', locationName);
        return {
          open_now: false,
          parsed_hours: extractedHours,
          weekday_text: generateWeekdayText(extractedHours)
        };
      }
    }
    
    // Method 2: Look for AM/PM format opening hours (most complete data)
    // Pattern: ["Day",["time–time"]] - this captures the escaped JSON format in Google Maps
    const ampmRegex = /\[\\?"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\?"\s*,\s*\[\\?"(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[–-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\\?"/gi;
    const ampmMatches = [...html.matchAll(ampmRegex)];
    
    if (ampmMatches.length > 0) {
      console.log(`🔍 Found ${ampmMatches.length} AM/PM format matches`);
      
      const extractedHours: any = {};
      const seenDays = new Set<string>();
      
      ampmMatches.forEach((match) => {
        const [, day, openTime, closeTime] = match;
        console.log(`   📅 ${day}: ${openTime} - ${closeTime}`);
        
        const dayKey = day.toLowerCase();
        
        // Only use the first occurrence of each day
        if (!seenDays.has(dayKey)) {
          seenDays.add(dayKey);
          
          const openHour = convertAMPMToHours(openTime);
          const closeHour = convertAMPMToHours(closeTime);
          
          if (openHour !== null && closeHour !== null) {
            extractedHours[dayKey] = {
              open: String(openHour).padStart(2, '0') + ':00',
              close: String(closeHour).padStart(2, '0') + ':00'
            };
          }
        }
      });
      
      if (Object.keys(extractedHours).length >= 3) {
        console.log('✅ Extracted hours from AM/PM format for:', locationName);
        return {
          open_now: false,
          parsed_hours: extractedHours,
          weekday_text: generateWeekdayText(extractedHours)
        };
      }
    }
    
    // Method 3: Fallback to 24-hour numeric format
    // This is where Google embeds structured opening hours data in escaped JSON
    const hoursRegex = /\[\\\"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\\",\d+,\[[^\]]+\],\[\[\\\"[^\\\"]*\\\",\[\[(\d+)\],\[(\d+)\]\]\]\]/gi;
    const matches = [...html.matchAll(hoursRegex)];
    
    if (matches.length > 0) {
      console.log(`🔍 Found ${matches.length} numeric format matches (fallback)`);
      const extractedHours: any = {};
      
      // Track which days we've seen to avoid duplicates
      const seenDays = new Set<string>();
      
      matches.forEach(match => {
        const [, day, openHour, closeHour] = match;
        if (day && openHour && closeHour) {
          const dayKey = day.toLowerCase();
          
          // Only use the first occurrence of each day to avoid mixing data from different venues
          if (!seenDays.has(dayKey)) {
            seenDays.add(dayKey);
            extractedHours[dayKey] = {
              open: String(openHour).padStart(2, '0') + ':00',
              close: String(closeHour).padStart(2, '0') + ':00'
            };
            console.log(`   📅 ${dayKey}: ${openHour}:00 - ${closeHour}:00`);
          }
        }
      });
      
      // Only return if we have a reasonable number of days (at least 3)
      if (Object.keys(extractedHours).length >= 3) {
        console.log('✅ Extracted hours from numeric format for:', locationName);
        return {
          open_now: false, // We'll calculate this separately
          parsed_hours: extractedHours,
          weekday_text: generateWeekdayText(extractedHours)
        };
      }
    }
    
    // Method 3: Look for structured JSON-LD data (additional fallback)
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/g);
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
          const data = JSON.parse(jsonContent);
          
          if (data.openingHours || (data['@type'] && data['@type'].includes('LocalBusiness'))) {
            const hours = extractOpeningHoursFromJsonLd(data);
            if (hours) {
              console.log('✅ Extracted hours from JSON-LD for:', locationName);
              return hours;
            }
          }
        } catch (e) {
          // Continue to next JSON-LD block
          continue;
        }
      }
    }
    
    // Method 3: Look for Google Maps specific data structures
    // Google Maps often embeds data in JavaScript variables
    const dataMatches = html.match(/window\.APP_INITIALIZATION_STATE\s*=\s*(\[.*?\]);/);
    if (dataMatches) {
      try {
        console.log('🔍 Found APP_INITIALIZATION_STATE data');
        // This contains complex nested data that might have opening hours
        // For now, we'll look for simpler patterns
      } catch (e) {
        console.log('⚠️ Could not parse APP_INITIALIZATION_STATE');
      }
    }
    
    // Method 4: Look for opening hours in aria-label attributes (common in modern Google Maps)
    const ariaLabelMatches = html.match(/aria-label="[^"]*(?:hours|open|close|monday|tuesday|wednesday|thursday|friday|saturday|sunday)[^"]*"/gi);
    if (ariaLabelMatches) {
      console.log('🔍 Found aria-label matches with time-related content:', ariaLabelMatches.length);
      for (const match of ariaLabelMatches) {
        const content = match.match(/aria-label="([^"]+)"/i);
        if (content && content[1]) {
          console.log('   📋 Aria content:', content[1]);
          const hours = parseAriaLabelHours(content[1]);
          if (hours) {
            console.log('✅ Extracted hours from aria-label for:', locationName);
            return hours;
          }
        }
      }
    }
    
    // Method 5: Look for common opening hours text patterns in the HTML
    const commonPatterns = [
      // Enhanced patterns for various formats
      /(?:Monday|Mon)[\s:]*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)[\s\-–—to]*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/gi,
      /(?:Tuesday|Tue)[\s:]*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)[\s\-–—to]*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/gi,
      /(?:Wednesday|Wed)[\s:]*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)[\s\-–—to]*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/gi,
      /(?:Thursday|Thu)[\s:]*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)[\s\-–—to]*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/gi,
      /(?:Friday|Fri)[\s:]*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)[\s\-–—to]*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/gi,
      /(?:Saturday|Sat)[\s:]*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)[\s\-–—to]*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/gi,
      /(?:Sunday|Sun)[\s:]*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)[\s\-–—to]*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/gi
    ];
    
    const extractedHours: any = {};
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    commonPatterns.forEach((pattern, index) => {
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        console.log(`🔍 Pattern ${index + 1} found ${matches.length} matches`);
        matches.forEach(match => {
          if (match[1] && match[2]) {
            const day = dayNames[index];
            extractedHours[day] = {
              open: convertTo24Hour(match[1].trim()),
              close: convertTo24Hour(match[2].trim())
            };
            console.log(`   📅 ${day}: ${match[1].trim()} - ${match[2].trim()}`);
          }
        });
      }
    });
    
    // Method 6: Look for "Open until" or "Closes at" text
    const openUntilMatch = html.match(/(?:Open until|Closes at|Opens at)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/i);
    if (openUntilMatch) {
      console.log('🔍 Found "Open until" pattern:', openUntilMatch[1]);
    }
    
    if (Object.keys(extractedHours).length > 0) {
      console.log('✅ Extracted hours from HTML patterns for:', locationName);
      return {
        open_now: false, // We'll calculate this separately
        parsed_hours: extractedHours,
        weekday_text: generateWeekdayText(extractedHours)
      };
    }
    
    console.log('⚠️ No opening hours found in HTML for:', locationName);
    return null;
    
  } catch (error) {
    console.error('🔍 Error parsing Google Maps HTML for', locationName, ':', error);
    return null;
  }
}

// Parse opening hours from aria-label content
function parseAriaLabelHours(ariaContent: string): any {
  const hours: any = {};
  
  // Look for patterns like "Monday 9 AM to 10 PM"
  const dayPatterns = [
    { name: 'monday', pattern: /monday\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i },
    { name: 'tuesday', pattern: /tuesday\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i },
    { name: 'wednesday', pattern: /wednesday\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i },
    { name: 'thursday', pattern: /thursday\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i },
    { name: 'friday', pattern: /friday\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i },
    { name: 'saturday', pattern: /saturday\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i },
    { name: 'sunday', pattern: /sunday\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i }
  ];
  
  dayPatterns.forEach(({ name, pattern }) => {
    const match = ariaContent.match(pattern);
    if (match && match[1] && match[2]) {
      hours[name] = {
        open: convertTo24Hour(match[1]),
        close: convertTo24Hour(match[2])
      };
    }
  });
  
  if (Object.keys(hours).length > 0) {
    return {
      open_now: false,
      parsed_hours: hours,
      weekday_text: generateWeekdayText(hours)
    };
  }
  
  return null;
}

// Extract opening hours from JSON-LD structured data
function extractOpeningHoursFromJsonLd(data: any): any {
  if (data.openingHours) {
    const hours = parseOpeningHoursArray(data.openingHours);
    if (hours) {
      return {
        open_now: false, // We'll calculate this separately
        parsed_hours: hours,
        weekday_text: generateWeekdayText(hours)
      };
    }
  }
  return null;
}

// Parse opening hours array like ["Mo-Fr 09:00-17:00", "Sa 10:00-16:00"]
function parseOpeningHoursArray(openingHours: string[]): any {
  const hours: any = {};
  const dayMapping: { [key: string]: string[] } = {
    'mo': ['monday'],
    'tu': ['tuesday'],
    'we': ['wednesday'],
    'th': ['thursday'],
    'fr': ['friday'],
    'sa': ['saturday'],
    'su': ['sunday'],
    'mo-fr': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    'mo-sa': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    'sa-su': ['saturday', 'sunday']
  };
  
  for (const entry of openingHours) {
    // Parse patterns like "Mo-Fr 09:00-17:00" or "Sa 10:00-16:00"
    const match = entry.match(/([A-Za-z-]+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})/);
    if (match) {
      const dayPattern = match[1].toLowerCase();
      const openTime = match[2];
      const closeTime = match[3];
      
      const days = dayMapping[dayPattern] || [dayPattern];
      for (const day of days) {
        if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(day)) {
          hours[day] = { open: openTime, close: closeTime };
        }
      }
    }
  }
  
  return Object.keys(hours).length > 0 ? hours : null;
}

// Convert 12-hour format to 24-hour format
function convertTo24Hour(time: string): string {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    let hour = parseInt(match[1]);
    const minute = match[2];
    const period = match[3].toLowerCase();
    
    if (period === 'pm' && hour !== 12) {
      hour += 12;
    } else if (period === 'am' && hour === 12) {
      hour = 0;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  }
  
  // If already in 24-hour format, return as is
  if (/^\d{1,2}:\d{2}$/.test(time)) {
    return time;
  }
  
  return time;
}

// Generate weekday text array from parsed hours
function generateWeekdayText(hours: any): string[] {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  return days.map((day, index) => {
    const dayHours = hours[day];
    if (dayHours) {
      const openTime = convertTo12Hour(dayHours.open);
      const closeTime = convertTo12Hour(dayHours.close);
      return `${dayNames[index]}: ${openTime} – ${closeTime}`;
    } else {
      return `${dayNames[index]}: Closed`;
    }
  });
}

// Convert 24-hour format to 12-hour format for display
function convertTo12Hour(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

// Fetch opening hours from Google Places API (server-side direct call)
export async function fetchLocationHours(googlePlaceUrl: string, locationName?: string): Promise<OpeningHours | null> {
  try {
    console.log('🔍 Fetching hours for URL:', googlePlaceUrl, 'Location:', locationName);
    
    if (!googlePlaceUrl) {
      console.log('🔍 No Google Place URL provided');
      return null;
    }
    
    // Use web scraping instead of Google Places API (free alternative)
    const apiData = await scrapeGoogleMapsHours(googlePlaceUrl, locationName || 'Unknown');
    
    if (apiData) {
      console.log('🔍 Successfully fetched opening hours for:', locationName);
      return apiData;
    } else {
      console.log('🔍 No opening hours found for:', locationName);
      return null;
    }
  } catch (error) {
    console.error('Error fetching location hours for', locationName, ':', error);
    return null;
  }
}

// Get riddle locations (only need google_place_url)
export async function getRiddleLocations(trackId: string): Promise<RiddleLocation[]> {
  try {
    const { data, error } = await supabase
      .from('riddles') // or whatever your table is called
      .select('id, location_name, google_place_url')
      .eq('track_id', trackId);

    if (error) throw error;
    
    return (data || []).map((item: any) => ({
      id: item.id as string,
      name: item.location_name as string,
      google_place_url: item.google_place_url as string | undefined
    }));
  } catch (error) {
    console.error('Error fetching riddle locations:', error);
    return [];
  }
}
