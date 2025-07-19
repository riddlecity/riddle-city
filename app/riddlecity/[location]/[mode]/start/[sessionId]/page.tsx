// app/riddlecity/[location]/[mode]/start/[sessionId]/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { setGameCookies } from '@/app/actions';

interface Props {
  params: Promise<{ location: string; mode: string; sessionId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function StartPage({ params, searchParams }: Props) {
  const awaitedParams = await params;
  const awaitedSearchParams = await searchParams;
  const supabase = await createClient();

  const stripeSessionId = awaitedSearchParams.session_id as string;
  const successFlag = awaitedSearchParams.success;

  console.log("🎮 Start page accessed:", {
    sessionId: stripeSessionId,
    success: successFlag,
    location: awaitedParams.location,
    mode: awaitedParams.mode
  });

  // Verify this is a successful payment
  if (!stripeSessionId || successFlag !== 'true') {
    console.error('❌ Invalid payment confirmation - redirecting to home');
    return redirect('/riddlecity');
  }

  try {
    // Fetch Stripe session data using our API
    const stripeResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/stripe-session?session_id=${stripeSessionId}`,
      { cache: 'no-store' } // Don't cache this request
    );

    if (!stripeResponse.ok) {
      console.error('❌ Failed to fetch Stripe session');
      return redirect('/riddlecity');
    }

    const stripeSession = await stripeResponse.json();
    
    // Verify payment was successful
    if (stripeSession.payment_status !== 'paid') {
      console.error('❌ Payment not completed');
      return redirect('/riddlecity');
    }

    // Extract metadata from Stripe session
    const groupId = stripeSession.metadata?.group_id;
    const userId = stripeSession.metadata?.user_id;
    const teamName = stripeSession.metadata?.team_name;

    console.log("💳 Stripe session metadata:", { groupId, userId, teamName });

    if (!groupId || !userId) {
      console.error('❌ Missing essential metadata from Stripe session');
      return redirect('/riddlecity');
    }

    // Verify the group exists and was created by this user
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, current_riddle_id, track_id, created_by')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      console.error('❌ Group not found in database:', groupError);
      return redirect('/riddlecity');
    }

    if (group.created_by !== userId) {
      console.error('❌ User is not the creator of this group');
      return redirect('/riddlecity');
    }

    // Verify user is marked as leader in group_members
    const { data: memberData, error: memberError } = await supabase
      .from('group_members')
      .select('is_leader')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (memberError || !memberData?.is_leader) {
      console.error('❌ User is not marked as leader:', memberError);
      return redirect('/riddlecity');
    }

    // Mark group as paid
    const { error: updateError } = await supabase
      .from('groups')
      .update({ paid: true })
      .eq('id', groupId);

    if (updateError) {
      console.error('❌ Failed to mark group as paid:', updateError);
      // Continue anyway - the game can still work
    }

    // Set game cookies using Server Action
    await setGameCookies(groupId, userId, teamName);

    console.log("✅ Payment successful - redirecting to first riddle");
    
    // Redirect to the first riddle
    return redirect(`/riddle/${group.current_riddle_id}`);

  } catch (error) {
    console.error('❌ Unexpected error in start page:', error);
    return redirect('/riddlecity');
  }
}