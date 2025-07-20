'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
  
  const router = useRouter()

  const checkSession = async () => {
    try {
      setSession(prev => ({ ...prev, loading: true }))
      
      // Get cookies from browser
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      }
      
      const userId = getCookie('user_id')
      const groupId = getCookie('group_id')
      
      console.log('🔍 SESSION CHECK: Found cookies - userId:', userId, 'groupId:', groupId)
      
      if (!userId || !groupId) {
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
          
          // REMOVED: No more auto-redirect! Just set the session state
          console.log('✅ SESSION: Active game found but NOT auto-redirecting:', data.currentRiddleId)
        } else {
          // Clear invalid cookies
          document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          document.cookie = 'group_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          
          setSession({
            userId: null,
            groupId: null,
            currentRiddleId: null,
            loading: false,
            hasActiveGroup: false
          })
        }
      } else {
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
    
    window.addEventListener('storage', handleStorageChange)
    
    // Check session every 30 seconds to handle real-time updates
    const interval = setInterval(checkSession, 30000)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  return { ...session, checkSession }
}
