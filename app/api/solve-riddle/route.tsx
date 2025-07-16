import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { groupId, currentRiddleId } = await req.json();

  if (!groupId || !currentRiddleId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const supabase = createClient(cookies());

  // Get the next riddle ID from the current one
  const { data: currentRiddle, error: riddleError } = await supabase
    .from("riddles")
    .select("next_riddle_id")
    .eq("id", currentRiddleId)
    .single();

  if (riddleError || !currentRiddle?.next_riddle_id) {
    return NextResponse.json({ error: "Next riddle not found" }, { status: 400 });
  }

  // Update the group's current_riddle_id
  const { error: updateError } = await supabase
    .from("groups")
    .update({ current_riddle_id: currentRiddle.next_riddle_id })
    .eq("id", groupId);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }

  return NextResponse.json({ nextRiddleId: currentRiddle.next_riddle_id });
}
