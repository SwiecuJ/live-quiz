import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface AnswerRow {
  id: string;
  player_id: string;
  question_id: string;
  selected_index: number;
  points_awarded: number;
}

/**
 * Returns a question for the room's quiz, plus whatever the caller needs to
 * render alongside it. The `questions` table has no public RLS policy (only
 * the service role can read it), so host and player screens go through this
 * route instead of querying Supabase directly with the anon key.
 *
 * Query params:
 * - `index=N` pins the response to a specific round. Callers pass the index
 *   they observed via realtime when they started the fetch: if this endpoint
 *   read `room.current_question_index` itself, a round advancing while the
 *   request is in flight would silently return a *later* round than the one
 *   asked about, which showed up as answers matched against the wrong
 *   question. Falls back to the room's current index only when omitted.
 * - `reveal=1` includes `correct_index`. The UI only passes it once a round
 *   has ended, so the answer never reaches a player mid-round.
 * - `playerId=<id>` (with `reveal=1`) adds that player's own answer as
 *   `yourAnswer`.
 * - `withRoundAnswers=1` (with `reveal=1`) adds every answer for this
 *   question as `roundAnswers`, highest scoring first, for the host's
 *   round summary.
 *
 * The last two exist so a client needs exactly one request per round rather
 * than chaining a second one off this response -- each extra sequential trip
 * is another chance for the round to move on mid-flight.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const searchParams = req.nextUrl.searchParams;
  const reveal = searchParams.get("reveal") === "1";
  const indexParam = searchParams.get("index");
  const playerId = searchParams.get("playerId");
  const withRoundAnswers = searchParams.get("withRoundAnswers") === "1";

  const supabase = createServiceRoleClient();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, quiz_id, current_question_index")
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

  const needsAnswers = reveal && (playerId !== null || withRoundAnswers);

  // Everything below depends only on the room, so it runs in parallel
  // rather than chaining. Answers are fetched per room (not per question)
  // so this doesn't have to wait on the question's id -- they're matched up
  // in memory below, and a room holds at most a few hundred rows.
  const loadAnswers = async (): Promise<AnswerRow[]> => {
    if (!needsAnswers) return [];
    const { data } = await supabase
      .from("answers")
      .select("id, player_id, question_id, selected_index, points_awarded")
      .eq("room_id", room.id);
    return (data as AnswerRow[] | null) ?? [];
  };

  const [questionRes, countRes, answers] = await Promise.all([
    supabase
      .from("questions")
      .select(columns)
      .eq("quiz_id", room.quiz_id)
      .eq("order_index", questionIndex)
      .single(),
    supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", room.quiz_id),
    loadAnswers(),
  ]);

  const question = questionRes.data as unknown as { id: string } | null;
  if (questionRes.error || !question) {
    return NextResponse.json({ error: "Nie znaleziono pytania." }, { status: 404 });
  }

  const yourAnswer =
    playerId !== null
      ? (answers.find((a) => a.player_id === playerId && a.question_id === question.id) ?? null)
      : null;

  const roundAnswers = withRoundAnswers
    ? answers
        .filter((a) => a.question_id === question.id)
        .sort((a, b) => b.points_awarded - a.points_awarded)
    : null;

  return NextResponse.json({
    question,
    totalQuestions: countRes.count ?? 0,
    yourAnswer,
    roundAnswers,
  });
}
