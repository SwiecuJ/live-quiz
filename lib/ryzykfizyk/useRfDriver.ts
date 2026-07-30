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
  // Tracked only so the host can cut a phase short once everyone has acted;
  // nobody else needs the firehose. Append-only and tagged with the round,
  // so a round change can't leave a stale count behind.
  const [guessedPlayerIds, setGuessedPlayerIds] = useState<{ round: number; playerId: string }[]>(
    []
  );
  const [betPlayerIds, setBetPlayerIds] = useState<{ round: number; playerId: string }[]>([]);
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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rf_bets", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as { player_id: string; round_index: number };
          setBetPlayerIds((prev) => [...prev, { round: row.round_index, playerId: row.player_id }]);
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

  // Counted per player, not per bet: two bets from one person still means
  // one person has acted.
  const betThisRound = room
    ? new Set(betPlayerIds.filter((b) => b.round === room.current_round).map((b) => b.playerId))
        .size
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
  useEffect(() => {
    if (!isHost || !room || room.status !== "guessing") return;
    if (playerCount === 0 || guessedThisRound < playerCount) return;
    advance();
  }, [isHost, room, playerCount, guessedThisRound, advance]);

  // Same once everyone has staked something. Deliberately "at least one
  // bet" rather than "used both": most rounds people back a single number,
  // and waiting for a second one nobody intends to place would strand the
  // table. Anyone who would rather not bet at all is carried by the timer.
  useEffect(() => {
    if (!isHost || !room || room.status !== "betting") return;
    if (playerCount === 0 || betThisRound < playerCount) return;
    advance();
  }, [isHost, room, playerCount, betThisRound, advance]);

  return { remainingSeconds, fraction, guessedThisRound, betThisRound, advance };
}
