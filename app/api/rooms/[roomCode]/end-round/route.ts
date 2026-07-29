import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { calculatePoints } from "@/lib/scoring";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const supabase = createServiceRoleClient();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", roomCode)
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: "Nie znaleziono pokoju." }, { status: 404 });
  }
  if (room.status !== "in_progress") {
    return NextResponse.json({ error: "Runda nie jest aktywna." }, { status: 409 });
  }
  if (!room.question_start_at) {
    return NextResponse.json({ error: "Brak czasu startu rundy." }, { status: 500 });
  }

  // Claim the round atomically before scoring anything. The timeout timer
  // and the "everyone answered" check can both fire close together, and
  // without this a duplicate call would add every player's points twice --
  // player_score updates below are `current + earned`, not idempotent. If
  // zero rows come back, another call already claimed this round; treat it
  // as a no-op instead of scoring a second time.
  const { data: claimed, error: claimError } = await supabase
    .from("rooms")
    .update({ status: "round_result" })
    .eq("id", room.id)
    .eq("status", "in_progress")
    .eq("current_question_index", room.current_question_index)
    .select();

  if (claimError) {
    return NextResponse.json({ error: "Nie udało się zakończyć rundy." }, { status: 500 });
  }
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ ok: true, applied: false });
  }

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("id, correct_index")
    .eq("quiz_id", room.quiz_id)
    .eq("order_index", room.current_question_index)
    .single();

  if (questionError || !question) {
    return NextResponse.json({ error: "Nie znaleziono pytania." }, { status: 500 });
  }

  const { data: answers, error: answersError } = await supabase
    .from("answers")
    .select("*")
    .eq("room_id", room.id)
    .eq("question_id", question.id);

  if (answersError) {
    return NextResponse.json({ error: "Nie udało się pobrać odpowiedzi." }, { status: 500 });
  }

  const questionStartAtMs = new Date(room.question_start_at).getTime();

  const scored = (answers ?? []).map((answer) => {
    const isCorrect = answer.selected_index === question.correct_index;
    const answeredAtMs = new Date(answer.answered_at).getTime();
    const points = calculatePoints(
      isCorrect,
      answeredAtMs,
      questionStartAtMs,
      room.round_time_seconds
    );
    return { ...answer, points_awarded: points };
  });

  for (const answer of scored) {
    const { error } = await supabase
      .from("answers")
      .update({ points_awarded: answer.points_awarded })
      .eq("id", answer.id);
    if (error) {
      console.error("end-round: failed to update answer score", error);
    }
  }

  const playerIds = [...new Set(scored.map((a) => a.player_id))];
  if (playerIds.length > 0) {
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, total_score")
      .in("id", playerIds);

    if (!playersError && players) {
      for (const player of players) {
        const earned = scored
          .filter((a) => a.player_id === player.id)
          .reduce((sum, a) => sum + a.points_awarded, 0);

        const { error } = await supabase
          .from("players")
          .update({ total_score: player.total_score + earned })
          .eq("id", player.id);
        if (error) {
          console.error("end-round: failed to update player score", error);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, applied: true });
}
