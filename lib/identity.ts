"use client";

/**
 * Who this browser is, across every game it plays. There are no accounts,
 * so identity is just an id generated once per device and kept in
 * localStorage -- enough to add someone's scores up over time without
 * asking them to sign in.
 *
 * Consequences worth knowing: the same person on two devices counts as two
 * players, and clearing site data starts them over. For a party quiz that
 * trade-off beats making everyone create an account.
 */
const DEVICE_KEY = "live-quiz-device-id";
const NICKNAME_KEY = "live-quiz-nickname";

function randomId() {
  // crypto.randomUUID only exists in a secure context, which rules it out
  // when the app is opened over plain http on a LAN address -- exactly how
  // it gets used when someone hosts from a laptop on the local Wi-Fi.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

export function getDeviceId(): string | null {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const fresh = randomId();
    localStorage.setItem(DEVICE_KEY, fresh);
    return fresh;
  } catch {
    // Storage blocked (private mode). The player can still play; they just
    // won't accumulate an all-time score.
    return null;
  }
}

export function getSavedNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveNickname(nickname: string) {
  try {
    localStorage.setItem(NICKNAME_KEY, nickname);
  } catch {
    // Not worth surfacing -- it only costs them a retype next time.
  }
}
