import { useState, useEffect } from 'react';
import { OpeningHours } from '../lib/googlePlaces';

interface LocationWithHours {
  id: string;
  order: number;
  name: string;
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
        console.log('🔍 Loading locations with hours for trackId:', trackId);
        
        // SPEED OPTIMIZATION: Use single bulk endpoint instead of multiple requests
        const startTime = Date.now();
        const response = await fetch(`/api/locations/${trackId}/hours`);
        
        console.log('🔍 Bulk locations+hours API response:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('🔍 Bulk API error:', errorText);
          throw new Error(`Failed to fetch locations with hours: ${response.status}`);
        }
        
        const { locations: locationsWithHours } = await response.json();
        const loadTime = Date.now() - startTime;
        
        console.log('🔍 Bulk load completed in', loadTime, 'ms for', locationsWithHours.length, 'locations');
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
