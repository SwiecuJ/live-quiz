import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { findQuestion } from "@/lib/ryzykfizyk/questions";
import { winningSlotKey, type Slot } from "@/lib/ryzykfizyk/betting";

export const runtime = "nodejs";

/**
 * The current round's question, and -- only once the answer is out -- the
 * number itself and which slot won.
 *
 * The real answer is withheld until the room reaches `reveal`. Questions
 * live in code, so without this route the whole pool would ship to the
 * browser and anyone could read the answer mid-round from the bundle.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const supabase = createServiceRoleClient();

  const { data: room, error } = await supabase
    .from("rf_rooms")
    .select("status, current_round, question_ids, slots")
    .eq("code", roomCode)
    .single();

  if (error || !room) {
    return NextResponse.json({ error: "Nie znaleziono pokoju." }, { status: 404 });
  }

  const questionIds = (room.question_ids ?? []) as string[];
  const questionId = questionIds[room.current_round];
  const question = questionId ? findQuestion(questionId) : undefined;

  if (!question) {
    return NextResponse.json({ question: null, totalRounds: questionIds.length });
  }

  const revealed = room.status === "reveal" || room.status === "finished";
  const slots = (room.slots ?? []) as Slot[];

  return NextResponse.json({
    question: { id: question.id, text: question.text, unit: question.unit ?? null },
    totalRounds: questionIds.length,
    answer: revealed ? question.answer : null,
    winningSlotKey: revealed && slots.length > 0 ? winningSlotKey(slots, question.answer) : null,
  });
}
