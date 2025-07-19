// app/riddlecity/[location]/[mode]/start/[sessionId]/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

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
    redirect('/riddlecity');
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
      redirect('/riddlecity');
    }

    stripeSession = await stripeResponse.json();
    console.log('✅ START PAGE: Stripe session retrieved:', JSON.stringify(stripeSession, null, 2));
  } catch (error) {
    console.error('💥 START PAGE: Error fetching Stripe session:', error);
    redirect('/riddlecity');
  }
  
  // Step 3: Verify payment was successful
  if (stripeSession.payment_status !== 'paid') {
    console.error('❌ START PAGE: Payment not completed - status:', stripeSession.payment_status);
    redirect('/riddlecity');
  }
  console.log('✅ START PAGE: Payment status confirmed as paid');

  // Step 4: Extract metadata from Stripe session
  const groupId = stripeSession.metadata?.group_id;
  const userId = stripeSession.metadata?.user_id;
  const teamName = stripeSession.metadata?.team_name;

  console.log("💳 START PAGE: Stripe session metadata extracted:", { groupId, userId, teamName });

  if (!groupId || !userId) {
    console.error('❌ START PAGE: Missing essential metadata from Stripe session');
    console.error('❌ START PAGE: groupId:', groupId, 'userId:', userId);
    redirect('/riddlecity');
  }
  console.log('✅ START PAGE: Essential metadata present');

  // Step 5: Verify the group exists and was created by this user
  console.log('🔍 START PAGE: Querying database for group...');
  let group;
  try {
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('id, current_riddle_id, track_id, created_by')
      .eq('id', groupId)
      .single();

    if (groupError) {
      console.error('❌ START PAGE: Database error querying group:', groupError);
      redirect('/riddlecity');
    }

    if (!groupData) {
      console.error('❌ START PAGE: Group not found in database with ID:', groupId);
      redirect('/riddlecity');
    }

    group = groupData;
    console.log('✅ START PAGE: Group found in database:', JSON.stringify(group, null, 2));

    if (group.created_by !== userId) {
      console.error('❌ START PAGE: User is not the creator of this group');
      console.error('❌ START PAGE: group.created_by:', group.created_by, 'userId:', userId);
      redirect('/riddlecity');
    }
    console.log('✅ START PAGE: User confirmed as group creator');
  } catch (error) {
    console.error('💥 START PAGE: Error querying group:', error);
    redirect('/riddlecity');
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
      redirect('/riddlecity');
    }

    if (!memberData?.is_leader) {
      console.error('❌ START PAGE: User is not marked as leader');
      console.error('❌ START PAGE: memberData:', memberData);
      redirect('/riddlecity');
    }
    console.log('✅ START PAGE: User confirmed as group leader');
  } catch (error) {
    console.error('💥 START PAGE: Error checking membership:', error);
    redirect('/riddlecity');
  }

  // Step 7: Mark group as paid
  console.log('💰 START PAGE: Marking group as paid...');
  try {
    const { error: updateError } = await supabase
      .from('groups')
      .update({ paid: true })
      .eq('id', groupId);

    if (updateError) {
      console.error('❌ START PAGE: Failed to mark group as paid:', updateError);
      // Continue anyway - the game can still work
    } else {
      console.log('✅ START PAGE: Group marked as paid successfully');
    }
  } catch (error) {
    console.error('💥 START PAGE: Error updating group payment status:', error);
    // Continue anyway
  }

  // Step 8: Set game cookies DIRECTLY (no API call)
  console.log('🍪 START PAGE: Setting game cookies directly...');
  try {
    const cookieStore = await cookies();
    
    const isProduction = process.env.NODE_ENV === "production";
    const expires = 60 * 60 * 24; // 24 hours
    
    console.log('🔧 START PAGE: Cookie settings:', { isProduction, expires });

    // Set essential game cookies
    cookieStore.set("group_id", groupId, {
      maxAge: expires,
      path: "/",
      sameSite: "lax",
      secure: isProduction,
      httpOnly: false, // Allow client-side access
    });

    cookieStore.set("user_id", userId, {
      maxAge: expires,
      path: "/",
      sameSite: "lax", 
      secure: isProduction,
      httpOnly: false,
    });

    // Set team name if provided
    if (teamName && teamName.trim()) {
      cookieStore.set("team_name", teamName.trim(), {
        maxAge: expires,
        path: "/",
        sameSite: "lax",
        secure: isProduction,
        httpOnly: false,
      });
    }

    console.log('✅ START PAGE: Cookies set directly:', { groupId, userId, teamName });

  } catch (error) {
    console.error('💥 START PAGE: Error setting cookies directly:', error);
    redirect('/riddlecity');
  }

  // Step 9: Final validation and redirect
  if (!group.current_riddle_id) {
    console.error('❌ START PAGE: No current_riddle_id found for group');
    redirect('/riddlecity');
  }

  console.log("🎯 START PAGE: Payment successful - redirecting to first riddle:", group.current_riddle_id);
  
  // Redirect to the first riddle
  redirect(`/riddle/${group.current_riddle_id}`);
}