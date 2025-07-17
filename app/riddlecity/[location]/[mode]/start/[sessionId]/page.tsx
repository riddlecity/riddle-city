// app/riddlecity/[location]/[mode]/start/[sessionId]/page.tsx

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';

export default async function StartPage({ params }: { params: { location: string; mode: string; sessionId: string } }) {
  const supabase = createClient();

  // Step 1: Fetch Stripe session
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });

  let stripeSession;
  try {
    stripeSession = await stripe.checkout.sessions.retrieve(params.sessionId, {
      expand: ['customer'],
    });
  } catch (error) {
    console.error('Failed to fetch Stripe session:', error);
    redirect('/');
  }

  const customerEmail = typeof stripeSession.customer === 'object' && stripeSession.customer?.email;

  if (!customerEmail) {
    console.error('Customer email not found in Stripe session');
    redirect('/');
  }

  // Step 2: Get Supabase user by email
  const { data: userProfile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', customerEmail)
    .single();

  if (error || !userProfile) {
    console.error('User not found in Supabase:', error);
    redirect('/');
  }

  const leaderId = userProfile.id;

  // Step 3: Create group in Supabase
  const { data: trackData, error: trackError } = await supabase
    .from('tracks')
    .select('id, start_riddle_id')
    .eq('location', params.location)
    .eq('mode', params.mode)
    .single();

  if (trackError || !trackData) {
    console.error('Track not found:', trackError);
    redirect('/');
  }

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      leader_id: leaderId,
      track_id: trackData.id,
      current_riddle_id: trackData.start_riddle_id,
    })
    .select('id')
    .single();

  if (groupError || !group) {
    console.error('Failed to create group:', groupError);
    redirect('/');
  }

  // Step 4: Add leader to group_members
  const { error: addMemberError } = await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: leaderId,
  });

  if (addMemberError) {
    console.error('Failed to add leader to group_members:', addMemberError);
    redirect('/');
  }

  // Step 5: Redirect to first riddle
  redirect(`/riddle/${trackData.start_riddle_id}`);
}
