// Pseudocode for the scan handler
export default async function ScanRiddle({ params }) {
  const { riddleId } = params;
  const groupId = getGroupIdFromCookies();
  
  // Get group's current riddle
  const group = await getGroup(groupId);
  const currentRiddleId = group.current_riddle_id;
  
  // Get the next riddle for this group
  const nextRiddleId = await getNextRiddleId(currentRiddleId);
  
  if (riddleId === nextRiddleId) {
    // ✅ Correct next riddle - advance the group
    await updateGroup(groupId, { current_riddle_id: riddleId });
    redirect(`/riddle/${riddleId}`);
  } else if (riddleId === currentRiddleId) {
    // ✅ Same riddle - just redirect (no DB update)
    redirect(`/riddle/${riddleId}`);
  } else {
    // ❌ Wrong riddle - redirect to current riddle
    redirect(`/riddle/${currentRiddleId}`);
  }
}