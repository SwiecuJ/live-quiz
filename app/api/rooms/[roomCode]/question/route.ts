import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Returns a question for the room's quiz. The `questions` table has no
 * public RLS policy (only the service role can read it), so both host and
 * player screens fetch questions through this route instead of querying
 * Supabase directly with the anon key. `correct_index` is only included
 * when `?reveal=1` is passed, which the UI only does once a round has
 * ended -- keeping the answer out of the response while the round timer
 * is still running.
 *
 * `?index=N` pins the response to a specific round. Callers should always
 * pass the index they observed via realtime at the moment they started the
 * fetch: if this endpoint instead read room.current_question_index itself,
 * a round that advances while the request is still in flight (real mobile
 * latency, or the auto-advance timer) would make the response silently
 * drift to a *later* round than the one the caller actually asked about --
 * which surfaced as answers looking up the wrong question_id and getting
 * shown as "no answer". Falls back to the room's current index only when
 * `index` is omitted.
 *
 * `?playerId=<id>` (only meaningful together with `?reveal=1`) folds the
 * caller's own answer for this question into the same response as
 * `yourAnswer`, saving a second sequential round trip. That second request
 * was exactly the kind of thing that, on a slow connection, could still be
 * in flight when the round moved on -- shrinking the reveal fetch to one
 * request cuts that window roughly in half.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const reveal = req.nextUrl.searchParams.get("reveal") === "1";
  const indexParam = req.nextUrl.searchParams.get("index");
  const playerId = req.nextUrl.searchParams.get("playerId");

  const supabase = createServiceRoleClient();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", roomCode)
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: "Nie znaleziono pokoju." }, { status: 404 });
  }

  const questionIndex = indexParam !== null ? Number(indexParam) : room.current_question_index;
  if (!Number.isInteger(questionIndex) || questionIndex < 0) {
    return NextResponse.json({ error: "Quiz jeszcze się nie rozpoczął." }, { status: 409 });
  }

  const columns = reveal
    ? "id, question_text, options, correct_index, order_index"
    : "id, question_text, options, order_index";

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select(columns)
    .eq("quiz_id", room.quiz_id)
    .eq("order_index", questionIndex)
    .single();

  if (questionError || !question) {
    return NextResponse.json({ error: "Nie znaleziono pytania." }, { status: 404 });
  }

  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", room.quiz_id);

  let yourAnswer: { selected_index: number; points_awarded: number } | null = null;
  if (reveal && playerId) {
    const { data: answer } = await supabase
      .from("answers")
      .select("selected_index, points_awarded")
      .eq("player_id", playerId)
      .eq("question_id", (question as unknown as { id: string }).id)
      .maybeSingle();
    yourAnswer = answer ?? null;
  }

  return NextResponse.json({
    question,
    totalQuestions: count ?? 0,
    questionStartAt: room.question_start_at,
    roundTimeSeconds: room.round_time_seconds,
    yourAnswer,
  });
}
