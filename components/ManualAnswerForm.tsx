// components/ManualAnswerForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ManualAnswerFormProps {
  riddleId: string
  groupId: string
  correctAnswer: string
  isLastRiddle: boolean
}

export default function ManualAnswerForm({ 
  riddleId, 
  groupId, 
  correctAnswer, 
  isLastRiddle 
}: ManualAnswerFormProps) {
  const [answer, setAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isCorrect, setIsCorrect] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!answer.trim()) {
      setError('Please enter an answer')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // For manual answer riddles, check the answer locally first
      // Support multiple correct answers separated by "|" (e.g., "42|4-2")
      const correctAnswers = correctAnswer
        .split('|')
        .map(a => a.trim().toLowerCase())
        .filter(a => a.length > 0);
      
      const userAnswerNormalized = answer.trim().toLowerCase();
      const isAnswerCorrect = correctAnswers.includes(userAnswerNormalized);

      // Only make API call if answer is correct to update game state
      if (!isAnswerCorrect) {
        setError('Incorrect answer. Try again!');
        setAnswer('');
        return;
      }

      const response = await fetch('/api/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAnswer: answer.trim(),
          currentRiddleId: riddleId,
          isManualAnswer: true
        }),
      })

      const data = await response.json()

      // 🚨 NEW: Handle riddle mismatch - auto redirect
      if (response.status === 409 && data.error === 'RIDDLE_MISMATCH') {
        setError('Redirecting to correct riddle...')
        // Redirect to the correct riddle page
        router.push(`/riddle/${data.correctRiddleId}`)
        return
      }

      if (response.ok) {
        if (data.correct) {
          setIsCorrect(true)
          setError('')
          
          // Trigger manual sync for all group members
          window.dispatchEvent(new Event('riddleSyncTrigger'));
          
          // Wait a moment to show success, then redirect
          setTimeout(() => {
            if (data.completed) {
              // Use the group ID directly, not track ID
              router.push(`/adventure-complete/${groupId}`)
            } else if (data.nextRiddleId) {
              router.push(`/riddle/${data.nextRiddleId}`)
            }
          }, 1500)
        } else {
          setError('Incorrect answer. Try again!')
          setAnswer('') // Clear the input for retry
        }
      } else {
        setError(data.message || data.error || 'Something went wrong. Please try again.')
      }
    } catch (error) {
      console.error('Submit answer error:', error)
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCorrect) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-green-600/20 border border-green-500/50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-xl font-bold text-green-300 mb-2">Correct!</h3>
          <p className="text-green-200 text-sm">
            {isLastRiddle ? 'Adventure complete! Redirecting...' : 'Moving to next riddle...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="bg-gradient-to-br from-purple-900/50 via-blue-900/40 to-indigo-900/50 backdrop-blur-sm border-2 border-purple-400/30 rounded-xl p-4 sm:p-5 shadow-xl">
          <h3 className="text-base sm:text-lg font-bold text-white mb-3.5 text-center bg-gradient-to-r from-purple-200 via-blue-200 to-cyan-200 bg-clip-text text-transparent">
            🔍 Enter Your Answer
          </h3>
          
          <div className="space-y-3">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full px-4 py-3 bg-white/15 border-2 border-purple-300/30 rounded-lg text-white text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400/50 focus:bg-white/20 transition-all shadow-inner"
              disabled={isSubmitting}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
            />
            
            {error && (
              <div className="bg-red-600/20 border border-red-500/50 rounded-lg p-3 animate-in slide-in-from-top-2 duration-200">
                <p className="text-red-300 text-sm text-center font-medium">{error}</p>
              </div>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting || !answer.trim()}
              className="w-full min-h-[46px] bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 active:scale-[0.98] disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-2xl disabled:cursor-not-allowed text-sm"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Checking...</span>
                </div>
              ) : (
                'Submit Answer'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}