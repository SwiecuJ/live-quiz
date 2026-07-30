import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Full end-of-game recap: every question plus every answer submitted for
 * this room. Used only by the host's final screen, once the quiz is
 * finished, to show a per-question top-3 breakdown. `questions` has no
 * public RLS policy, so this goes through the service role like the other
 * question routes -- player nicknames are looked up client-side from the
 * already-loaded `players` list instead of joining them here.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const supabase = createServiceRoleClient();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, quiz_id")
    .eq("code", roomCode)
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: "Nie znaleziono pokoju." }, { status: 404 });
  }

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, question_text, options, correct_index, order_index")
    .eq("quiz_id", room.quiz_id)
    .order("order_index", { ascending: true });

  if (questionsError) {
    return NextResponse.json({ error: "Nie udało się pobrać pytań." }, { status: 500 });
  }

  const { data: answers, error: answersError } = await supabase
    .from("answers")
    .select("player_id, question_id, selected_index, points_awarded")
    .eq("room_id", room.id);

  if (answersError) {
    return NextResponse.json({ error: "Nie udało się pobrać odpowiedzi." }, { status: 500 });
  }

  return NextResponse.json({ questions: questions ?? [], answers: answers ?? [] });
}
