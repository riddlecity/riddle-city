'use client'
import { useEffect, useState } from 'react'

interface GroupSession {
  userId: string | null
  groupId: string | null
  currentRiddleId: string | null
  loading: boolean
  hasActiveGroup: boolean
}

export function useGroupSession(): GroupSession & { checkSession: () => void } {
  const [session, setSession] = useState<GroupSession>({
    userId: null,
    groupId: null,
    currentRiddleId: null,
    loading: true,
    hasActiveGroup: false
  })
  
  const checkSession = async () => {
    try {
      setSession(prev => ({ ...prev, loading: true }))
      
      // Get cookies from browser
      const getCookie = (name: string) => {
        if (typeof document === 'undefined') return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      }
      
      let userId = getCookie('user_id')
      let groupId = getCookie('group_id')
      const sessionCookie = getCookie('riddlecity-session')
      
      console.log('🔍 SESSION CHECK: Found cookies - userId:', userId, 'groupId:', groupId, 'sessionCookie:', !!sessionCookie)
      
      // If we don't have individual cookies but have session cookie, extract from it
      if (sessionCookie && (!userId || !groupId)) {
        try {
          const decoded = JSON.parse(atob(sessionCookie)) // Use atob instead of Buffer for client-side
          userId = userId || decoded.userId
          groupId = groupId || decoded.groupId
          console.log('🔍 SESSION CHECK: Extracted from session cookie - userId:', userId, 'groupId:', groupId)
        } catch (e) {
          console.log('⚠️ SESSION CHECK: Failed to decode session cookie:', e)
        }
      }
      
      if (!userId || !groupId) {
        console.log('❌ SESSION CHECK: No valid cookies found')
        setSession({
          userId: null,
          groupId: null,
          currentRiddleId: null,
          loading: false,
          hasActiveGroup: false
        })
        return
      }
      
      // Verify group membership with server using existing API
      const response = await fetch(`/api/check-active-game?userId=${userId}&groupId=${groupId}`, {
        method: 'GET'
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.isActive) {
          setSession({
            userId,
            groupId,
            currentRiddleId: data.currentRiddleId,
            loading: false,
            hasActiveGroup: true
          })
          
          console.log('✅ SESSION: Active game found - currentRiddleId:', data.currentRiddleId)
        } else {
          console.log('❌ SESSION: No active game, clearing cookies')
          
          // Clear all session cookies
          document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          document.cookie = 'group_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          document.cookie = 'team_name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          document.cookie = 'riddlecity-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          
          setSession({
            userId: null,
            groupId: null,
            currentRiddleId: null,
            loading: false,
            hasActiveGroup: false
          })
        }
      } else {
        console.log('⚠️ SESSION CHECK: Server check failed')
        setSession(prev => ({ ...prev, loading: false, hasActiveGroup: false }))
      }
    } catch (error) {
      console.error('❌ SESSION CHECK: Error:', error)
      setSession(prev => ({ ...prev, loading: false, hasActiveGroup: false }))
    }
  }

  useEffect(() => {
    checkSession()
    
    // Listen for cookie changes (when user joins/leaves groups)
    const handleStorageChange = () => {
      checkSession()
    }
    
    // Listen for focus events to refresh session when user returns to tab
    const handleFocus = () => {
      checkSession()
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('focus', handleFocus)
    
    // Check session every 30 seconds to handle real-time updates
    const interval = setInterval(checkSession, 30000)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleFocus)
      clearInterval(interval)
    }
  }, [])

  return { ...session, checkSession }
}