// app/api/submit-answer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { riddleId, groupId, userAnswer, correctAnswer, nextRiddleId, isLastRiddle } = await request.json();

    console.log('🔍 SUBMIT ANSWER: Request received', {
      riddleId,
      groupId,
      userAnswer: userAnswer?.substring(0, 10) + '...',
      isLastRiddle
    });

    if (!riddleId || !groupId || !userAnswer || !correctAnswer) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Check if the answer is correct (case-insensitive)
    const isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

    console.log('🔍 SUBMIT ANSWER: Answer check', {
      userAnswer: userAnswer.toLowerCase().trim(),
      correctAnswer: correctAnswer.toLowerCase().trim(),
      isCorrect
    });

    if (!isCorrect) {
      return NextResponse.json({ 
        correct: false,
        message: 'Incorrect answer'
      });
    }

    // Answer is correct - progress the group
    const supabase = await createClient();

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
        console.error('❌ SUBMIT ANSWER: Failed to complete adventure:', completeError);
        return NextResponse.json({ 
          error: 'Failed to complete adventure' 
        }, { status: 500 });
      }

      console.log('🏁 SUBMIT ANSWER: Adventure completed successfully');
      
      return NextResponse.json({
        correct: true,
        completed: true,
        message: 'Adventure completed!'
      });
    } else {
      // Progress to next riddle
      const { error: progressError } = await supabase
        .from('groups')
        .update({ current_riddle_id: nextRiddleId })
        .eq('id', groupId);

      if (progressError) {
        console.error('❌ SUBMIT ANSWER: Failed to progress riddle:', progressError);
        return NextResponse.json({ 
          error: 'Failed to progress to next riddle' 
        }, { status: 500 });
      }

      console.log('✅ SUBMIT ANSWER: Progressed to next riddle:', nextRiddleId);
      
      return NextResponse.json({
        correct: true,
        nextRiddleId,
        message: 'Correct! Moving to next riddle...'
      });
    }

  } catch (error) {
    console.error('💥 SUBMIT ANSWER: Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}