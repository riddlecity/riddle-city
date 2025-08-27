// hooks/useGroupSession.ts
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  isLeader: boolean
}

export function useGroupSession(autoRedirect: boolean = false) {
  const [activeSession, setActiveSession] = useState<GroupSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasRedirected, setHasRedirected] = useState(false)
  const router = useRouter()
  
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
            gameStarted: Boolean(groupData.game_started), // Use only database value
            finished: data.isFinished || groupData.finished,
            active: groupData.active,
            paid: groupData.paid,
            teamName: teamName || groupData.team_name || 'Your Team',
            isLeader: Boolean(data.isLeader) // Capture leadership status from API
          }
          
          setActiveSession(session)

          // AUTO-REDIRECT LOGIC: If autoRedirect is enabled and we haven't redirected yet
          if (autoRedirect && !hasRedirected) {
            const redirectUrl = getResumeUrlFromSession(session)
            
            if (redirectUrl) {
              console.log('🔍 USE GROUP SESSION: Auto-redirecting to:', redirectUrl)
              setHasRedirected(true)
              router.push(redirectUrl)
            }
          }
          
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
              teamName: teamName || groupData.team_name || 'Your Team',
              isLeader: Boolean(data.isLeader) // Capture leadership status from API
            }
            
            setActiveSession(session)

            // Auto-redirect to completion page if finished
            if (autoRedirect && !hasRedirected) {
              console.log('🔍 USE GROUP SESSION: Auto-redirecting to completion page')
              setHasRedirected(true)
              router.push(`/adventure-complete/${data.groupId}`)
            }
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
    
    // Only set up interval if we haven't redirected (prevents infinite loops)
    let interval: NodeJS.Timeout | null = null
    if (!hasRedirected) {
      // Refresh session check every 30 seconds
      interval = setInterval(checkSession, 30000)
    }
    
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [autoRedirect, hasRedirected, router])

  const getResumeUrlFromSession = (session: GroupSession): string | null => {
    console.log('🔍 USE GROUP SESSION: Getting resume URL for session:', {
      groupId: session.groupId,
      gameStarted: session.gameStarted,
      currentRiddleId: session.currentRiddleId,
      paid: session.paid,
      trackId: session.trackId
    })
    
    // If not paid, go to locations page  
    if (!session.paid) {
      console.log('🔍 USE GROUP SESSION: Not paid, going to locations')
      return '/locations'
    }
    
    // If game is finished, go to completion page
    if (session.finished) {
      return `/adventure-complete/${session.groupId}`
    }
    
    // SMART LOGIC: If game started, user has clicked the Start button - go to current riddle
    if (session.gameStarted && session.currentRiddleId) {
      console.log('🔍 USE GROUP SESSION: Game started (user clicked Start), going to riddle:', session.currentRiddleId)
      return `/riddle/${session.currentRiddleId}`
    }
    
    // If game hasn't started, user hasn't clicked Start yet - go to session page
    if (!session.gameStarted) {
      console.log('🔍 USE GROUP SESSION: Game not started (user hasn\'t clicked Start)')
      
      // If user is NOT the group leader, send them to waiting page
      if (!session.isLeader) {
        console.log('🔍 USE GROUP SESSION: User is not leader, going to waiting page')
        return `/waiting/${session.groupId}`
      }
      
      // User is the group leader - try to construct start page URL
      console.log('🔍 USE GROUP SESSION: User is leader, constructing start page URL')
      
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
      if (session.trackId && sessionId) {
        const parts = session.trackId.split('_')
        if (parts.length >= 2) {
          const mode = parts[0] // "date" or "pub"
          const location = parts.slice(1).join('_') // "barnsley" (or multi-part locations)
          const startPageUrl = `/${location}/${mode}/start/${sessionId}?session_id=${sessionId}&success=true`
          console.log('🔍 USE GROUP SESSION: Constructed start page URL for leader:', startPageUrl)
          return startPageUrl
        }
      }
      
      // For group leaders, if we can't construct the start page URL, try a basic format
      if (session.trackId) {
        const parts = session.trackId.split('_')
        if (parts.length >= 2) {
          const mode = parts[0] // "date" or "pub"
          const location = parts.slice(1).join('_') // "barnsley" (or multi-part locations)
          const basicStartUrl = `/${location}/${mode}`
          console.log('🔍 USE GROUP SESSION: Using basic start URL for leader (no sessionId):', basicStartUrl)
          return basicStartUrl
        }
      }
      
      // Final fallback for leaders - if all else fails, go to waiting page
      console.log('🔍 USE GROUP SESSION: Could not construct start page URL, leader falling back to waiting page')
      return `/waiting/${session.groupId}`
    }
    
    // Fallback to waiting page
    console.log('🔍 USE GROUP SESSION: Fallback to waiting page')
    return `/waiting/${session.groupId}`
  }

  const getResumeUrl = (): string | null => {
    if (!activeSession) return null
    return getResumeUrlFromSession(activeSession)
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
      setHasRedirected(false) // Reset redirect flag
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
    trackId: activeSession?.trackId || null,
    isLeader: activeSession?.isLeader || false
  }
}