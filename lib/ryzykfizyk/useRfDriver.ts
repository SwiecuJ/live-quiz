"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useCountdown } from "@/lib/useCountdown";
import type { RfRoom, RfStatus } from "./types";

/** How long each phase runs before the host moves everyone on. */
export const PHASE_SECONDS: Record<RfStatus, number> = {
  lobby: 0,
  guessing: 45,
  betting: 30,
  reveal: 12,
  finished: 0,
};

/**
 * Runs the clock and the phase transitions. Same shape as the quiz's driver
 * and for the same reasons: the countdown is derived from the room's own
 * `phase_started_at` so every device agrees, and only the host sends the
 * transition -- though a duplicate would be harmless, since the server makes
 * each one conditional on the phase it's leaving.
 */
export function useRfDriver({
  roomCode,
  room,
  isHost,
  playerCount,
}: {
  roomCode: string;
  room: RfRoom | null;
  isHost: boolean;
  playerCount: number;
}) {
  // Guesses are only tracked so the host can cut the phase short once
  // everyone has typed a number; nobody else needs the firehose.
  const [guessedPlayerIds, setGuessedPlayerIds] = useState<{ round: number; playerId: string }[]>(
    []
  );
  const advancedKeyRef = useRef<string | null>(null);

  const phaseKey = room ? `${room.status}-${room.current_round}` : null;
  const phaseSeconds = room ? PHASE_SECONDS[room.status] : 0;

  const { remainingSeconds, fraction, isDone } = useCountdown(
    room && phaseSeconds > 0 ? room.phase_started_at : null,
    phaseSeconds
  );

  useEffect(() => {
    if (!isHost || !room?.id) return;
    const roomId = room.id;

    const channel = supabase
      .channel(`rf-driver-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rf_guesses", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as { player_id: string; round_index: number };
          setGuessedPlayerIds((prev) => [
            ...prev,
            { round: row.round_index, playerId: row.player_id },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isHost, room?.id]);

  const guessedThisRound = room
    ? new Set(
        guessedPlayerIds.filter((g) => g.round === room.current_round).map((g) => g.playerId)
      ).size
    : 0;

  const advance = useCallback(() => {
    if (!phaseKey) return;
    if (advancedKeyRef.current === phaseKey) return;
    advancedKeyRef.current = phaseKey;
    return fetch(`/api/rf/rooms/${roomCode}/advance`, { method: "POST" });
  }, [phaseKey, roomCode]);

  // Time's up for this phase.
  useEffect(() => {
    if (!isHost || !room || phaseSeconds === 0 || !isDone) return;
    advance();
  }, [isHost, room, phaseSeconds, isDone, advance]);

  // Everyone already typed a number, so there's nothing left to wait for.
  // Betting has no equivalent: choosing not to bet is a real move, and
  // there's no way to tell it apart from still thinking.
  useEffect(() => {
    if (!isHost || !room || room.status !== "guessing") return;
    if (playerCount === 0 || guessedThisRound < playerCount) return;
    advance();
  }, [isHost, room, playerCount, guessedThisRound, advance]);

  return { remainingSeconds, fraction, guessedThisRound, advance };
}
