// app/waiting/[groupId]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import WaitingClient from "@/components/WaitingClient";
import RealTimeGameStart from "@/components/RealTimeGameStart";
import { SessionData } from "@/types/group";

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function WaitingPage({ params }: Props) {
  const { groupId } = await params;
  const cookieStore = await cookies();
  const supabase = await createClient();
  
  // Parse session cookie
  let sessionData: SessionData | null = null;
  try {
    const sessionCookie = cookieStore.get("riddlecity-session")?.value;
    if (sessionCookie) {
      const decoded = Buffer.from(sessionCookie, 'base64').toString('utf8');
      sessionData = JSON.parse(decoded);
    }
  } catch (e) {
    console.warn("Invalid session cookie in waiting page");
  }
  
  // If no valid session or wrong group, redirect
  if (!sessionData || sessionData.groupId !== groupId) {
    console.warn("No valid session for waiting page, redirecting to join");
    redirect(`/join/${groupId}`);
  }
  
  // Fetch current group state
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select(`
      id,
      team_name,
      current_riddle_id,
      game_started,
      finished,
      active,
      paid,
      player_limit,
      group_members(user_id, is_leader)
    `)
    .eq("id", groupId)
    .single();
  
  if (groupError || !group) {
    console.error("Group not found in waiting page:", groupError);
    redirect("/locations");
  }
  
  // Check if group is still valid
  if (!group.active || !group.paid) {
    redirect("/locations");
  }
  
  // If game has finished, redirect to completion
  if (group.finished) {
    redirect(`/adventure-complete/${groupId}`);
  }
  
  // If game has started, redirect to current riddle
  if (group.game_started && group.current_riddle_id) {
    redirect(`/riddle/${group.current_riddle_id}`);
  }
  
  // Verify user is actually a member
  const isMember = group.group_members?.some(
    (member) => member.user_id === sessionData!.userId
  );
  
  if (!isMember) {
    console.warn("User not a member, redirecting to join");
    redirect(`/join/${groupId}`);
  }
  
  const isLeader = group.group_members?.some(
    (member) => member.user_id === sessionData!.userId && member.is_leader
  );
  
  const memberCount = group.group_members?.length || 0;
  const teamName = group.team_name || sessionData.teamName || "Your Team";
  
  return (
    <main className="min-h-[100svh] md:min-h-dvh bg-neutral-900 text-white flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <Image
          src="/riddle-city-logo2.png"
          alt=""
          width={600}
          height={600}
          className="w-[420px] h-[420px] md:w-[700px] md:h-[700px] object-contain"
        />
      </div>
      
      {/* Top-left logo link */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
        <Link href="/">
          <Image
            src="/riddle-city-logo.png"
            alt="Riddle City Logo"
            width={60}
            height={60}
            className="md:w-[80px] md:h-[80px] drop-shadow-lg hover:scale-105 transition-transform duration-200"
          />
        </Link>
      </div>
      
      {/* Client-side poller with all necessary props */}
      <WaitingClient 
        groupId={groupId}
        initialTeamName={teamName}
        isLeader={isLeader}
        memberCount={memberCount}
        playerLimit={group.player_limit}
        userId={sessionData.userId}
      />
      
      {/* ✨ Real-time game start detection - automatically redirects when leader starts game */}
      <RealTimeGameStart groupId={groupId} />
    </main>
  );
}