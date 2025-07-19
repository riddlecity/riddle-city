// app/api/qr/[riddleId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

interface Props {
  params: Promise<{ riddleId: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { riddleId } = await params;
    
    console.log('🔗 QR ACCESS: Attempting to access riddle via QR:', riddleId);
    
    const cookieStore = await cookies();
    const groupId = cookieStore.get("group_id")?.value;
    const userId = cookieStore.get("user_id")?.value;

    // Check if user has valid game cookies
    if (!groupId || !userId) {
      console.log('🔗 QR ACCESS: No valid cookies, redirecting to unauthorized');
      return NextResponse.redirect(new URL('/riddle-unauthorized', request.url));
    }

    const supabase = await createClient();

    // Verify user is actually in this group
    const { data: membership, error: memberError } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (memberError || !membership) {
      console.log('🔗 QR ACCESS: User not member of group');
      return NextResponse.redirect(new URL('/riddle-unauthorized', request.url));
    }

    // Check if this riddle exists
    const { data: riddle, error: riddleError } = await supabase
      .from("riddles")
      .select("id")
      .eq("id", riddleId)
      .single();

    if (riddleError || !riddle) {
      console.log('🔗 QR ACCESS: Riddle not found');
      return NextResponse.redirect(new URL('/riddle-unauthorized', request.url));
    }

    // Get group's current riddle to check progression
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("current_riddle_id")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      console.log('🔗 QR ACCESS: Group not found');
      return NextResponse.redirect(new URL('/riddle-unauthorized', request.url));
    }

    // Allow access if this is the current riddle or if they're ahead (shouldn't happen but safety check)
    if (group.current_riddle_id === riddleId) {
      console.log('🔗 QR ACCESS: Valid access to current riddle');
      return NextResponse.redirect(new URL(`/riddle/${riddleId}`, request.url));
    } else {
      console.log('🔗 QR ACCESS: Trying to access wrong riddle, redirecting to current');
      return NextResponse.redirect(new URL(`/riddle/${group.current_riddle_id}`, request.url));
    }

  } catch (error) {
    console.error('🔗 QR ACCESS: Error:', error);
    return NextResponse.redirect(new URL('/riddle-unauthorized', request.url));
  }
}