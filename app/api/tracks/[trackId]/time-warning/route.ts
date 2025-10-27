import { NextRequest, NextResponse } from 'next/server';
import { checkMultipleLocationHours } from '../../../../../lib/timeWarnings';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const { trackId } = await params;
    
    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }

    const timeWarning = await checkMultipleLocationHours(trackId);
    
    return NextResponse.json(timeWarning);
  } catch (error) {
    console.error('Error getting track time warning:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}