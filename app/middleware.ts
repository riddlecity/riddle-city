// middleware.ts (fixed version with proper Next.js 15 cookie handling)

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  // Only run on specific paths
  if (request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/locations')) {
    
    // Get cookies - check both old format and new session format
    const userId = request.cookies.get('user_id')?.value
    const groupId = request.cookies.get('group_id')?.value
    const sessionCookie = request.cookies.get('riddlecity-session')?.value
    
    console.log('🔍 MIDDLEWARE: Checking session - userId:', userId, 'groupId:', groupId, 'sessionCookie:', !!sessionCookie)
    
    let finalUserId = userId
    let finalGroupId = groupId
    
    // If we have session cookie but not individual cookies, extract from session
    if (sessionCookie && (!userId || !groupId)) {
      try {
        const decoded = JSON.parse(Buffer.from(sessionCookie, 'base64').toString())
        finalUserId = finalUserId || decoded.userId
        finalGroupId = finalGroupId || decoded.groupId
        console.log('🔍 MIDDLEWARE: Extracted from session cookie - userId:', finalUserId, 'groupId:', finalGroupId)
      } catch (e) {
        console.log('⚠️ MIDDLEWARE: Failed to decode session cookie:', e)
      }
    }
    
    if (finalUserId && finalGroupId) {
      try {
        // Create Supabase client for server-side request
        const supabase = await createClient()
        
        // Check if group is active and not finished
        const { data: group, error } = await supabase
          .from('groups')
          .select('id, current_riddle_id, finished, paid, active, completed_at, expires_at, game_started')
          .eq('id', finalGroupId)
          .single()
        
        if (!error && group && group.paid) {
          // Check if group has expired (48 hours after payment)
          if (group.expires_at) {
            const expiresAt = new Date(group.expires_at);
            const now = new Date();
            
            if (now > expiresAt) {
              console.log('🚫 MIDDLEWARE: Group expired after 48 hours');
              
              // Mark group as inactive
              await supabase
                .from('groups')
                .update({ active: false })
                .eq('id', finalGroupId);
                
              // Clear expired session cookie
              const response = NextResponse.next()
              response.cookies.delete('riddlecity-session')
              response.cookies.delete('user_id')
              response.cookies.delete('group_id')
              return response
            }
          }
          
          // Check if group is finished
          if (group.finished) {
            console.log('🏁 MIDDLEWARE: Group is finished, session still valid but game over')
            return NextResponse.next()
          }
          
          // Check if group is inactive (closed after 15 minutes)
          if (group.active === false) {
            console.log('🔒 MIDDLEWARE: Group is closed, session expired')
            // Clear inactive session cookie
            const response = NextResponse.next()
            response.cookies.delete('riddlecity-session')
            response.cookies.delete('user_id')
            response.cookies.delete('group_id')
            return response
          }
          
          // Auto-close group if finished > 15 minutes ago
          if (group.completed_at) {
            const completionTime = new Date(group.completed_at)
            const now = new Date()
            const timeSinceCompletion = now.getTime() - completionTime.getTime()
            const FIFTEEN_MINUTES = 15 * 60 * 1000
            
            if (timeSinceCompletion > FIFTEEN_MINUTES && group.active !== false) {
              console.log('🔒 MIDDLEWARE: Auto-closing group after 15 minutes')
              
              await supabase
                .from('groups')
                .update({ 
                  active: false,
                  closed_at: now.toISOString()
                })
                .eq('id', finalGroupId)
                
              // Clear closed session cookie
              const response = NextResponse.next()
              response.cookies.delete('riddlecity-session')
              response.cookies.delete('user_id')
              response.cookies.delete('group_id')
              return response
            }
          }
          
          // Verify user is actually a member of this group
          const { data: membership } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', finalGroupId)
            .eq('user_id', finalUserId)
            .single()
          
          if (membership) {
            console.log('✅ MIDDLEWARE: User has active game session - current riddle:', group.current_riddle_id, 'game started:', group.game_started)
            
            // Store session info in response headers for client-side detection
            const response = NextResponse.next()
            response.headers.set('x-riddlecity-active-session', 'true')
            response.headers.set('x-riddlecity-group-id', finalGroupId)
            response.headers.set('x-riddlecity-current-riddle', group.current_riddle_id || '')
            response.headers.set('x-riddlecity-game-started', group.game_started ? 'true' : 'false')
            
            return response
          }
        } else {
          console.log('⚠️ MIDDLEWARE: No valid paid group found, clearing cookies')
          // Clear invalid session cookies
          const response = NextResponse.next()
          response.cookies.delete('riddlecity-session')
          response.cookies.delete('user_id')
          response.cookies.delete('group_id')
          return response
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
  matcher: ['/', '/locations/:path*']
}