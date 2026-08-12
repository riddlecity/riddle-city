// app/api/submit-answer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { addRiddleCompletion } from '@/lib/riddleProgress';

// Reused service-role client for broadcasting realtime updates - a fresh
// client per-request risks the websocket not being ready before the
// serverless function returns, so we keep one warm module-level instance.
const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function broadcastRiddleUpdate(groupId: string, newRiddleId: string | null, isCompleted: boolean) {
  return serviceSupabase
    .channel(`riddle-updates-${groupId}`)
    .send({
      type: 'broadcast',
      event: 'riddle_update',
      payload: {
        groupId,
        newRiddleId,
        isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : null
      }
    });
}

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
      .select('current_riddle_id, finished, riddle_progress')
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
      .select('answer, next_riddle_id, has_manual_answer, order_index')
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
    // Support multiple correct answers separated by "|" (e.g., "42|4-2" or "42 | 4-2")
    const correctAnswers = riddle.answer
      .split('|')
      .map((a: string) => a.trim().toLowerCase())
      .filter((a: string) => a.length > 0); // Remove empty strings
    
    const normalizedUserAnswer = userAnswer.toLowerCase().trim();
    const isCorrect = correctAnswers.includes(normalizedUserAnswer);

    // Debug logging
    console.log('🔍 ANSWER CHECK:', {
      riddleId: group.current_riddle_id,
      rawAnswer: riddle.answer,
      rawAnswerType: typeof riddle.answer,
      rawAnswerLength: riddle.answer?.length,
      correctAnswers: correctAnswers,
      userAnswer: userAnswer,
      normalizedUserAnswer: normalizedUserAnswer,
      normalizedLength: normalizedUserAnswer.length,
      isCorrect: isCorrect,
      matches: correctAnswers.map((ans: string) => ({
        answer: ans,
        length: ans.length,
        matches: ans === normalizedUserAnswer
      }))
    });

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
      
      // Track this manual answer in riddle progress
      const riddleOrder = riddle.order_index;
      const updatedProgress = riddleOrder 
        ? addRiddleCompletion(group.riddle_progress, riddleOrder, 'manual_answer')
        : group.riddle_progress;
      
      // 🔒 CONCURRENCY GUARD: Only apply this update if the group is still on
      // the riddle we read above. If another simultaneous request already
      // advanced the group, this compare-and-swap update affects 0 rows.
      const { data: updatedGroup, error: completeError } = await supabase
        .from('groups')
        .update({ 
          finished: true,
          completed_at: now,
          riddle_progress: updatedProgress
        })
        .eq('id', groupId)
        .eq('current_riddle_id', group.current_riddle_id)
        .select('finished')
        .maybeSingle();

      if (completeError) {
        return NextResponse.json({ 
          error: 'Failed to complete adventure' 
        }, { status: 500 });
      }

      if (!updatedGroup) {
        // Another request already advanced the group - it's already done.
        return NextResponse.json({
          correct: true,
          completed: true,
          message: 'Adventure completed!'
        });
      }
      
      // 🚀 Push an instant update to every device in the group instead of
      // waiting on postgres_changes replication or the slower polling fallback.
      await Promise.allSettled([broadcastRiddleUpdate(groupId, null, true)]);

      return NextResponse.json({
        correct: true,
        completed: true,
        message: 'Adventure completed!'
      });
    } else {
      // Progress to next riddle
      // Track this manual answer in riddle progress
      const riddleOrder = riddle.order_index;
      const updatedProgress = riddleOrder 
        ? addRiddleCompletion(group.riddle_progress, riddleOrder, 'manual_answer')
        : group.riddle_progress;
      
      // 🔒 CONCURRENCY GUARD: Compare-and-swap on current_riddle_id so that if
      // two group members submit the correct answer at the same time, only
      // the first request actually advances the group - the second is a no-op
      // that simply returns the (already correct) next riddle id.
      const { data: updatedGroup, error: progressError } = await supabase
        .from('groups')
        .update({ 
          current_riddle_id: riddle.next_riddle_id,
          riddle_progress: updatedProgress
        })
        .eq('id', groupId)
        .eq('current_riddle_id', group.current_riddle_id)
        .select('current_riddle_id')
        .maybeSingle();

      if (progressError) {
        return NextResponse.json({ 
          error: 'Failed to progress to next riddle' 
        }, { status: 500 });
      }

      if (!updatedGroup) {
        // Someone else already advanced the group - fetch the authoritative
        // current state instead of blindly trusting our stale computation.
        const { data: freshGroup } = await supabase
          .from('groups')
          .select('current_riddle_id, finished')
          .eq('id', groupId)
          .single();

        if (freshGroup?.finished) {
          return NextResponse.json({
            correct: true,
            completed: true,
            message: 'Adventure completed!'
          });
        }

        return NextResponse.json({
          correct: true,
          nextRiddleId: freshGroup?.current_riddle_id ?? riddle.next_riddle_id,
          message: 'Correct! Moving to next riddle...'
        });
      }
      
      // 🚀 Push an instant update to every device in the group instead of
      // waiting on postgres_changes replication or the slower polling fallback.
      await Promise.allSettled([broadcastRiddleUpdate(groupId, riddle.next_riddle_id, false)]);

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