import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { MafiaRole } from "@/lib/mafia/roles";

export const runtime = "nodejs";

/**
 * Everything this player is allowed to know that nobody else is: their role,
 * who their fellow mafia are, and what their investigations turned up.
 *
 * POST rather than GET because it carries the secret -- a secret in a query
 * string ends up in logs and history.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;

  let playerId = "";
  let secret = "";
  try {
    const body = await req.json();
    playerId = String(body?.playerId ?? "");
    secret = String(body?.secret ?? "");
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
    .select("player_id, role, secret")
    .eq("player_id", playerId)
    .eq("room_id", room.id)
    .maybeSingle();

  // A wrong secret is indistinguishable from an unknown player on purpose.
  if (!mine || mine.secret !== secret) {
    return NextResponse.json({ error: "Nie twoja karta." }, { status: 403 });
  }

  const role = (mine.role ?? null) as MafiaRole | null;
  const response: {
    role: MafiaRole | null;
    allies: string[];
    findings: { nickname: string; isMafia: boolean }[];
  } = { role, allies: [], findings: [] };

  if (role === "mafia") {
    const { data: allySecrets } = await supabase
      .from("mf_secrets")
      .select("player_id")
      .eq("room_id", room.id)
      .eq("role", "mafia");

    const allyIds = (allySecrets ?? []).map((a) => a.player_id).filter((id) => id !== playerId);
    if (allyIds.length > 0) {
      const { data: allies } = await supabase
        .from("mf_players")
        .select("nickname")
        .in("id", allyIds);
      response.allies = (allies ?? []).map((a) => a.nickname);
    }
  }

  if (role === "detektyw") {
    const { data: checks } = await supabase
      .from("mf_actions")
      .select("target_id, day_number")
      .eq("room_id", room.id)
      .eq("player_id", playerId)
      .order("day_number");

    const targetIds = (checks ?? []).map((c) => c.target_id).filter(Boolean) as string[];
    if (targetIds.length > 0) {
      const [{ data: targets }, { data: targetRoles }] = await Promise.all([
        supabase.from("mf_players").select("id, nickname").in("id", targetIds),
        supabase.from("mf_secrets").select("player_id, role").in("player_id", targetIds),
      ]);
      const nameById = new Map((targets ?? []).map((t) => [t.id, t.nickname]));
      const roleById = new Map((targetRoles ?? []).map((t) => [t.player_id, t.role]));
      response.findings = targetIds.map((id) => ({
        nickname: nameById.get(id) ?? "?",
        isMafia: roleById.get(id) === "mafia",
      }));
    }
  }

  return NextResponse.json(response);
}
