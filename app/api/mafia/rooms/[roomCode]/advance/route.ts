import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { dealRoles, checkWinner, MIN_PLAYERS, type MafiaRole } from "@/lib/mafia/roles";

export const runtime = "nodejs";

interface PlayerRow {
  id: string;
  nickname: string;
  alive: boolean;
}

/** Most-picked target. A tie means no clear decision, so nothing happens. */
function tally(rows: { target_id: string | null }[]): string | null {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.target_id) continue;
    counts.set(row.target_id, (counts.get(row.target_id) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  let tied = false;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
      tied = false;
    } else if (count === bestCount) {
      tied = true;
    }
  }
  return tied ? null : best;
}

/**
 * Walks the town through night -> morning -> vote -> verdict, and back.
 *
 * Every transition is conditional on the phase it's leaving, so the host's
 * timers can fire twice without killing two people or skipping a day.
 */
export async function POST(
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

  const { data: playerRows } = await supabase
    .from("mf_players")
    .select("id, nickname, alive")
    .eq("room_id", room.id)
    .order("created_at");
  const players = (playerRows ?? []) as PlayerRow[];
  const alive = players.filter((p) => p.alive);
  // Wide enough to reach the whole space of composed scenes; the narration
  // splits this one number across three independent beats.
  const seed = Math.floor(Math.random() * 1_000_000);

  const roleMap = async () => {
    const { data } = await supabase
      .from("mf_secrets")
      .select("player_id, role")
      .eq("room_id", room.id);
    return new Map((data ?? []).map((r) => [r.player_id, r.role as MafiaRole]));
  };

  const settleWinner = async (roles: Map<string, MafiaRole>, stillAlive: PlayerRow[]) => {
    const aliveMafia = stillAlive.filter((p) => roles.get(p.id) === "mafia").length;
    return checkWinner(aliveMafia, stillAlive.length - aliveMafia);
  };

  // ---- lobby -> role_reveal: deal the cards ------------------------------
  if (room.status === "lobby") {
    if (players.length < MIN_PLAYERS) {
      return NextResponse.json(
        { error: `Do Mafii trzeba minimum ${MIN_PLAYERS} osób.` },
        { status: 409 }
      );
    }

    const deck = dealRoles(players.length);
    for (let i = 0; i < players.length; i++) {
      await supabase
        .from("mf_secrets")
        .update({ role: deck[i] })
        .eq("player_id", players[i].id);
    }

    // Cards first, night second. Everyone needs to know what they are before
    // the lights go out -- and the mafia need that moment to work out who
    // they're killing, which they can't do once the clock is running.
    const { data, error } = await supabase
      .from("mf_rooms")
      .update({
        status: "role_reveal",
        day_number: 1,
        last_event: { type: "start", seed, victimName: null, victimRole: null },
        phase_started_at: new Date().toISOString(),
      })
      .eq("id", room.id)
      .eq("status", "lobby")
      .select("id");

    if (error) {
      // Most likely 0005 hasn't run, so 'role_reveal' isn't an allowed
      // status yet. Say so rather than appearing to do nothing.
      console.error("mafia: failed to start", error);
      return NextResponse.json(
        { error: "Nie udało się zacząć. Czy migracja 0005 jest uruchomiona?" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, applied: (data?.length ?? 0) > 0 });
  }

  // ---- role_reveal -> noc ------------------------------------------------
  if (room.status === "role_reveal") {
    const { data } = await supabase
      .from("mf_rooms")
      .update({ status: "noc", phase_started_at: new Date().toISOString() })
      .eq("id", room.id)
      .eq("status", "role_reveal")
      .select("id");

    return NextResponse.json({ ok: true, applied: (data?.length ?? 0) > 0 });
  }

  // ---- noc -> dzien: someone doesn't wake up -----------------------------
  if (room.status === "noc") {
    const roles = await roleMap();
    const { data: actions } = await supabase
      .from("mf_actions")
      .select("player_id, target_id")
      .eq("room_id", room.id)
      .eq("day_number", room.day_number);

    const byRole = (role: MafiaRole) =>
      (actions ?? []).filter((a) => roles.get(a.player_id) === role);

    const victimId = tally(byRole("mafia"));
    const savedId = tally(byRole("lekarz"));
    const killed = victimId && victimId !== savedId ? victimId : null;

    let stillAlive = alive;
    if (killed) {
      await supabase
        .from("mf_players")
        .update({ alive: false, revealed_role: roles.get(killed) ?? null })
        .eq("id", killed);
      stillAlive = alive.filter((p) => p.id !== killed);
    }

    const victim = players.find((p) => p.id === killed);
    const winner = await settleWinner(roles, stillAlive);

    const { data } = await supabase
      .from("mf_rooms")
      .update({
        status: winner ? "koniec" : "dzien",
        winner,
        last_event: {
          type: "noc",
          seed,
          victimName: victim?.nickname ?? null,
          victimRole: killed ? (roles.get(killed) ?? null) : null,
          // Told apart so the morning can say "someone was saved" rather
          // than the flatter "nobody died".
          saved: !!victimId && victimId === savedId,
        },
        phase_started_at: new Date().toISOString(),
      })
      .eq("id", room.id)
      .eq("status", "noc")
      .eq("day_number", room.day_number)
      .select("id");

    return NextResponse.json({ ok: true, applied: (data?.length ?? 0) > 0 });
  }

  // ---- dzien -> glosowanie ----------------------------------------------
  if (room.status === "dzien") {
    const { data } = await supabase
      .from("mf_rooms")
      .update({ status: "glosowanie", phase_started_at: new Date().toISOString() })
      .eq("id", room.id)
      .eq("status", "dzien")
      .eq("day_number", room.day_number)
      .select("id");

    return NextResponse.json({ ok: true, applied: (data?.length ?? 0) > 0 });
  }

  // ---- glosowanie -> wynik: the town passes judgement --------------------
  if (room.status === "glosowanie") {
    const roles = await roleMap();
    const { data: votes } = await supabase
      .from("mf_votes")
      .select("player_id, target_id")
      .eq("room_id", room.id)
      .eq("day_number", room.day_number);

    const lynchedId = tally(votes ?? []);
    let stillAlive = alive;
    if (lynchedId) {
      await supabase
        .from("mf_players")
        .update({ alive: false, revealed_role: roles.get(lynchedId) ?? null })
        .eq("id", lynchedId);
      stillAlive = alive.filter((p) => p.id !== lynchedId);
    }

    const lynched = players.find((p) => p.id === lynchedId);
    const winner = await settleWinner(roles, stillAlive);

    const { data } = await supabase
      .from("mf_rooms")
      .update({
        status: winner ? "koniec" : "wynik",
        winner,
        last_event: {
          type: "lincz",
          seed,
          victimName: lynched?.nickname ?? null,
          victimRole: lynchedId ? (roles.get(lynchedId) ?? null) : null,
        },
        phase_started_at: new Date().toISOString(),
      })
      .eq("id", room.id)
      .eq("status", "glosowanie")
      .eq("day_number", room.day_number)
      .select("id");

    return NextResponse.json({ ok: true, applied: (data?.length ?? 0) > 0 });
  }

  // ---- wynik -> next night ----------------------------------------------
  if (room.status === "wynik") {
    const { data } = await supabase
      .from("mf_rooms")
      .update({
        status: "noc",
        day_number: room.day_number + 1,
        phase_started_at: new Date().toISOString(),
      })
      .eq("id", room.id)
      .eq("status", "wynik")
      .eq("day_number", room.day_number)
      .select("id");

    return NextResponse.json({ ok: true, applied: (data?.length ?? 0) > 0 });
  }

  return NextResponse.json({ ok: true, applied: false });
}
