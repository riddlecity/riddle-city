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
      .select('id, current_riddle_id, finished, paid, active, completed_at, created_at')
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

    // Check if group is finished
    if (group.finished) {
      console.log('🏁 CHECK ACTIVE GAME: Group is finished');
      return NextResponse.json({
        isActive: false,
        isFinished: true,
        currentRiddleId: group.current_riddle_id,
        groupId: group.id,
        gameStarted: group.created_at,
        reason: 'Group has finished the adventure'
      });
    }

    // Check if group is inactive (closed after 15 minutes)
    if (group.active === false) {
      console.log('🔒 CHECK ACTIVE GAME: Group is closed');
      return NextResponse.json({
        isActive: false,
        isFinished: group.finished,
        currentRiddleId: group.current_riddle_id,
        groupId: group.id,
        gameStarted: group.created_at,
        reason: 'Group session has expired'
      });
    }

    // Auto-close group if completed > 15 minutes ago
    if (group.completed_at) {
      const completionTime = new Date(group.completed_at);
      const now = new Date();
      const timeSinceCompletion = now.getTime() - completionTime.getTime();
      const FIFTEEN_MINUTES = 15 * 60 * 1000;
      
      if (timeSinceCompletion > FIFTEEN_MINUTES) {
        console.log('🔒 CHECK ACTIVE GAME: Auto-closing expired group');
        
        await supabase
          .from('groups')
          .update({ 
            active: false,
            closed_at: now.toISOString()
          })
          .eq('id', groupId);
          
        return NextResponse.json({
          isActive: false,
          isFinished: group.finished,
          currentRiddleId: group.current_riddle_id,
          groupId: group.id,
          gameStarted: group.created_at,
          reason: 'Group session expired (15 minutes after completion)'
        });
      }
    }

    // Check if game is active (paid and not finished)
    const isActive = group.paid && !group.finished && group.active !== false;
    
    console.log('🔍 CHECK ACTIVE GAME: Game status', {
      paid: group.paid,
      finished: group.finished,
      active: group.active,
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