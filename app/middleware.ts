// 1. Create middleware for automatic redirects
// middleware.ts (place in your project root, same level as app/)

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  // Only run on specific paths
  if (request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/riddlecity')) {
    
    // Get cookies
    const userId = request.cookies.get('user_id')?.value
    const groupId = request.cookies.get('group_id')?.value
    
    console.log('🔍 MIDDLEWARE: Checking session - userId:', userId, 'groupId:', groupId)
    
    if (userId && groupId) {
      try {
        // Create Supabase client for server-side request
        const supabase = createClient()
        
        // Check if user is still in an active group
        const { data: groupMember, error } = await supabase
          .from('group_members')
          .select(`
            group_id,
            groups (
              id,
              current_riddle_id,
              finished,
              paid
            )
          `)
          .eq('user_id', userId)
          .eq('group_id', groupId)
          .single()
        
        if (!error && groupMember?.groups && !groupMember.groups.finished && groupMember.groups.paid) {
          // User has active group - redirect to current riddle
          const currentRiddleId = groupMember.groups.current_riddle_id
          
          if (currentRiddleId && !request.nextUrl.pathname.includes('/riddle/')) {
            console.log('✅ MIDDLEWARE: Redirecting to active game:', currentRiddleId)
            return NextResponse.redirect(new URL(`/riddle/${currentRiddleId}`, request.url))
          }
        }
      } catch (error) {
        console.log('⚠️ MIDDLEWARE: Error checking group session:', error)
        // Don't block the request, just continue
      }
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/riddlecity/:path*']
}

// 2. Create a client-side hook for session management
// hooks/useGroupSession.ts

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
          
          // Auto-redirect if not already on riddle page
          if (data.currentRiddleId && !window.location.pathname.includes('/riddle/')) {
            console.log('✅ SESSION: Auto-redirecting to active game:', data.currentRiddleId)
            router.push(`/riddle/${data.currentRiddleId}`)
          }
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

// 3. You can SKIP creating the check-group-status API route since you have check-active-game
// Your existing check-active-game route works perfectly!

// 4. Update your join-group page to handle rejoining
// app/join-group/[groupId]/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface JoinGroupPageProps {
  params: { groupId: string }
}

export default function JoinGroupPage({ params }: JoinGroupPageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function handleJoin() {
      try {
        setMessage('Checking your group status...')
        
        // First check if user already has cookies for this group
        const getCookie = (name: string) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(';').shift();
          return null;
        }
        
        const existingUserId = getCookie('user_id')
        const existingGroupId = getCookie('group_id')
        
        if (existingUserId && existingGroupId === params.groupId) {
          // User has cookies for this group - verify they're still valid
          setMessage('Welcome back! Verifying your group membership...')
          
          const statusResponse = await fetch(`/api/check-active-game?userId=${existingUserId}&groupId=${params.groupId}`, {
            method: 'GET'
          })
          
          const statusData = await statusResponse.json()
          
          if (statusData.isActive && statusData.currentRiddleId) {
            // Valid session - redirect to current riddle
            setMessage('Rejoining your adventure...')
            router.push(`/riddle/${statusData.currentRiddleId}`)
            return
          } else {
            // Invalid session - clear cookies and proceed with fresh join
            document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
            document.cookie = 'group_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          }
        }

        // Proceed with joining the group (new or fresh join)
        setMessage('Joining your group...')
        
        const response = await fetch('/api/join-group', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId: params.groupId })
        })

        const result = await response.json()

        if (response.ok) {
          const welcomeMessage = result.isRejoining ? 'Welcome back!' : 'Successfully joined!'
          setMessage(`${welcomeMessage} Starting your adventure...`)
          
          // Small delay to show success message
          setTimeout(() => {
            router.push(`/riddle/${result.nextRiddle}`)
          }, 1000)
        } else {
          setError(result.error || 'Failed to join group')
        }
      } catch (err) {
        console.error('Join error:', err)
        setError('Something went wrong. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    handleJoin()
  }, [params.groupId, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Unable to Join Group</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-6"></div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">RiddleCity</h1>
        <p className="text-lg text-gray-600 mb-2">{message}</p>
        {loading && (
          <p className="text-sm text-gray-500">This may take a few seconds...</p>
        )}
      </div>
    </div>
  )
}

// 5. Add session check to your homepage
// Add this to your main page component

'use client'

import { useGroupSession } from '@/hooks/useGroupSession'

export default function HomePage() {
  const { loading, hasActiveGroup, currentRiddleId } = useGroupSession()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Checking your session...</p>
        </div>
      </div>
    )
  }

  // If user has active group, the hook will auto-redirect them
  // This content only shows for users without active groups
  
  return (
    <div>
      {/* Your existing homepage content */}
      <h1>Welcome to RiddleCity!</h1>
      {/* Rest of your homepage */}
    </div>
  )
}