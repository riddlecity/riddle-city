// lib/riddleProgress.ts
// Helper functions for tracking riddle completion progress

export type CompletionType = 'scan' | 'skip' | 'manual_answer';

interface RiddleProgressEntry {
  type: CompletionType;
  time: string; // ISO timestamp
}

export type RiddleProgress = {
  [riddleNumber: string]: RiddleProgressEntry;
};

/**
 * Add a riddle completion to the progress tracking
 * @param currentProgress Current riddle_progress JSONB object from database
 * @param riddleOrder The order/number of the riddle (1, 2, 3, etc.)
 * @param completionType How the riddle was completed
 * @returns Updated progress object to save to database
 */
export function addRiddleCompletion(
  currentProgress: RiddleProgress | null | undefined,
  riddleOrder: number,
  completionType: CompletionType
): RiddleProgress {
  const progress = currentProgress || {};
  
  progress[riddleOrder.toString()] = {
    type: completionType,
    time: new Date().toISOString()
  };
  
  return progress;
}

/**
 * Get riddle order number from riddle data
 * @param riddle Riddle object with order_index field
 * @returns The order number (order_index)
 */
export function getRiddleOrder(riddle: { order_index?: number | null }): number | null {
  return riddle.order_index ?? null;
}
