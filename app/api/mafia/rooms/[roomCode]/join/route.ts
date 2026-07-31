import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { MAX_PLAYERS } from "@/lib/mafia/roles";

export const runtime = "nodejs";

/**
 * Joining goes through the server so the player can be handed a secret that
 * nobody else ever sees. Everything private afterwards -- their role, who
 * they picked at night -- is gated on presenting it again.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;

  let nickname = "";
  let deviceId: string | null = null;
  try {
    const body = await req.json();
    nickname = String(body?.nickname ?? "").trim().slice(0, 20);
    deviceId = body?.deviceId ?? null;
  } catch {
    // handled below by the empty-nickname check
  }
  if (!nickname) {
    return NextResponse.json({ error: "Podaj ksywkę." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: room, error: roomError } = await supabase
    .from("mf_rooms")
    .select("id, status")
    .eq("code", roomCode)
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: "Nie ma takiego miasta." }, { status: 404 });
  }
  if (room.status !== "lobby") {
    return NextResponse.json({ error: "Gra już się zaczęła." }, { status: 409 });
  }

  const { count } = await supabase
    .from("mf_players")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id);

  if ((count ?? 0) >= MAX_PLAYERS) {
    return NextResponse.json({ error: "Miasto pęka w szwach." }, { status: 409 });
  }

  const { data: player, error: playerError } = await supabase
    .from("mf_players")
    .insert({ room_id: room.id, nickname, device_id: deviceId })
    .select("id")
    .single();

  if (playerError || !player) {
    console.error("mafia: failed to add player", playerError);
    return NextResponse.json({ error: "Nie udało się dołączyć." }, { status: 500 });
  }

  const secret = randomUUID();
  const { error: secretError } = await supabase
    .from("mf_secrets")
    .insert({ player_id: player.id, room_id: room.id, secret });

  if (secretError) {
    // Without a secret this player could never see their own role, so undo
    // the join rather than leave them stuck in the lobby.
    await supabase.from("mf_players").delete().eq("id", player.id);
    console.error("mafia: failed to issue secret", secretError);
    return NextResponse.json({ error: "Nie udało się dołączyć." }, { status: 500 });
  }

  return NextResponse.json({ playerId: player.id, secret });
}
