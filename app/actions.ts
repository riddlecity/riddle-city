// app/actions.ts
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function setGameCookies(groupId: string, userId: string, teamName?: string) {
  const cookieStore = await cookies();
  
  const isProduction = process.env.NODE_ENV === "production";
  const expires = 60 * 60 * 24; // 24 hours

  // Set essential game cookies
  cookieStore.set("group_id", groupId, {
    maxAge: expires,
    path: "/",
    sameSite: "lax",
    secure: isProduction,
    httpOnly: false, // Allow client-side access for your game logic
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

  console.log("✅ Game cookies set successfully:", { 
    groupId, 
    userId, 
    teamName: teamName || 'Not provided' 
  });
}

export async function clearGameCookies() {
  const cookieStore = await cookies();
  
  // Clear all game-related cookies
  cookieStore.delete("group_id");
  cookieStore.delete("user_id");
  cookieStore.delete("team_name");
  
  console.log("🧹 Game cookies cleared");
}