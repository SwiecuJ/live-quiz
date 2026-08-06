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
    allyPicks: {
      playerId: string;
      nickname: string;
      target: string | null;
      targetId: string | null;
    }[];
    myPick: string | null;
    nightBoard: {
      playerId: string;
      nickname: string;
      role: MafiaRole | null;
      targetId: string | null;
      target: string | null;
    }[];
  } = { role, allies: [], findings: [], allyPicks: [], myPick: null, nightBoard: [] };

  // What this player has already chosen in the phase that's currently open,
  // so a reload doesn't lose it.
  //
  // It has to follow the phase. Reading the night table during the vote hands
  // back last night's target, the screen takes that for a vote already cast,
  // and every button locks -- so nobody can vote and the town lynches nobody,
  // night after night.
  const pickTable =
    room.status === "noc" ? "mf_actions" : room.status === "glosowanie" ? "mf_votes" : null;
  if (pickTable) {
    const { data: ownPick } = await supabase
      .from(pickTable)
      .select("target_id")
      .eq("player_id", playerId)
      .eq("day_number", room.day_number)
      .maybeSingle();
    response.myPick = ownPick?.target_id ?? null;
  }

  // The dead watch the whole night: who moved, on whom, and as what. It's
  // the traditional consolation for being out, and it costs the living
  // nothing -- but it is the one place where every secret in the game is
  // handed over at once, so it goes out only to a player this route has
  // already matched to their secret AND found to be dead. A living player
  // asking for the same thing gets an empty board.
  if (room.status === "noc") {
    const { data: meRow } = await supabase
      .from("mf_players")
      .select("alive")
      .eq("id", playerId)
      .single();

    if (meRow && !meRow.alive) {
      const [{ data: actions }, { data: everyone }, { data: allRoles }] = await Promise.all([
        supabase
          .from("mf_actions")
          .select("player_id, target_id")
          .eq("room_id", room.id)
          .eq("day_number", room.day_number),
        supabase.from("mf_players").select("id, nickname").eq("room_id", room.id),
        supabase.from("mf_secrets").select("player_id, role").eq("room_id", room.id),
      ]);

      const nameById = new Map((everyone ?? []).map((p) => [p.id, p.nickname]));
      const roleById = new Map((allRoles ?? []).map((r) => [r.player_id, r.role as MafiaRole]));

      response.nightBoard = (actions ?? [])
        .map((a) => ({
          playerId: a.player_id,
          nickname: nameById.get(a.player_id) ?? "?",
          role: roleById.get(a.player_id) ?? null,
          targetId: a.target_id,
          target: a.target_id ? (nameById.get(a.target_id) ?? null) : null,
        }))
        // Mafia first: that's the row a spectator is actually waiting for.
        .sort((a, b) => Number(b.role === "mafia") - Number(a.role === "mafia"));
    }
  }

  if (role === "mafia") {
    const { data: allySecrets } = await supabase
      .from("mf_secrets")
      .select("player_id")
      .eq("room_id", room.id)
      .eq("role", "mafia");

    const allyIds = (allySecrets ?? []).map((a) => a.player_id).filter((id) => id !== playerId);
    if (allyIds.length > 0) {
      const [{ data: allies }, { data: picks }] = await Promise.all([
        supabase.from("mf_players").select("id, nickname").in("id", allyIds),
        supabase
          .from("mf_actions")
          .select("player_id, target_id")
          .in("player_id", allyIds)
          .eq("day_number", room.day_number),
      ]);

      response.allies = (allies ?? []).map((a) => a.nickname);

      // The crew has to agree on one name without being able to talk, so
      // each of them sees what the others have picked so far.
      const targetIds = (picks ?? []).map((p) => p.target_id).filter(Boolean) as string[];
      const { data: targets } = targetIds.length
        ? await supabase.from("mf_players").select("id, nickname").in("id", targetIds)
        : { data: [] };
      const nameById = new Map((targets ?? []).map((t) => [t.id, t.nickname]));
      const pickByAlly = new Map((picks ?? []).map((p) => [p.player_id, p.target_id]));

      // Ids as well as names: the crew's picks are drawn onto the tiles, so
      // the screen has to be able to match them to a player.
      response.allyPicks = (allies ?? []).map((a) => ({
        playerId: a.id,
        nickname: a.nickname,
        target: pickByAlly.get(a.id) ? (nameById.get(pickByAlly.get(a.id)!) ?? null) : null,
        targetId: pickByAlly.get(a.id) ?? null,
      }));
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
