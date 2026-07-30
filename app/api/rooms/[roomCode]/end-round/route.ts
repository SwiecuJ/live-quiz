import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { calculatePoints } from "@/lib/scoring";

export const runtime = "nodejs";

interface AnswerRow {
  id: string;
  player_id: string;
  question_id: string;
  room_id: string;
  selected_index: number;
  answered_at: string;
  points_awarded: number;
}

/**
 * Ends the current round: scores every answer for it, refreshes player
 * totals, and only then flips the room into `round_result`.
 *
 * Order matters. Flipping the status first (as a cheap "claim" against
 * duplicate calls) is what clients see over realtime, and they immediately
 * fetch their result -- so any scoring done after the flip is a race the
 * clients can lose, showing a round summary with 0 points. Scoring first
 * and flipping last means the status change is only ever observable once
 * the numbers behind it already exist.
 *
 * Losing the claim-first guard is safe because every write here is now
 * idempotent: answer points are a pure function of the answer, and player
 * totals are recomputed as the SUM of that player's answers rather than
 * `total + earned`. Two concurrent calls therefore compute identical
 * results, and the compare-and-swap on the final status update still lets
 * exactly one of them own the transition.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const supabase = createServiceRoleClient();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, quiz_id, status, current_question_index, question_start_at, round_time_seconds")
    .eq("code", roomCode)
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: "Nie znaleziono pokoju." }, { status: 404 });
  }
  if (room.status !== "in_progress") {
    // Already ended by another call -- nothing to do, and not an error.
    return NextResponse.json({ ok: true, applied: false });
  }
  if (!room.question_start_at) {
    return NextResponse.json({ error: "Brak czasu startu rundy." }, { status: 500 });
  }

  // One read of the room's answers serves both jobs below: scoring this
  // round, and recomputing totals across every round.
  const [questionRes, answersRes] = await Promise.all([
    supabase
      .from("questions")
      .select("id, correct_index")
      .eq("quiz_id", room.quiz_id)
      .eq("order_index", room.current_question_index)
      .single(),
    supabase
      .from("answers")
      .select("id, player_id, question_id, room_id, selected_index, answered_at, points_awarded")
      .eq("room_id", room.id),
  ]);

  const question = questionRes.data;
  if (questionRes.error || !question) {
    return NextResponse.json({ error: "Nie znaleziono pytania." }, { status: 500 });
  }
  if (answersRes.error) {
    return NextResponse.json({ error: "Nie udało się pobrać odpowiedzi." }, { status: 500 });
  }

  const allAnswers = (answersRes.data ?? []) as AnswerRow[];
  const questionStartAtMs = new Date(room.question_start_at).getTime();

  const scoredThisRound = allAnswers
    .filter((a) => a.question_id === question.id)
    .map((a) => ({
      ...a,
      points_awarded: calculatePoints(
        a.selected_index === question.correct_index,
        new Date(a.answered_at).getTime(),
        questionStartAtMs,
        room.round_time_seconds
      ),
    }));

  if (scoredThisRound.length > 0) {
    const { error } = await supabase
      .from("answers")
      .upsert(scoredThisRound, { onConflict: "id" });
    if (error) {
      console.error("end-round: failed to score answers", error);
      return NextResponse.json({ error: "Nie udało się zapisać punktów." }, { status: 500 });
    }
  }

  // Totals from scratch, using this round's freshly computed points in
  // place of whatever the rows held a moment ago.
  const freshPoints = new Map(scoredThisRound.map((a) => [a.id, a.points_awarded]));
  const totalByPlayer = new Map<string, number>();
  for (const answer of allAnswers) {
    const points = freshPoints.get(answer.id) ?? answer.points_awarded;
    totalByPlayer.set(answer.player_id, (totalByPlayer.get(answer.player_id) ?? 0) + points);
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, room_id, nickname, total_score")
    .eq("room_id", room.id);

  if (playersError) {
    console.error("end-round: failed to load players", playersError);
  } else if (players) {
    const changed = players
      .map((p) => ({ ...p, total_score: totalByPlayer.get(p.id) ?? 0 }))
      .filter((p, i) => p.total_score !== players[i].total_score);

    if (changed.length > 0) {
      const { error } = await supabase.from("players").upsert(changed, { onConflict: "id" });
      if (error) {
        console.error("end-round: failed to update player totals", error);
      }
    }
  }

  const { data: claimed, error: claimError } = await supabase
    .from("rooms")
    .update({ status: "round_result" })
    .eq("id", room.id)
    .eq("status", "in_progress")
    .eq("current_question_index", room.current_question_index)
    .select("id");

  if (claimError) {
    return NextResponse.json({ error: "Nie udało się zakończyć rundy." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, applied: (claimed?.length ?? 0) > 0 });
}
