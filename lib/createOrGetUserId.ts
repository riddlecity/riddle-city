// lib/createOrGetUserId.ts
import { cookies } from "next/headers";

export function createOrGetUserId(): string | null {
  const cookieStore = cookies();
  return cookieStore.get("user_id")?.value || null;
}
