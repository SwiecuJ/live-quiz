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

  // Guard the update on the exact state we just read: the host's auto-
  // advance timer and a manual button click can both fire close together,
  // and with rounds now ending in seconds a duplicate call is realistic.
  // Without this, two concurrent calls could each compute nextIndex from
  // the same starting point and the second write would double-advance
  // (skipping a round) or clobber the first. If zero rows match, someone
  // else already made this exact transition -- treat it as a no-op.
  if (nextIndex >= count) {
    const { data: updated, error } = await supabase
      .from("rooms")
      .update({ status: "finished", question_start_at: null })
      .eq("id", room.id)
      .eq("status", "round_result")
      .eq("current_question_index", room.current_question_index)
      .select();
    if (error) {
      return NextResponse.json({ error: "Nie udało się zakończyć quizu." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, finished: true, applied: (updated?.length ?? 0) > 0 });
  }

  const { data: updated, error } = await supabase
    .from("rooms")
    .update({
      status: "in_progress",
      current_question_index: nextIndex,
      question_start_at: new Date().toISOString(),
    })
    .eq("id", room.id)
    .eq("status", "round_result")
    .eq("current_question_index", room.current_question_index)
    .select();

  if (error) {
    return NextResponse.json({ error: "Nie udało się przejść dalej." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, finished: false, applied: (updated?.length ?? 0) > 0 });
}
