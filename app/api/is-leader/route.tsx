import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { createOrGetUserId } from "@/lib/createOrGetUserId";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  
  const cookieStore = await cookies();
  const supabase = await createClient(); // Add await here
  const userId = createOrGetUserId();
  
  if (!groupId || !userId) {
    return NextResponse.json({ isLeader: false }, { status: 400 });
  }
  
  const { data: group } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .single();
    
  const isLeader = group?.created_by === userId;
  return NextResponse.json({ isLeader });
}