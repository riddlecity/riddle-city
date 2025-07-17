import { cookies } from "next/headers";

export async function createOrGetUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("user_id")?.value || null;
}