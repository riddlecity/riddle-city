// hooks/useGroupSession.ts
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface GroupSession {
  groupId: string
  userId: string
  trackId: string
  currentRiddleId: string
  gameStarted: boolean
  finished: boolean
  active: boolean
  paid: boolean
  teamName: string
}

export function useGroupSession() {
  const [activeSession, setActiveSession] = useState<GroupSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('🔍 USE GROUP SESSION: Checking for active session')
        
        const response = await fetch('/api/check-active-game', {
          credentials: 'include'
        })
        
        if (!response.ok) {
          console.log('🔍 USE GROUP SESSION: No active game response')
          setActiveSession(null)
          setLoading(false)
          return
        }
        
        const data = await response.json()
        console.log('🔍 USE GROUP SESSION: Active game data:', data)
        
        if (data.isActive && data.groupId) {
          // Get additional group details
          const supabase = createClient()
          const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .select('team_name, track_id, current_riddle_id, game_started, finished, active, paid')
            .eq('id', data.groupId)
            .single()

          if (groupError) {
            console.error('🔍 USE GROUP SESSION: Error fetching group details:', groupError)
            setError('Failed to fetch game details')
            setLoading(false)
            return
          }

          console.log('🔍 USE GROUP SESSION: Group details:', groupData)

          const session: GroupSession = {
            groupId: data.groupId,
            userId: data.userId,
            trackId: groupData.track_id,
            currentRiddleId: groupData.current_riddle_id,
            gameStarted: groupData.game_started,
            finished: groupData.finished,
            active: groupData.active,
            paid: groupData.paid,
            teamName: groupData.team_name
          }
          
          setActiveSession(session)
        } else {
          setActiveSession(null)
        }
        
        setLoading(false)
      } catch (error) {
        console.error('🔍 USE GROUP SESSION: Error checking session:', error)
        setError('Failed to check session')
        setLoading(false)
      }
    }

    checkSession()
    
    // Refresh session check every 30 seconds
    const interval = setInterval(checkSession, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getResumeUrl = (): string | null => {
    if (!activeSession) return null
    
    console.log('🔍 USE GROUP SESSION: Getting resume URL for session:', activeSession)
    
    // If game is finished, go to completion page
    if (activeSession.finished) {
      return `/adventure-complete/${activeSession.groupId}`
    }
    
    // If game hasn't started yet, go to waiting page
    if (!activeSession.gameStarted) {
      return `/waiting/${activeSession.groupId}`
    }
    
    // If game is active and has a current riddle, go to that riddle
    if (activeSession.currentRiddleId) {
      return `/riddle/${activeSession.currentRiddleId}`
    }
    
    // Fallback to waiting page
    return `/waiting/${activeSession.groupId}`
  }

  const clearSession = async () => {
    try {
      // Clear cookies
      document.cookie = 'riddlecity-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie = 'riddlecity-user-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      
      setActiveSession(null)
      console.log('🔍 USE GROUP SESSION: Session cleared')
    } catch (error) {
      console.error('🔍 USE GROUP SESSION: Error clearing session:', error)
    }
  }

  return {
    activeSession,
    loading,
    error,
    getResumeUrl,
    clearSession,
    hasActiveGame: !!activeSession && activeSession.active && activeSession.paid,
    hasActiveGroup: !!activeSession && activeSession.active && activeSession.paid,
    // Add these direct accessors for backwards compatibility
    currentRiddleId: activeSession?.currentRiddleId || null,
    groupId: activeSession?.groupId || null,
    teamName: activeSession?.teamName || null,
    trackId: activeSession?.trackId || null
  }
}