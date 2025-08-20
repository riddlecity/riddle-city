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
        
        // Get session data from cookies (matches your start-game API format)
        let groupId: string | null = null
        let userId: string | null = null
        let teamName: string | null = null
        
        // Try to get from riddlecity-session cookie first (your preferred format)
        const sessionCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('riddlecity-session='))
          ?.split('=')[1]
        
        if (sessionCookie) {
          try {
            // Use atob instead of Buffer for browser compatibility
            const sessionData = JSON.parse(atob(sessionCookie))
            groupId = sessionData.groupId
            userId = sessionData.userId  
            teamName = sessionData.teamName
            console.log('🔍 USE GROUP SESSION: Found session cookie data:', { groupId, userId, teamName })
          } catch (e) {
            console.warn('🔍 USE GROUP SESSION: Could not parse session cookie')
          }
        }
        
        // Fallback to individual cookies (your join-group API format)
        if (!groupId || !userId) {
          groupId = document.cookie
            .split('; ')
            .find(row => row.startsWith('group_id='))
            ?.split('=')[1] || null
            
          userId = document.cookie
            .split('; ')
            .find(row => row.startsWith('user_id='))
            ?.split('=')[1] || null
            
          teamName = document.cookie
            .split('; ')
            .find(row => row.startsWith('team_name='))
            ?.split('=')[1] || null
            
          console.log('🔍 USE GROUP SESSION: Found individual cookies:', { groupId, userId, teamName })
        }
        
        if (!groupId || !userId) {
          console.log('🔍 USE GROUP SESSION: No session cookies found')
          setActiveSession(null)
          setLoading(false)
          return
        }
        
        // Call your actual check-active-game API with query parameters
        const response = await fetch(`/api/check-active-game?groupId=${groupId}&userId=${userId}`, {
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
          // Get additional group details from Supabase
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
            userId: userId,
            trackId: groupData.track_id,
            currentRiddleId: groupData.current_riddle_id || data.currentRiddleId,
            gameStarted: data.gameStarted || groupData.game_started,
            finished: data.isFinished || groupData.finished,
            active: groupData.active,
            paid: groupData.paid,
            teamName: teamName || groupData.team_name || 'Your Team'
          }
          
          setActiveSession(session)
        } else if (data.isFinished) {
          // Handle finished games
          const supabase = createClient()
          const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .select('team_name, track_id, current_riddle_id, game_started, finished, active, paid')
            .eq('id', data.groupId)
            .single()

          if (!groupError && groupData) {
            const session: GroupSession = {
              groupId: data.groupId,
              userId: userId,
              trackId: groupData.track_id,
              currentRiddleId: groupData.current_riddle_id || data.currentRiddleId,
              gameStarted: data.gameStarted || groupData.game_started,
              finished: true,
              active: false,
              paid: groupData.paid,
              teamName: teamName || groupData.team_name || 'Your Team'
            }
            
            setActiveSession(session)
          } else {
            setActiveSession(null)
          }
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
    
    // If not paid, go to locations page  
    if (!activeSession.paid) {
      console.log('🔍 USE GROUP SESSION: Not paid, going to locations')
      return '/locations'
    }
    
    // If game is finished, go to completion page
    if (activeSession.finished) {
      return `/adventure-complete/${activeSession.groupId}`
    }
    
    // If game hasn't started yet, go to actual start page (not waiting room)
    if (!activeSession.gameStarted) {
      console.log('🔍 USE GROUP SESSION: Game not started, constructing start page URL')
      
      // Try to get sessionId from session cookie
      const sessionCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('riddlecity-session='))
        ?.split('=')[1]
      
      let sessionId = null
      if (sessionCookie) {
        try {
          // Use atob instead of Buffer for browser compatibility
          const decoded = JSON.parse(atob(sessionCookie))
          sessionId = decoded.sessionId
        } catch (e) {
          console.warn('🔍 USE GROUP SESSION: Could not decode session cookie')
        }
      }
      
      // Extract location and mode from trackId (e.g., "date_barnsley" -> "barnsley/date")
      if (activeSession.trackId && sessionId) {
        const parts = activeSession.trackId.split('_')
        if (parts.length >= 2) {
          const mode = parts[0] // "date" or "pub"
          const location = parts.slice(1).join('_') // "barnsley" (or multi-part locations)
          return `/${location}/${mode}/start/${sessionId}`
        }
      }
      
      // Fallback to game confirmation if we can't construct the start page URL
      console.log('🔍 USE GROUP SESSION: Could not construct start page URL, falling back to game confirmation')
      return `/game-confirmation/${activeSession.groupId}`
    }
    
    // If game is active and has a current riddle, go to that riddle
    if (activeSession.currentRiddleId) {
      return `/riddle/${activeSession.currentRiddleId}`
    }
    
    // Fallback to game confirmation
    return `/game-confirmation/${activeSession.groupId}`
  }

  const clearSession = async () => {
    try {
      // Clear all possible cookie variations
      const cookiesToClear = [
        'riddlecity-session',
        'group_id', 
        'user_id',
        'team_name'
      ]
      
      cookiesToClear.forEach(cookieName => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      })
      
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
    hasActiveGame: !!activeSession && activeSession.active && activeSession.paid && !activeSession.finished,
    hasActiveGroup: !!activeSession && activeSession.active && activeSession.paid, // Includes finished games
    // Direct accessors for backwards compatibility
    currentRiddleId: activeSession?.currentRiddleId || null,
    groupId: activeSession?.groupId || null,
    teamName: activeSession?.teamName || null,
    trackId: activeSession?.trackId || null
  }
}