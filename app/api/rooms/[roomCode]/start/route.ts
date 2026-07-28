import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

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
  if (room.status !== "lobby") {
    return NextResponse.json({ error: "Quiz już wystartował." }, { status: 409 });
  }

  const { data: firstQuestion, error: questionError } = await supabase
    .from("questions")
    .select("id")
    .eq("quiz_id", room.quiz_id)
    .eq("order_index", 0)
    .single();

  if (questionError || !firstQuestion) {
    return NextResponse.json({ error: "Quiz nie ma pytań." }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("rooms")
    .update({
      status: "in_progress",
      current_question_index: 0,
      question_start_at: new Date().toISOString(),
    })
    .eq("id", room.id);

  if (updateError) {
    return NextResponse.json({ error: "Nie udało się wystartować quizu." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
