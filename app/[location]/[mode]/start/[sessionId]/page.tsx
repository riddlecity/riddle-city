// app/[location]/[mode]/start/[sessionId]/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface Props {
  params: Promise<{ location: string; mode: string; sessionId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function StartPage({ params, searchParams }: Props) {
  console.log('🚀 START PAGE: Beginning payment verification process...');
  
  const awaitedParams = await params;
  const awaitedSearchParams = await searchParams;
  console.log('📋 START PAGE: Params received:', { 
    location: awaitedParams.location, 
    mode: awaitedParams.mode, 
    sessionId: awaitedParams.sessionId 
  });
  
  const supabase = await createClient();
  console.log('🔌 START PAGE: Supabase client created');

  const stripeSessionId = awaitedSearchParams.session_id as string;
  const successFlag = awaitedSearchParams.success;

  console.log("🎮 START PAGE: Start page accessed:", {
    sessionId: stripeSessionId,
    success: successFlag,
    location: awaitedParams.location,
    mode: awaitedParams.mode
  });

  // Step 1: Verify this is a successful payment
  if (!stripeSessionId || successFlag !== 'true') {
    console.error('❌ START PAGE: Invalid payment confirmation - missing session_id or success flag');
    console.error('❌ START PAGE: sessionId:', stripeSessionId, 'success:', successFlag);
    redirect('/locations');
  }
  console.log('✅ START PAGE: Payment confirmation flags valid');

  // Step 2: Fetch Stripe session data using our API
  console.log('📡 START PAGE: Fetching Stripe session data...');
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://riddle-city.vercel.app';
  const stripeUrl = `${baseUrl}/api/stripe-session?session_id=${stripeSessionId}`;
  console.log('🔗 START PAGE: Stripe URL:', stripeUrl);
  
  let stripeSession;
  try {
    const stripeResponse = await fetch(stripeUrl, { cache: 'no-store' });
    console.log('📡 START PAGE: Stripe response status:', stripeResponse.status);

    if (!stripeResponse.ok) {
      console.error('❌ START PAGE: Failed to fetch Stripe session - status:', stripeResponse.status);
      const errorText = await stripeResponse.text();
      console.error('❌ START PAGE: Stripe error details:', errorText);
      redirect('/locations');
    }

    stripeSession = await stripeResponse.json();
    console.log('✅ START PAGE: Stripe session retrieved:', JSON.stringify(stripeSession, null, 2));
  } catch (error) {
    console.error('💥 START PAGE: Error fetching Stripe session:', error);
    redirect('/locations');
  }
  
  // Step 3: Verify payment was successful
  if (stripeSession.payment_status !== 'paid') {
    console.error('❌ START PAGE: Payment not completed - status:', stripeSession.payment_status);
    redirect('/locations');
  }
  console.log('✅ START PAGE: Payment status confirmed as paid');

  // Step 4: Extract metadata from Stripe session
  const groupId = stripeSession.metadata?.group_id;
  const userId = stripeSession.metadata?.user_id;
  const teamName = stripeSession.metadata?.team_name;
  const playerCount = stripeSession.metadata?.player_count;
  
  // NEW: Extract emails from Stripe session
  const teamLeaderEmail = stripeSession.customer_details?.email;
  const memberEmails = stripeSession.metadata?.emails ? 
    JSON.parse(stripeSession.metadata.emails).filter((email: string) => email && email.trim()) : [];

  console.log("💳 START PAGE: Stripe session metadata extracted:", { 
    groupId, 
    userId, 
    teamName, 
    teamLeaderEmail, 
    memberEmailsCount: memberEmails.length 
  });

  if (!groupId || !userId) {
    console.error('❌ START PAGE: Missing essential metadata from Stripe session');
    console.error('❌ START PAGE: groupId:', groupId, 'userId:', userId);
    redirect('/locations');
  }
  console.log('✅ START PAGE: Essential metadata present');

  // Step 5: Verify the group exists and was created by this user
  console.log('🔍 START PAGE: Querying database for group...');
  let group;
  try {
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('id, current_riddle_id, track_id, created_by, finished')
      .eq('id', groupId)
      .single();

    if (groupError) {
      console.error('❌ START PAGE: Database error querying group:', groupError);
      redirect('/locations');
    }

    if (!groupData) {
      console.error('❌ START PAGE: Group not found in database with ID:', groupId);
      redirect('/locations');
    }

    group = groupData;
    console.log('✅ START PAGE: Group found in database:', JSON.stringify(group, null, 2));

    if (group.created_by !== userId) {
      console.error('❌ START PAGE: User is not the creator of this group');
      console.error('❌ START PAGE: group.created_by:', group.created_by, 'userId:', userId);
      redirect('/locations');
    }
    console.log('✅ START PAGE: User confirmed as group creator');
  } catch (error) {
    console.error('💥 START PAGE: Error querying group:', error);
    redirect('/locations');
  }

  // Step 6: Verify user is marked as leader in group_members
  console.log('🔍 START PAGE: Checking group membership and leadership...');
  try {
    const { data: memberData, error: memberError } = await supabase
      .from('group_members')
      .select('is_leader')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (memberError) {
      console.error('❌ START PAGE: Database error querying group membership:', memberError);
      redirect('/locations');
    }

    if (!memberData?.is_leader) {
      console.error('❌ START PAGE: User is not marked as leader');
      console.error('❌ START PAGE: memberData:', memberData);
      redirect('/locations');
    }
    console.log('✅ START PAGE: User confirmed as group leader');
  } catch (error) {
    console.error('💥 START PAGE: Error checking membership:', error);
    redirect('/locations');
  }

  // Step 7: RESET GROUP TO FRESH START after payment
  console.log('🔄 START PAGE: Resetting group to fresh start after payment...');
  try {
    // Get the track's start riddle to ensure we start at the beginning
    const { data: trackData } = await supabase
      .from('tracks')
      .select('start_riddle_id')
      .eq('id', group.track_id)
      .single();
    
    const startRiddleId = trackData?.start_riddle_id || 'barnsley_r1'; // Fallback
    console.log('🎯 START PAGE: Start riddle ID:', startRiddleId);
    
    const { error: updateError } = await supabase
      .from('groups')
      .update({ 
        paid: true,
        current_riddle_id: startRiddleId, // Reset to first riddle
        riddles_skipped: 0, // Reset skips
        finished: false, // Reset finished status
        completed_at: null // Clear completion timestamp
      })
      .eq('id', groupId);

    if (updateError) {
      console.error('❌ START PAGE: Failed to reset group:', updateError);
      redirect('/locations');
    } else {
      console.log('✅ START PAGE: Group reset to fresh start - riddle:', startRiddleId);
      // Update our local group object
      group.current_riddle_id = startRiddleId;
    }
  } catch (error) {
    console.error('💥 START PAGE: Error resetting group:', error);
    redirect('/locations');
  }

  // Step 8: NEW - Send confirmation and invite emails
  if (teamLeaderEmail || memberEmails.length > 0) {
    console.log('📧 START PAGE: Sending confirmation and invite emails...');
    try {
      const emailResponse = await fetch(`${baseUrl}/api/send-invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId,
          teamLeaderEmail: teamLeaderEmail || '',
          teamLeaderName: 'Team Leader', // Could be enhanced to get actual name
          teamName: teamName || 'Adventure Team',
          location: awaitedParams.location,
          mode: awaitedParams.mode,
          players: parseInt(playerCount || '2'),
          firstRiddleId: group.current_riddle_id,
          memberEmails: memberEmails
        }),
        cache: 'no-store'
      });

      if (emailResponse.ok) {
        const emailResult = await emailResponse.json();
        console.log('✅ START PAGE: Emails sent successfully:', emailResult);
      } else {
        const emailError = await emailResponse.text();
        console.error('⚠️ START PAGE: Email sending failed:', emailError);
        console.log('⚠️ START PAGE: Continuing with game start despite email failure');
      }
    } catch (emailError) {
      console.error('⚠️ START PAGE: Email error:', emailError);
      console.log('⚠️ START PAGE: Continuing with game start despite email failure');
      // Don't redirect on email failure - the game should still start
    }
  } else {
    console.log('📧 START PAGE: No emails to send (no team leader email or member emails provided)');
  }

  // Step 9: Redirect with cookie data as URL parameters
  console.log('🔄 START PAGE: Redirecting with cookie data in URL...');
  
  // Encode the data to pass via URL
  const cookieData = {
    groupId,
    userId,
    teamName: teamName || ''
  };
  
  const encodedData = btoa(JSON.stringify(cookieData));
  console.log('✅ START PAGE: Cookie data encoded for URL transfer');

  console.log("🎯 START PAGE: Payment successful - redirecting to first riddle with reset group:", group.current_riddle_id);
  
  // Redirect to the first riddle with cookie data
  redirect(`/riddle/${group.current_riddle_id}?game_data=${encodedData}`);
}