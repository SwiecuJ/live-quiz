"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useCountdown } from "@/lib/useCountdown";
import { NEXT_QUESTION_DELAY_SECONDS } from "@/lib/constants";
import type { Room } from "@/lib/types";

/**
 * The parts of running a game that are identical whether it's driven from a
 * laptop on the TV or from the organiser's phone: the round countdown, how
 * many players have answered, and the two automatic transitions (end the
 * round, move on to the next one).
 *
 * `isDriver` decides whether this client actually sends those control calls.
 * Normally exactly one client does. A second one would be harmless anyway --
 * every transition is a compare-and-swap server-side, so a duplicate call
 * no-ops instead of skipping a round or double-scoring.
 */
export function useGameDriver({
  roomCode,
  room,
  questionId,
  playerCount,
  isDriver,
}: {
  roomCode: string;
  room: Room | null;
  /** Current round's question id, or null while it's still loading. */
  questionId: string | null;
  playerCount: number;
  isDriver: boolean;
}) {
  // Append-only, each entry tagged with its question. Deliberately never
  // reset per round: filtering by the current question at read time is what
  // keeps the count correct, whereas clearing it in one effect and reading
  // it in another gave a stale "everyone answered" on the first render of a
  // new round, which ended that round instantly.
  const [answerEvents, setAnswerEvents] = useState<{ question_id: string }[]>([]);
  // Tagged with the round it belongs to. It's set from an effect and so lags
  // `room` by one render; without the tag, the previous round's timestamp
  // read as "the delay already elapsed" and fired the auto-advance
  // immediately, cutting the round result short.
  const [resultRevealed, setResultRevealed] = useState<{ key: string; at: string } | null>(null);

  const endedRoundKeyRef = useRef<string | null>(null);
  const advancedKeyRef = useRef<string | null>(null);
  const revealedKeyRef = useRef<string | null>(null);

  const roundKey = room ? `${room.status}-${room.current_question_index}` : null;

  // Only the driver acts on "everyone answered", so only the driver needs
  // the firehose of answer inserts.
  useEffect(() => {
    if (!isDriver || !room?.id) return;
    const roomId = room.id;

    const channel = supabase
      .channel(`driver-answers-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "answers", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as { question_id: string };
          setAnswerEvents((prev) => [...prev, { question_id: row.question_id }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDriver, room?.id]);

  useEffect(() => {
    if (!room || room.status !== "round_result" || !roundKey) return;
    if (revealedKeyRef.current === roundKey) return;
    revealedKeyRef.current = roundKey;
    setResultRevealed({ key: roundKey, at: new Date().toISOString() });
  }, [room, roundKey]);

  const { remainingSeconds, fraction, isDone } = useCountdown(
    room?.status === "in_progress" ? room.question_start_at : null,
    room?.round_time_seconds ?? 20
  );

  const nextCountdown = useCountdown(
    room?.status === "round_result" && resultRevealed?.key === roundKey ? resultRevealed.at : null,
    NEXT_QUESTION_DELAY_SECONDS
  );

  const answeredCount = questionId
    ? answerEvents.filter((e) => e.question_id === questionId).length
    : 0;

  const endRoundOnce = useCallback(() => {
    if (!isDriver || !roundKey) return;
    if (endedRoundKeyRef.current === roundKey) return;
    endedRoundKeyRef.current = roundKey;
    fetch(`/api/rooms/${roomCode}/end-round`, { method: "POST" });
  }, [isDriver, roundKey, roomCode]);

  // Time ran out.
  useEffect(() => {
    if (!room || room.status !== "in_progress" || !isDone) return;
    endRoundOnce();
  }, [room, isDone, endRoundOnce]);

  // Everyone already answered, so there's nothing left to wait for.
  useEffect(() => {
    if (!room || room.status !== "in_progress" || !questionId) return;
    if (playerCount === 0 || answeredCount < playerCount) return;
    endRoundOnce();
  }, [room, questionId, playerCount, answeredCount, endRoundOnce]);

  /** Move to the next round now. Safe to call twice; the second is a no-op. */
  const advanceOnce = useCallback(() => {
    if (!roundKey) return;
    if (advancedKeyRef.current === roundKey) return;
    advancedKeyRef.current = roundKey;
    return fetch(`/api/rooms/${roomCode}/next`, { method: "POST" });
  }, [roundKey, roomCode]);

  useEffect(() => {
    if (!isDriver || !room || room.status !== "round_result" || !nextCountdown.isDone) return;
    advanceOnce();
  }, [isDriver, room, nextCountdown.isDone, advanceOnce]);

  return {
    remainingSeconds,
    fraction,
    answeredCount,
    nextInSeconds: nextCountdown.remainingSeconds,
    advanceOnce,
  };
}
