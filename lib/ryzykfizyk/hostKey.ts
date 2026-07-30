"use client";

/**
 * How this device relates to a room:
 *   "screen" - drives the game and shows the board, but isn't a player
 *   "play"   - drives the game and sits at the table like everyone else
 *   null     - just a player (or nothing to do with this room)
 *
 * Room codes come from the same alphabet in both games, so the key is
 * namespaced to stop hosting a quiz from marking you host of a Ryzyk Fizyk
 * room that happens to share a code.
 */
export type RfHostMode = "screen" | "play";

const key = (roomCode: string) => `live-quiz-rf-host-${roomCode}`;

export function setRfHostMode(roomCode: string, mode: RfHostMode) {
  try {
    localStorage.setItem(key(roomCode), mode);
  } catch {
    // Private mode. The lobby's "I'm running this" button is the fallback.
  }
}

export function getRfHostMode(roomCode: string): RfHostMode | null {
  try {
    const value = localStorage.getItem(key(roomCode));
    return value === "screen" || value === "play" ? value : null;
  } catch {
    return null;
  }
}
