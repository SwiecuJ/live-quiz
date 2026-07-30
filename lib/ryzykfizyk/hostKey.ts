/**
 * Room codes are drawn from the same alphabet for both games, so a quiz and
 * a Ryzyk Fizyk room could in principle share one. Namespacing the host
 * marker keeps hosting one from silently marking you host of the other.
 */
export function hostKeyFor(roomCode: string) {
  return `rf-${roomCode}`;
}
