import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Returns the room's current question. The `questions` table has no public
 * RLS policy (only the service role can read it), so both host and player
 * screens fetch the question through this route instead of querying
 * Supabase directly with the anon key. `correct_index` is only included
 * when `?reveal=1` is passed, which the UI only does once a round has
 * ended -- keeping the answer out of the response while the round timer
 * is still running.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const reveal = req.nextUrl.searchParams.get("reveal") === "1";

  const supabase = createServiceRoleClient();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", roomCode)
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: "Nie znaleziono pokoju." }, { status: 404 });
  }
  if (room.current_question_index < 0) {
    return NextResponse.json({ error: "Quiz jeszcze się nie rozpoczął." }, { status: 409 });
  }

  const columns = reveal
    ? "id, question_text, options, correct_index, order_index"
    : "id, question_text, options, order_index";

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select(columns)
    .eq("quiz_id", room.quiz_id)
    .eq("order_index", room.current_question_index)
    .single();

  if (questionError || !question) {
    return NextResponse.json({ error: "Nie znaleziono pytania." }, { status: 404 });
  }

  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", room.quiz_id);

  return NextResponse.json({
    question,
    totalQuestions: count ?? 0,
    questionStartAt: room.question_start_at,
    roundTimeSeconds: room.round_time_seconds,
  });
}
