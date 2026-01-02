// app/api/submit-answer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Get user session from cookies
    const cookieStore = await cookies();
    const groupId = cookieStore.get("group_id")?.value;
    const userId = cookieStore.get("user_id")?.value;

    if (!groupId || !userId) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // 🔒 SECURITY: Only get user's answer and current riddle from request
    const { userAnswer, currentRiddleId } = await request.json();

    if (!userAnswer || typeof userAnswer !== 'string') {
      return NextResponse.json({ 
        error: 'Answer is required' 
      }, { status: 400 });
    }

    if (!currentRiddleId || typeof currentRiddleId !== 'string') {
      return NextResponse.json({ 
        error: 'Current riddle ID is required' 
      }, { status: 400 });
    }

    const supabase = await createClient();

    // 🔒 SECURITY: Verify user is in the group
    const { data: membership, error: memberError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ 
        error: 'Not authorized for this group' 
      }, { status: 403 });
    }

    // 🔒 SECURITY: Get current group state from database (not client)
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('current_riddle_id, finished')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ 
        error: 'Group not found' 
      }, { status: 404 });
    }

    if (group.finished) {
      return NextResponse.json({ 
        error: 'Adventure already completed' 
      }, { status: 400 });
    }

    // 🚨 NEW: Check if client is out of sync with database
    if (group.current_riddle_id !== currentRiddleId) {
      return NextResponse.json({ 
        error: 'RIDDLE_MISMATCH',
        correctRiddleId: group.current_riddle_id,
        message: 'Your page is out of sync. Redirecting to correct riddle...'
      }, { status: 409 }); // 409 Conflict
    }

    // 🔒 SECURITY: Get correct answer and next riddle from database (not client)
    const { data: riddle, error: riddleError } = await supabase
      .from('riddles')
      .select('answer, next_riddle_id, has_manual_answer')
      .eq('id', group.current_riddle_id)
      .single();

    if (riddleError || !riddle) {
      return NextResponse.json({ 
        error: 'Riddle not found' 
      }, { status: 404 });
    }

    // Verify this riddle accepts manual answers
    if (!riddle.has_manual_answer) {
      return NextResponse.json({ 
        error: 'This riddle does not accept typed answers' 
      }, { status: 400 });
    }

    // Check if the answer is correct (case-insensitive)
    // Support multiple correct answers separated by " / " (e.g., "42 / 4-2")
    const correctAnswers = riddle.answer.split('/').map((a: string) => a.trim().toLowerCase());
    const normalizedUserAnswer = userAnswer.toLowerCase().trim();
    const isCorrect = correctAnswers.includes(normalizedUserAnswer);

    if (!isCorrect) {
      return NextResponse.json({ 
        correct: false,
        message: 'Incorrect answer'
      });
    }

    // Answer is correct - progress the group
    const isLastRiddle = !riddle.next_riddle_id;

    if (isLastRiddle) {
      // Complete the adventure
      const now = new Date().toISOString();
      
      const { error: completeError } = await supabase
        .from('groups')
        .update({ 
          finished: true,
          completed_at: now
        })
        .eq('id', groupId);

      if (completeError) {
        return NextResponse.json({ 
          error: 'Failed to complete adventure' 
        }, { status: 500 });
      }
      
      return NextResponse.json({
        correct: true,
        completed: true,
        message: 'Adventure completed!'
      });
    } else {
      // Progress to next riddle
      const { error: progressError } = await supabase
        .from('groups')
        .update({ current_riddle_id: riddle.next_riddle_id })
        .eq('id', groupId);

      if (progressError) {
        return NextResponse.json({ 
          error: 'Failed to progress to next riddle' 
        }, { status: 500 });
      }
      
      return NextResponse.json({
        correct: true,
        nextRiddleId: riddle.next_riddle_id,
        message: 'Correct! Moving to next riddle...'
      });
    }
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}