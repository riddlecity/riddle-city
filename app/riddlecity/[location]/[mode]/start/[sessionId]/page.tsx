// app/riddlecity/[location]/[mode]/start/[sessionId]/page.tsx
import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers'; // Import cookies for setting them

interface Props {
  params: Promise<{ location: string; mode: string; sessionId: string }>;
}

export default async function StartPage({ params }: Props) {
  const awaitedParams = await params;
  // FIX: Await the cookies() call
  const cookieStore = await cookies(); // <--- This line needs 'await'

  const supabase = await createClient(); // Await the creation of the Supabase client

  // Step 1: Fetch Stripe session
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil',
  });

  let stripeSession;
  try {
    stripeSession = await stripe.checkout.sessions.retrieve(awaitedParams.sessionId, {
      expand: ['customer'],
    });
  } catch (error) {
    console.error('❌ Failed to fetch Stripe session:', error);
    return redirect('/');
  }

  // --- Extract essential IDs from Stripe session metadata ---
  const groupIdFromMetadata = stripeSession.metadata?.group_id;
  const userIdFromMetadata = stripeSession.metadata?.user_id;
  const teamNameFromMetadata = stripeSession.metadata?.team_name; // Assuming team_name is also in metadata

  if (!groupIdFromMetadata || !userIdFromMetadata || !teamNameFromMetadata) {
    console.error('❌ Essential metadata (group_id, user_id, team_name) not found in Stripe session.');
    return redirect('/'); // Redirect if essential metadata is missing
  }

  // --- Set the cookies here, directly in the Server Component's execution context ---
  // This ensures they are set *after* the Stripe redirect completes
  const isProduction = process.env.NODE_ENV === "production";
  const expires = 60 * 60 * 24; // 24 hours

  // Now cookieStore is the actual object, so .set() exists
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

  // --- Verify existing group and leader status (instead of creating new ones) ---
  // We assume the group and leader member were already created by /api/checkout-session
  const { data: existingGroup, error: groupFetchError } = await supabase
    .from('groups')
    .select('id, current_riddle_id, track_id') // Select track_id too, if needed for anti-cheat
    .eq('id', groupIdFromMetadata)
    .eq('created_by', userIdFromMetadata) // Verify this group was created by this user
    .single();

  if (groupFetchError || !existingGroup) {
    console.error('❌ Existing group not found or not created by this leader:', groupFetchError);
    return redirect('/'); // Redirect if the expected group isn't found
  }

  // Verify leader status in group_members (optional, but good for robustness)
  const { data: memberData, error: memberFetchError } = await supabase
    .from('group_members')
    .select('is_leader')
    .eq('group_id', groupIdFromMetadata)
    .eq('user_id', userIdFromMetadata)
    .single();

  if (memberFetchError || !memberData || !memberData.is_leader) {
    console.error('❌ User is not recognized as leader for this group:', memberFetchError);
    // This scenario might indicate a data inconsistency or an attempt to bypass.
    // You might want a different redirect or error message here.
    return redirect('/');
  }

  // ✅ Redirect to the first riddle page using the current_riddle_id from the fetched group
  return redirect(`/riddle/${existingGroup.current_riddle_id}`);
}