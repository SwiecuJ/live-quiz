import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { BOT_DEVICE_ID } from "@/lib/mafia/roles";

export const runtime = "nodejs";

/**
 * How many of the living have acted this phase -- counts only, never who or
 * on whom. The night table can't be public (the picks are the mystery), but
 * "4 z 7 gotowych" gives the table a pulse without leaking anything.
 *
 * Bots are left out of both sides of the ratio. They don't tap -- their
 * choices are made for them when the phase closes -- so counting them would
 * mean the phase could never reach "everyone's done" and would hang waiting
 * for players who aren't there.
 *
 * The counts come back stamped with the phase they were measured in. A count
 * that outlives its phase is worse than no count at all: "everyone has acted"
 * left over from the night would slam the vote shut before a single person
 * could cast one.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const supabase = createServiceRoleClient();

  const { data: room } = await supabase
    .from("mf_rooms")
    .select("id, status, day_number")
    .eq("code", roomCode)
    .single();

  if (!room) return NextResponse.json({ error: "Nie ma takiego miasta." }, { status: 404 });

  const phase = `${room.status}-${room.day_number}`;
  const humans = <T extends { device_id: string | null }>(rows: T[] | null) =>
    (rows ?? []).filter((p) => p.device_id !== BOT_DEVICE_ID).length;

  const { data: aliveRows } = await supabase
    .from("mf_players")
    .select("id, device_id")
    .eq("room_id", room.id)
    .eq("alive", true);
  const alive = humans(aliveRows);

  // During the reveal "acted" means "has looked at their card".
  if (room.status === "role_reveal") {
    const { data: readyRows } = await supabase
      .from("mf_players")
      .select("id, device_id")
      .eq("room_id", room.id)
      .eq("ready", true);
    return NextResponse.json({ phase, acted: humans(readyRows), alive });
  }

  const table = room.status === "noc" ? "mf_actions" : "mf_votes";
  const { count: acted } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id)
    .eq("day_number", room.day_number);

  return NextResponse.json({ phase, acted: acted ?? 0, alive });
}
