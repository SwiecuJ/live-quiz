import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { findQuestion } from "@/lib/ryzykfizyk/questions";
import { buildSlots, resolveRound, type Bet, type Slot } from "@/lib/ryzykfizyk/betting";

export const runtime = "nodejs";

/**
 * Drives the room through its phases: lobby -> guessing -> betting ->
 * reveal -> (next round | finished).
 *
 * One route rather than four because every transition needs the same
 * treatment: read the room, act only if it is still in the phase we think
 * it is, and make the state change conditional on that phase so a repeated
 * or concurrent call no-ops instead of skipping a round. The host screen
 * fires these on timers, so duplicates are routine, not exotic.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const supabase = createServiceRoleClient();

  const { data: room, error } = await supabase
    .from("rf_rooms")
    .select("id, status, current_round, question_ids, slots")
    .eq("code", roomCode)
    .single();

  if (error || !room) {
    return NextResponse.json({ error: "Nie znaleziono pokoju." }, { status: 404 });
  }

  const questionIds = (room.question_ids ?? []) as string[];
  const round = room.current_round as number;

  // ---- lobby -> guessing --------------------------------------------
  if (room.status === "lobby") {
    const { count } = await supabase
      .from("rf_players")
      .select("id", { count: "exact", head: true })
      .eq("room_id", room.id);

    if (!count) {
      return NextResponse.json({ error: "Nikogo jeszcze nie ma w pokoju." }, { status: 409 });
    }

    const { data } = await supabase
      .from("rf_rooms")
      .update({ status: "guessing", current_round: 0, phase_started_at: new Date().toISOString() })
      .eq("id", room.id)
      .eq("status", "lobby")
      .select("id");

    return NextResponse.json({ ok: true, applied: (data?.length ?? 0) > 0 });
  }

  // ---- guessing -> betting ------------------------------------------
  if (room.status === "guessing") {
    const { data: guesses } = await supabase
      .from("rf_guesses")
      .select("player_id, value")
      .eq("room_id", room.id)
      .eq("round_index", round);

    const slots = buildSlots(
      (guesses ?? []).map((g) => ({ playerId: g.player_id, value: Number(g.value) }))
    );

    const { data } = await supabase
      .from("rf_rooms")
      .update({ status: "betting", slots, phase_started_at: new Date().toISOString() })
      .eq("id", room.id)
      .eq("status", "guessing")
      .eq("current_round", round)
      .select("id");

    return NextResponse.json({ ok: true, applied: (data?.length ?? 0) > 0 });
  }

  // ---- betting -> reveal (this is where money moves) -----------------
  if (room.status === "betting") {
    const question = findQuestion(questionIds[round]);
    if (!question) {
      return NextResponse.json({ error: "Nie znaleziono pytania." }, { status: 500 });
    }

    const slots = (room.slots ?? []) as Slot[];
    const { data: betRows } = await supabase
      .from("rf_bets")
      .select("player_id, slot_key, amount")
      .eq("room_id", room.id)
      .eq("round_index", round);

    const bets: Bet[] = (betRows ?? []).map((b) => ({
      playerId: b.player_id,
      slotKey: b.slot_key,
      amount: b.amount,
    }));

    const { deltas } = resolveRound(slots, bets, question.answer);

    // Balances are applied before the status flips, so nobody can read the
    // reveal screen and see stale money -- the same ordering the quiz needs
    // for its round scores.
    const { data: players } = await supabase
      .from("rf_players")
      .select("id, room_id, nickname, balance")
      .eq("room_id", room.id);

    const changed = (players ?? [])
      .map((p) => ({ ...p, balance: p.balance + (deltas[p.id] ?? 0) }))
      .filter((p, i) => p.balance !== (players ?? [])[i].balance);

    if (changed.length > 0) {
      const { error: payoutError } = await supabase
        .from("rf_players")
        .upsert(changed, { onConflict: "id" });
      if (payoutError) {
        console.error("rf: failed to pay out", payoutError);
        return NextResponse.json({ error: "Nie udało się rozliczyć rundy." }, { status: 500 });
      }
    }

    const { data } = await supabase
      .from("rf_rooms")
      .update({ status: "reveal", phase_started_at: new Date().toISOString() })
      .eq("id", room.id)
      .eq("status", "betting")
      .eq("current_round", round)
      .select("id");

    return NextResponse.json({ ok: true, applied: (data?.length ?? 0) > 0 });
  }

  // ---- reveal -> next round | finished -------------------------------
  if (room.status === "reveal") {
    const nextRound = round + 1;
    const finished = nextRound >= questionIds.length;

    const { data } = await supabase
      .from("rf_rooms")
      .update(
        finished
          ? { status: "finished", phase_started_at: null }
          : {
              status: "guessing",
              current_round: nextRound,
              slots: null,
              phase_started_at: new Date().toISOString(),
            }
      )
      .eq("id", room.id)
      .eq("status", "reveal")
      .eq("current_round", round)
      .select("id");

    return NextResponse.json({ ok: true, finished, applied: (data?.length ?? 0) > 0 });
  }

  return NextResponse.json({ ok: true, applied: false });
}
