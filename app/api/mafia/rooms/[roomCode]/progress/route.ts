import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * How many of the living have acted this phase -- counts only, never who or
 * on whom. The night table can't be public (the picks are the mystery), but
 * "4 z 7 gotowych" gives the table a pulse without leaking anything.
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

  const { count: alive } = await supabase
    .from("mf_players")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id)
    .eq("alive", true);

  // During the reveal "acted" means "has looked at their card".
  if (room.status === "role_reveal") {
    const { count: ready } = await supabase
      .from("mf_players")
      .select("id", { count: "exact", head: true })
      .eq("room_id", room.id)
      .eq("ready", true);
    return NextResponse.json({ acted: ready ?? 0, alive: alive ?? 0 });
  }

  const table = room.status === "noc" ? "mf_actions" : "mf_votes";
  const { count: acted } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id)
    .eq("day_number", room.day_number);

  return NextResponse.json({ acted: acted ?? 0, alive: alive ?? 0 });
}
