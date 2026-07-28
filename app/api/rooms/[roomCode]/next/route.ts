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
  if (room.status !== "round_result") {
    return NextResponse.json({ error: "Runda nie jest zakończona." }, { status: 409 });
  }

  const { count, error: countError } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", room.quiz_id);

  if (countError || count === null) {
    return NextResponse.json({ error: "Nie udało się pobrać liczby pytań." }, { status: 500 });
  }

  const nextIndex = room.current_question_index + 1;

  if (nextIndex >= count) {
    const { error } = await supabase
      .from("rooms")
      .update({ status: "finished", question_start_at: null })
      .eq("id", room.id);
    if (error) {
      return NextResponse.json({ error: "Nie udało się zakończyć quizu." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, finished: true });
  }

  const { error } = await supabase
    .from("rooms")
    .update({
      status: "in_progress",
      current_question_index: nextIndex,
      question_start_at: new Date().toISOString(),
    })
    .eq("id", room.id);

  if (error) {
    return NextResponse.json({ error: "Nie udało się przejść dalej." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, finished: false });
}
