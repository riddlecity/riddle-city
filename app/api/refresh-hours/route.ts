import { NextRequest, NextResponse } from 'next/server';
import { refreshAllOpeningHours } from '../../../lib/openingHoursCache';

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication here to prevent unauthorized refreshes
    const { adminKey } = await request.json();
    
    // Simple auth check (you can make this more secure)
    if (adminKey !== 'riddle-city-refresh-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await refreshAllOpeningHours();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Opening hours refreshed successfully for the month' 
    });
  } catch (error) {
    console.error('Error refreshing opening hours:', error);
    return NextResponse.json({ error: 'Failed to refresh opening hours' }, { status: 500 });
  }
}
