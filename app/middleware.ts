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