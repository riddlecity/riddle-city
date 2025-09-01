import { NextRequest, NextResponse } from 'next/server';

interface GooglePlacesResponse {
  result: {
    opening_hours?: {
      periods: Array<{
        open: { day: number; time: string };
        close: { day: number; time: string };
      }>;
    };
  };
  status: string;
}

export async function POST(request: NextRequest) {
  try {
    const { placeId } = await request.json();
    
    if (!placeId) {
      return NextResponse.json({ error: 'Place ID is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=opening_hours&key=${apiKey}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data: GooglePlacesResponse = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Google Places API status: ${data.status}`);
    }

    const hours = data.result?.opening_hours?.periods;
    if (!hours) {
      return NextResponse.json({ opening_hours: null });
    }

    // Convert Google's format to our format
    const openingHours: Record<string, { open: string; close: string } | null> = {};
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    // Initialize all days as closed
    dayNames.forEach(day => {
      openingHours[day] = null;
    });

    // Process periods from Google
    hours.forEach((period) => {
      if (period.open && period.close) {
        const dayName = dayNames[period.open.day];
        openingHours[dayName] = {
          open: `${period.open.time.slice(0, 2)}:${period.open.time.slice(2)}`,
          close: `${period.close.time.slice(0, 2)}:${period.close.time.slice(2)}`
        };
      }
    });

    return NextResponse.json({ opening_hours: openingHours });
  } catch (error) {
    console.error('Error fetching place hours:', error);
    return NextResponse.json({ error: 'Failed to fetch opening hours' }, { status: 500 });
  }
}
