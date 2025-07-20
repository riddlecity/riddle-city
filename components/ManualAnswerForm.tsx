// components/ManualAnswerForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ManualAnswerFormProps {
  riddleId: string
  groupId: string
  correctAnswer: string
  nextRiddleId: string | null
  isLastRiddle: boolean
}

export default function ManualAnswerForm({ 
  riddleId, 
  groupId, 
  correctAnswer, 
  nextRiddleId, 
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
      const response = await fetch('/api/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          riddleId,
          groupId,
          userAnswer: answer.trim(),
          correctAnswer,
          nextRiddleId,
          isLastRiddle
        }),
      })

      const result = await response.json()

      if (response.ok) {
        if (result.correct) {
          setIsCorrect(true)
          setError('')
          
          // Wait a moment to show success, then redirect
          setTimeout(() => {
            if (isLastRiddle) {
              router.push(`/adventure-complete/${groupId}`)
            } else if (nextRiddleId) {
              router.push(`/riddle/${nextRiddleId}`)
            }
          }, 1500)
        } else {
          setError('Incorrect answer. Try again!')
          setAnswer('') // Clear the input for retry
        }
      } else {
        setError(result.error || 'Something went wrong. Please try again.')
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 text-center">
            🔍 Enter Your Answer
          </h3>
          
          <div className="space-y-4">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
              autoComplete="off"
            />
            
            {error && (
              <div className="bg-red-600/20 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-300 text-sm text-center">{error}</p>
              </div>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting || !answer.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Checking...
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