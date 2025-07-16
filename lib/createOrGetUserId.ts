// lib/createOrGetUserId.ts
import { cookies } from "next/headers";

export function getUserIdFromCookie(): string | null {
  const cookieStore = cookies();
  return cookieStore.get("user_id")?.value || null;
}
