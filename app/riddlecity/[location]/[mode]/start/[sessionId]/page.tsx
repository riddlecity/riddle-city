// app/riddlecity/[location]/[mode]/start/[sessionId]/page.tsx
import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

interface Props {
  params: Promise<{ location: string; mode: string; sessionId: string }>; // This was already Promise
  // FIX: Make searchParams a Promise as well
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function StartPage({ params, searchParams }: Props) {
  const awaitedParams = await params;
  // FIX: Await searchParams as well
  const awaitedSearchParams = await searchParams; // <-- Add this line
  const cookieStore = await cookies();

  const supabase = await createClient();

  // --- CRITICAL FIX HERE ---
  // Use awaitedSearchParams to access the session_id
  const stripeCheckoutSessionId = awaitedSearchParams.session_id;

  if (!stripeCheckoutSessionId || typeof stripeCheckoutSessionId !== 'string') {
    console.error('❌ Missing or invalid Stripe checkout session ID in URL.');
    return redirect('/');
  }

  // Step 1: Fetch Stripe session using the CORRECT ID
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil',
  });

  let stripeSession;
  try {
    stripeSession = await stripe.checkout.sessions.retrieve(stripeCheckoutSessionId, {
      expand: ['customer'],
    });
  } catch (error) {
    console.error('❌ Failed to fetch Stripe session:', error);
    return redirect('/');
  }

  // Extract essential IDs from Stripe session metadata
  const groupIdFromMetadata = stripeSession.metadata?.group_id;
  const userIdFromMetadata = stripeSession.metadata?.user_id;
  const teamNameFromMetadata = stripeSession.metadata?.team_name;

  if (!groupIdFromMetadata || !userIdFromMetadata || !teamNameFromMetadata) {
    console.error('❌ Essential metadata (group_id, user_id, team_name) not found in Stripe session.');
    return redirect('/');
  }

  // Set the cookies using the IDs from metadata
  const isProduction = process.env.NODE_ENV === "production";
  const expires = 60 * 60 * 24;

  cookieStore.set("group_id", groupIdFromMetadata, {
    maxAge: expires,
    path: "/",
    sameSite: "lax",
    secure: isProduction,
  });

  cookieStore.set("user_id", userIdFromMetadata, {
    maxAge: expires,
    path: "/",
    sameSite: "lax",
    secure: isProduction,
  });

  cookieStore.set("team_name", teamNameFromMetadata, {
    maxAge: expires,
    path: "/",
    sameSite: "lax",
    secure: isProduction,
  });

  console.log("✅ Cookies set on StartPage:", {
    groupId: groupIdFromMetadata,
    userId: userIdFromMetadata,
    teamName: teamNameFromMetadata
  });

  // Verify existing group and leader status
  const { data: existingGroup, error: groupFetchError } = await supabase
    .from('groups')
    .select('id, current_riddle_id, track_id')
    .eq('id', groupIdFromMetadata)
    .eq('created_by', userIdFromMetadata)
    .single();

  if (groupFetchError || !existingGroup) {
    console.error('❌ Existing group not found or not created by this leader:', groupFetchError);
    return redirect('/');
  }

  const { data: memberData, error: memberFetchError } = await supabase
    .from('group_members')
    .select('is_leader')
    .eq('group_id', groupIdFromMetadata)
    .eq('user_id', userIdFromMetadata)
    .single();

  if (memberFetchError || !memberData || !memberData.is_leader) {
    console.error('❌ User is not recognized as leader for this group:', memberFetchError);
    return redirect('/');
  }

  // Redirect to the first riddle page using the current_riddle_id from the fetched group
  return redirect(`/riddle/${existingGroup.current_riddle_id}`);
}