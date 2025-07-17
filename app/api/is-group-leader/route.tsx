// /app/api/is-group-leader/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { groupId } = await req.json();
  const cookieStore = await cookies();
  const supabase = await createClient();
  
  const userId = cookieStore.get("user_id")?.value;
  
  if (!groupId || !userId) {
    return NextResponse.json({ isLeader: false, error: "Missing info" }, { status: 400 });
  }
  
  const { data: group, error } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .single();
    
  if (error || !group) {
    return NextResponse.json({ isLeader: false, error: "Group not found" }, { status: 404 });
  }
  
  return NextResponse.json({ isLeader: group.created_by === userId });
}