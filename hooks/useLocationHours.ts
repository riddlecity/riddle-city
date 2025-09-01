import { useState, useEffect } from 'react';
import { OpeningHours, fetchLocationHours } from '../lib/googlePlaces';

interface LocationWithHours {
  id: string;
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
        
        // Fetch locations with Google URLs
        const response = await fetch(`/api/locations/${trackId}`);
        if (!response.ok) throw new Error('Failed to fetch locations');
        
        const { locations: locationData } = await response.json();
        
        // Fetch opening hours for each location in parallel
        const locationsWithHours = await Promise.all(
          locationData.map(async (loc: any) => {
            if (loc.google_place_url) {
              const hours = await fetchLocationHours(loc.google_place_url);
              return { ...loc, opening_hours: hours };
            }
            return loc;
          })
        );
        
        setLocations(locationsWithHours);
      } catch (err) {
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
