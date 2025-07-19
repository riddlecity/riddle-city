// app/api/check-active-game/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get('groupId');
    const userId = searchParams.get('userId');

    console.log('🔍 CHECK ACTIVE GAME: Request received', { groupId, userId });

    if (!groupId || !userId) {
      return NextResponse.json({ 
        isActive: false, 
        error: 'Missing groupId or userId' 
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if group exists and get current state
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, current_riddle_id, finished, paid, created_at')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      console.log('🔍 CHECK ACTIVE GAME: Group not found');
      return NextResponse.json({ 
        isActive: false, 
        error: 'Group not found' 
      });
    }

    // Check if user is a member of this group
    const { data: membership, error: memberError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership) {
      console.log('🔍 CHECK ACTIVE GAME: User not member of group');
      return NextResponse.json({ 
        isActive: false, 
        error: 'User not member of group' 
      });
    }

    // Check if game is active (paid but not finished)
    const isActive = group.paid && !group.finished;
    
    console.log('🔍 CHECK ACTIVE GAME: Game status', {
      paid: group.paid,
      finished: group.finished,
      isActive,
      currentRiddleId: group.current_riddle_id
    });

    return NextResponse.json({
      isActive,
      isFinished: group.finished,
      currentRiddleId: group.current_riddle_id,
      groupId: group.id,
      gameStarted: group.created_at
    });

  } catch (error) {
    console.error('❌ CHECK ACTIVE GAME: Error:', error);
    return NextResponse.json({ 
      isActive: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}