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

    // Check if group exists and get current state (enhanced with additional fields)
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select(`
        id, 
        current_riddle_id, 
        finished, 
        paid, 
        active, 
        completed_at, 
        created_at,
        game_started,
        expires_at,
        track_id,
        team_name
      `)
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      console.log('🔍 CHECK ACTIVE GAME: Group not found');
      return NextResponse.json({ 
        isActive: false, 
        error: 'Group not found' 
      });
    }

    // Check if user is a member of this group (enhanced with is_leader)
    const { data: membership, error: memberError } = await supabase
      .from('group_members')
      .select('user_id, is_leader')
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

    // Check if group has expired (48-hour expiry)
    const now = new Date();
    const expiresAt = group.expires_at ? new Date(group.expires_at) : null;
    const hasExpired = expiresAt && now > expiresAt;

    // Check if group is finished
    if (group.finished) {
      console.log('🏁 CHECK ACTIVE GAME: Group is finished');
      return NextResponse.json({
        isActive: false,
        isFinished: true,
        currentRiddleId: group.current_riddle_id,
        groupId: group.id,
        gameStarted: Boolean(group.game_started),
        trackId: group.track_id,
        isPaid: Boolean(group.paid),
        isLeader: Boolean(membership.is_leader),
        teamName: group.team_name,
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
        gameStarted: Boolean(group.game_started),
        trackId: group.track_id,
        isPaid: Boolean(group.paid),
        isLeader: Boolean(membership.is_leader),
        teamName: group.team_name,
        reason: 'Group session has expired'
      });
    }

    // Check if group has expired
    if (hasExpired) {
      console.log('⏰ CHECK ACTIVE GAME: Group has expired (48-hour limit)');
      return NextResponse.json({
        isActive: false,
        isFinished: group.finished,
        currentRiddleId: group.current_riddle_id,
        groupId: group.id,
        gameStarted: Boolean(group.game_started),
        trackId: group.track_id,
        isPaid: Boolean(group.paid),
        isLeader: Boolean(membership.is_leader),
        teamName: group.team_name,
        reason: 'Group session expired (48-hour limit)'
      });
    }

    // Auto-close group if completed > 15 minutes ago
    if (group.completed_at) {
      const completionTime = new Date(group.completed_at);
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
          gameStarted: Boolean(group.game_started),
          trackId: group.track_id,
          isPaid: Boolean(group.paid),
          isLeader: Boolean(membership.is_leader),
          teamName: group.team_name,
          reason: 'Group session expired (15 minutes after completion)'
        });
      }
    }

    // Check if game is active (paid and not finished)
    const isActive = group.paid && !group.finished && group.active !== false && !hasExpired;
    
    console.log('🔍 CHECK ACTIVE GAME: Game status', {
      paid: group.paid,
      finished: group.finished,
      active: group.active,
      hasExpired,
      isActive,
      currentRiddleId: group.current_riddle_id,
      gameStarted: group.game_started,
      trackId: group.track_id
    });

    return NextResponse.json({
      isActive,
      isFinished: group.finished,
      currentRiddleId: group.current_riddle_id,
      groupId: group.id,
      gameStarted: Boolean(group.game_started), // Ensure boolean
      trackId: group.track_id,
      isPaid: Boolean(group.paid), // Ensure boolean
      isLeader: Boolean(membership.is_leader), // Ensure boolean
      teamName: group.team_name
    });

  } catch (error) {
    console.error('❌ CHECK ACTIVE GAME: Error:', error);
    return NextResponse.json({ 
      isActive: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}