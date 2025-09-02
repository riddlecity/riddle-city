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
    const { placeId, googleUrl, locationName } = await request.json();
    
    if (!placeId && !googleUrl && !locationName) {
      return NextResponse.json({ error: 'Place ID, Google URL, or location name is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 500 });
    }

    let finalPlaceId = placeId;
    
    // For maps.app.goo.gl URLs or location names, use Find Place to search for the business
    if ((googleUrl && googleUrl.includes('maps.app.goo.gl')) || locationName) {
      try {
        let searchQuery = locationName || '';
        
        if (googleUrl) {
          // Extract business name from resolved URL
          const resolveResponse = await fetch(googleUrl, {
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
          }
        }
        
        if (searchQuery) {
          // Use Find Place API to search for the business
          const findResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchQuery + ' Barnsley UK')}&inputtype=textquery&fields=place_id&key=${apiKey}`,
            { method: 'GET' }
          );
          
          if (findResponse.ok) {
            const findData = await findResponse.json();
            console.log('🔍 Find Place API response:', findData);
            
            if (findData.status === 'OK' && findData.candidates && findData.candidates[0]) {
              finalPlaceId = findData.candidates[0].place_id;
              console.log('🔍 Found place ID via search:', finalPlaceId);
            }
          }
        }
      } catch (resolveError) {
        console.error('🔍 Failed to resolve/search place:', resolveError);
      }
    }
    
    if (!finalPlaceId) {
      console.log('🔍 No place ID found, returning null hours');
      return NextResponse.json({ opening_hours: null });
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${finalPlaceId}&fields=opening_hours&key=${apiKey}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data: GooglePlacesResponse = await response.json();
    
    console.log('🔍 Google Places API response:', { status: data.status, hasHours: !!data.result?.opening_hours });
    
    if (data.status !== 'OK') {
      console.error('🔍 Google Places API error:', data.status);
      return NextResponse.json({ opening_hours: null });
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
