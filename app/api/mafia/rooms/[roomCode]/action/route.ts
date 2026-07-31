import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * One endpoint for both things a player does: pick someone at night, and
 * vote someone out during the day. Which one it is follows from the room's
 * phase, so the client can't submit a night kill during the vote.
 *
 * Both go through the server because the night picks have to stay secret,
 * and because it's the only place the player's secret can be checked.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;

  let playerId = "";
  let secret = "";
  let targetId: string | null = null;
  try {
    const body = await req.json();
    playerId = String(body?.playerId ?? "");
    secret = String(body?.secret ?? "");
    targetId = body?.targetId ?? null;
  } catch {
    // handled below
  }
  if (!playerId || !secret) {
    return NextResponse.json({ error: "Brak danych." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: room } = await supabase
    .from("mf_rooms")
    .select("id, status, day_number")
    .eq("code", roomCode)
    .single();

  if (!room) return NextResponse.json({ error: "Nie ma takiego miasta." }, { status: 404 });

  const { data: mine } = await supabase
    .from("mf_secrets")
    .select("player_id, secret")
    .eq("player_id", playerId)
    .eq("room_id", room.id)
    .maybeSingle();

  if (!mine || mine.secret !== secret) {
    return NextResponse.json({ error: "Nie twoja karta." }, { status: 403 });
  }

  const { data: me } = await supabase
    .from("mf_players")
    .select("alive")
    .eq("id", playerId)
    .single();

  if (!me?.alive) {
    return NextResponse.json({ error: "Nie żyjesz. Oglądaj." }, { status: 409 });
  }

  // The target has to be someone still in the game.
  if (targetId) {
    const { data: target } = await supabase
      .from("mf_players")
      .select("alive, room_id")
      .eq("id", targetId)
      .maybeSingle();
    if (!target || target.room_id !== room.id || !target.alive) {
      return NextResponse.json({ error: "Ta osoba już nie gra." }, { status: 409 });
    }
  }

  const table = room.status === "noc" ? "mf_actions" : room.status === "glosowanie" ? "mf_votes" : null;
  if (!table) {
    return NextResponse.json({ error: "Nie ta pora." }, { status: 409 });
  }

  const { error } = await supabase
    .from(table)
    .upsert(
      { room_id: room.id, player_id: playerId, day_number: room.day_number, target_id: targetId },
      { onConflict: "player_id,day_number" }
    );

  if (error) {
    console.error("mafia: failed to record action", error);
    return NextResponse.json({ error: "Nie zapisało się." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
