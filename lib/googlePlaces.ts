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
  // Handle different Google URL formats:
  // - https://maps.google.com/maps?cid=XXXXX
  // - https://goo.gl/maps/XXXXX
  // - https://maps.app.goo.gl/XXXXX (like your example)
  // - https://www.google.com/maps/place/Name/@lat,lng,zoom/data=XXXXX
  // - https://share.google/XXXXX (shortened sharing links)
  
  const patterns = [
    /cid=(\d+)/,
    /place_id=([a-zA-Z0-9_-]+)/,
    /maps\/place\/[^\/]+\/[^\/]*data=.*!1s([a-zA-Z0-9_-]+)/,
    /maps\.app\.goo\.gl\/([a-zA-Z0-9_-]+)/, // For maps.app.goo.gl URLs like yours
    /goo\.gl\/maps\/([a-zA-Z0-9_-]+)/,
    /share\.google\/([a-zA-Z0-9_-]+)/ // For share.google URLs
  ];
  
  for (const pattern of patterns) {
    const match = googleUrl.match(pattern);
    if (match) return match[1];
  }
  
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
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
}

// Fetch opening hours from Google Places API (client-side call to our API)
export async function fetchLocationHours(googlePlaceUrl: string): Promise<OpeningHours | null> {
  try {
    const placeId = extractPlaceIdFromUrl(googlePlaceUrl);
    if (!placeId) return null;

    const response = await fetch('/api/google-places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId })
    });

    if (!response.ok) throw new Error('Failed to fetch hours');
    
    const data = await response.json();
    return data.opening_hours;
  } catch (error) {
    console.error('Error fetching location hours:', error);
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
