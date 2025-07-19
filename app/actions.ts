// app/actions.ts
'use server';

import { cookies } from 'next/headers';

export async function setGameCookies(groupId: string, userId: string, teamName: string) {
  console.log('🍪 SERVER ACTION: Setting game cookies...', { groupId, userId, teamName });
  
  try {
    const cookieStore = await cookies();
    
    const isProduction = process.env.NODE_ENV === "production";
    const expires = 60 * 60 * 24; // 24 hours
    
    console.log('🔧 SERVER ACTION: Cookie settings:', { isProduction, expires });

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

    console.log('✅ SERVER ACTION: Cookies set successfully:', { groupId, userId, teamName });
    return { success: true };

  } catch (error) {
    console.error('💥 SERVER ACTION: Error setting cookies:', error);
    throw error;
  }
}

export async function clearGameCookies() {
  console.log('🗑️ SERVER ACTION: Clearing game cookies...');
  
  try {
    const cookieStore = await cookies();
    
    cookieStore.delete('group_id');
    cookieStore.delete('user_id');
    cookieStore.delete('team_name');
    
    console.log('✅ SERVER ACTION: Game cookies cleared');
    return { success: true };
    
  } catch (error) {
    console.error('💥 SERVER ACTION: Error clearing cookies:', error);
    throw error;
  }
}