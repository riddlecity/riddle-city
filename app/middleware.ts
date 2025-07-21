// middleware.ts (complete version with 48-hour expiry)

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  // Only run on specific paths
  if (request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/locations')) {
    
    // Get cookies
    const userId = request.cookies.get('user_id')?.value
    const groupId = request.cookies.get('group_id')?.value
    
    console.log('🔍 MIDDLEWARE: Checking session - userId:', userId, 'groupId:', groupId)
    
    if (userId && groupId) {
      try {
        // Create Supabase client for server-side request (await for Next.js 15)
        const supabase = await createClient()
        
        // Check if group is active and not finished
        const { data: group, error } = await supabase
          .from('groups')
          .select('id, current_riddle_id, finished, paid, active, completed_at, expires_at')
          .eq('id', groupId)
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
                .eq('id', groupId);
                
              return NextResponse.next(); // Don't redirect to expired games
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
            return NextResponse.next()
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
                .eq('id', groupId)
                
              return NextResponse.next()
            }
          }
          
          // Verify user is actually a member of this group
          const { data: membership } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single()
          
          if (membership && group.current_riddle_id) {
            // User has active, ongoing group - but DON'T auto-redirect anymore
            // Just log that they have an active session - let pages handle it
            console.log('✅ MIDDLEWARE: User has active game but NOT auto-redirecting:', group.current_riddle_id)
            
            // REMOVED: The auto-redirect code that was here
            // return NextResponse.redirect(new URL(`/riddle/${group.current_riddle_id}`, request.url))
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
  matcher: ['/', '/locations/:path*']
}
}