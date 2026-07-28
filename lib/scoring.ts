const BASE_POINTS = 100;
const BONUS_POINTS = 900;

/**
 * Kahoot-style speed scoring: full bonus for an instant answer, decaying
 * linearly to a small base reward for an answer that lands right before
 * time runs out. Wrong or missing answers score 0.
 */
export function calculatePoints(
  isCorrect: boolean,
  answeredAtMs: number,
  questionStartAtMs: number,
  roundTimeSeconds: number
): number {
  if (!isCorrect) return 0;

  const limitMs = roundTimeSeconds * 1000;
  const elapsedMs = Math.min(Math.max(answeredAtMs - questionStartAtMs, 0), limitMs);
  const timeRemainingMs = limitMs - elapsedMs;
  const ratio = limitMs === 0 ? 0 : timeRemainingMs / limitMs;

  return Math.round(BASE_POINTS + BONUS_POINTS * ratio);
}
