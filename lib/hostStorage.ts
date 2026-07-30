"use client";

/**
 * Which rooms this device is hosting. There are no accounts in this app, so
 * "am I the host" is just a marker written when the room is created from
 * this device (or claimed later from the lobby).
 */
const key = (roomCode: string) => `live-quiz-host-${roomCode}`;

export function markAsHost(roomCode: string) {
  try {
    localStorage.setItem(key(roomCode), "1");
  } catch {
    // Private mode / storage disabled -- the lobby's "I'm hosting" button is
    // still there as a fallback.
  }
}

export function isMarkedHost(roomCode: string) {
  try {
    return localStorage.getItem(key(roomCode)) === "1";
  } catch {
    return false;
  }
}
