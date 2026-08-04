import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { MAX_PLAYERS, BOT_DEVICE_ID } from "@/lib/mafia/roles";

export const runtime = "nodejs";

const BOT_NAMES = [
  "Zenek",
  "Krysia",
  "Mietek",
  "Bogna",
  "Rysiek",
  "Jadzia",
  "Heniek",
  "Stefa",
  "Wacek",
  "Lucyna",
  "Zdzisiek",
  "Marysia",
];

/**
 * Fills empty seats so one person can run a whole game alone. Mafia needs
 * six players, which is a lot of phones to borrow just to check that a
 * change works.
 *
 * Bots are marked by their device id and are handled entirely inside the
 * phase machine -- see the advance route, which picks for any bot that
 * hasn't acted by the time a phase closes.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;

  let count = 1;
  try {
    const body = await req.json();
    if (Number.isInteger(body?.count) && body.count > 0) count = Math.min(body.count, MAX_PLAYERS);
  } catch {
    // one bot by default
  }

  const supabase = createServiceRoleClient();

  const { data: room } = await supabase
    .from("mf_rooms")
    .select("id, status")
    .eq("code", roomCode)
    .single();

  if (!room) return NextResponse.json({ error: "Nie ma takiego miasta." }, { status: 404 });
  if (room.status !== "lobby") {
    return NextResponse.json({ error: "Gra już trwa." }, { status: 409 });
  }

  const { data: existing } = await supabase
    .from("mf_players")
    .select("nickname")
    .eq("room_id", room.id);

  const taken = new Set((existing ?? []).map((p) => p.nickname));
  const free = BOT_NAMES.filter((n) => !taken.has(n));
  const room_left = MAX_PLAYERS - (existing?.length ?? 0);
  const toAdd = free.slice(0, Math.min(count, room_left));

  if (toAdd.length === 0) {
    return NextResponse.json({ error: "Nie ma już miejsca przy stole." }, { status: 409 });
  }

  const { data: added, error } = await supabase
    .from("mf_players")
    .insert(
      // Ready from the start: a bot has no card to read, and leaving them
      // unready would stall the reveal phase forever.
      toAdd.map((nickname) => ({
        room_id: room.id,
        nickname,
        device_id: BOT_DEVICE_ID,
        ready: true,
      }))
    )
    .select("id");

  if (error || !added) {
    console.error("mafia: failed to add bots", error);
    return NextResponse.json({ error: "Nie udało się dosadzić botów." }, { status: 500 });
  }

  // Bots still need a secrets row -- that's where their role goes when the
  // cards are dealt.
  await supabase
    .from("mf_secrets")
    .insert(added.map((p) => ({ player_id: p.id, room_id: room.id, secret: randomUUID() })));

  return NextResponse.json({ added: added.length });
}
