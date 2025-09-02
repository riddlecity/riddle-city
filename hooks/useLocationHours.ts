import { useState, useEffect } from 'react';
import { OpeningHours } from '../lib/googlePlaces';

interface LocationWithHours {
  id: string;
  order: number;
  name: string;
  google_place_url: string;
  opening_hours?: OpeningHours;
}

export function useLocationHours(trackId: string) {
  const [locations, setLocations] = useState<LocationWithHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLocationsWithHours = async () => {
      try {
        setLoading(true);
        console.log('🔍 Loading locations for trackId:', trackId);
        
        // Fetch locations with Google URLs and cached opening hours
        const response = await fetch(`/api/locations/${trackId}`);
        console.log('🔍 Locations API response:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('🔍 Locations API error:', errorText);
          throw new Error(`Failed to fetch locations: ${response.status}`);
        }
        
        const { locations: locationData } = await response.json();
        console.log('🔍 Received location data:', locationData);
        
        // Fetch opening hours using monthly file cache approach
        const locationsWithHours = await Promise.all(
          locationData.map(async (loc: any) => {
            if (loc.google_place_url) {
              console.log('🔍 Fetching monthly cached hours for location:', loc.name);
              // Use the cached hours API endpoint
              const hoursResponse = await fetch('/api/cached-hours', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  google_place_url: loc.google_place_url,
                  location_name: loc.name
                })
              });
              
              if (hoursResponse.ok) {
                const hoursData = await hoursResponse.json();
                return { ...loc, opening_hours: hoursData.opening_hours };
              } else {
                console.error('🔍 Failed to fetch cached hours for:', loc.name);
                return loc;
              }
            }
            return loc;
          })
        );
        
        console.log('🔍 Final locations with hours:', locationsWithHours);
        setLocations(locationsWithHours);
      } catch (err) {
        console.error('🔍 useLocationHours error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load locations');
      } finally {
        setLoading(false);
      }
    };

    if (trackId) {
      loadLocationsWithHours();
    }
  }, [trackId]);

  return {
    locations,
    loading,
    error
  };
}
