// app/api/riddles/[riddleId]/time-warning/route.ts
import { NextResponse } from 'next/server';
import { checkLocationHours } from '../../../../../lib/timeWarnings';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ riddleId: string }> }
) {
  try {
    const { riddleId } = await params;
    
    if (!riddleId) {
      return NextResponse.json({ error: 'Riddle ID is required' }, { status: 400 });
    }

    const timeWarning = await checkLocationHours(riddleId);
    
    if (!timeWarning) {
      return NextResponse.json({ warning: null });
    }

    return NextResponse.json(timeWarning);
  } catch (error) {
    console.error('Error getting time warning:', error);
    return NextResponse.json({ error: 'Failed to get time warning' }, { status: 500 });
  }
}