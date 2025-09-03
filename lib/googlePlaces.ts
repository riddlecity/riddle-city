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

// Direct Google Places API function (no HTTP calls for server-side use)
async function fetchGooglePlacesData(googlePlaceUrl: string, locationName: string): Promise<any> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('🔍 Google Places API key not configured');
    return null;
  }

  try {
    console.log('🔍 Processing Google Place URL:', googlePlaceUrl);
    
    // For maps.app.goo.gl URLs, resolve and search for business
    if (googlePlaceUrl.includes('maps.app.goo.gl')) {
      let searchQuery = locationName || '';
      
      // Extract business name from resolved URL
      console.log('🔍 Resolving shortened URL...');
      const resolveResponse = await fetch(googlePlaceUrl, {
        method: 'HEAD',
        redirect: 'follow'
      });
      
      const resolvedUrl = resolveResponse.url;
      console.log('🔍 Resolved URL:', resolvedUrl);
      
      // Extract business name from URL path
      const nameMatch = resolvedUrl.match(/\/place\/([^\/]+)\//);
      if (nameMatch) {
        searchQuery = decodeURIComponent(nameMatch[1]).replace(/\+/g, ' ');
        console.log('🔍 Extracted business name:', searchQuery);
      } else {
        console.log('🔍 Using provided location name:', searchQuery);
      }
      
      // Find Place using extracted name
      const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchQuery)}&inputtype=textquery&fields=place_id&key=${apiKey}`;
      console.log('🔍 Finding place with query:', searchQuery);
      
      const findResponse = await fetch(findPlaceUrl);
      if (!findResponse.ok) {
        throw new Error(`Find Place API error: ${findResponse.status}`);
      }
      
      const findData = await findResponse.json();
      console.log('🔍 Find Place API response status:', findData.status);
      
      if (findData.status !== 'OK') {
        console.error('🔍 Find Place API error:', findData.status);
        return null;
      }
      
      if (findData.candidates && findData.candidates.length > 0) {
        const placeId = findData.candidates[0].place_id;
        console.log('🔍 Found place ID:', placeId);
        
        // Get place details including complete opening hours
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=opening_hours,current_opening_hours&key=${apiKey}`;
        const detailsResponse = await fetch(detailsUrl);
        
        if (!detailsResponse.ok) {
          throw new Error(`Place Details API error: ${detailsResponse.status}`);
        }
        
        const detailsData = await detailsResponse.json();
        console.log('🔍 Place Details API response status:', detailsData.status);
        
        if (detailsData.status !== 'OK') {
          console.error('🔍 Place Details API error:', detailsData.status);
          return null;
        }
        
        if (detailsData.result && detailsData.result.opening_hours) {
          console.log('🔍 Successfully fetched opening hours from Google Places API');
          // Return the structured opening hours data
          return detailsData.result.opening_hours;
        } else {
          console.log('🔍 No opening hours data in Google Places API response');
        }
      } else {
        console.log('🔍 No place candidates found for:', searchQuery);
      }
    }
    
    return null;
  } catch (error) {
    console.error('🔍 Error fetching Google Places data for', locationName, ':', error);
    return null;
  }
}

// Fetch opening hours from Google Places API (server-side direct call)
export async function fetchLocationHours(googlePlaceUrl: string, locationName?: string): Promise<OpeningHours | null> {
  try {
    console.log('🔍 Fetching hours for URL:', googlePlaceUrl, 'Location:', locationName);
    
    if (!googlePlaceUrl) {
      console.log('🔍 No Google Place URL provided');
      return null;
    }
    
    // Use direct Google Places API call (no HTTP requests to our own API)
    const apiData = await fetchGooglePlacesData(googlePlaceUrl, locationName || 'Unknown');
    
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
