"use client";

import { useEffect, useState } from "react";

/**
 * Ticks down from `startAtIso` + `durationSeconds`, recomputed from wall
 * clock time rather than a local counter -- so host and every player phone
 * stay in sync off the same `question_start_at` timestamp regardless of
 * when each of them mounted or reconnected.
 *
 * `remainingMs` is derived fresh on every render from `now` instead of
 * being cached in state: caching it meant the very first render after a
 * new `startAtIso` arrived still showed the *previous* (often already
 * "done") value until an effect corrected it a tick later -- long enough
 * for the host's auto-end-round effect to fire immediately.
 */
export function useCountdown(startAtIso: string | null, durationSeconds: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = startAtIso ? Math.max(0, deadline(startAtIso, durationSeconds) - now) : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const fraction = durationSeconds > 0 ? Math.max(0, Math.min(1, remainingMs / (durationSeconds * 1000))) : 0;

  return { remainingMs, remainingSeconds, fraction, isDone: !!startAtIso && remainingMs <= 0 };
}

function deadline(startAtIso: string, durationSeconds: number) {
  return new Date(startAtIso).getTime() + durationSeconds * 1000;
}
