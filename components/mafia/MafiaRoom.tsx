"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  FormEvent,
} from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase/client";
import { avatarFor } from "@/lib/avatar";
import { card, gradientText, primaryButton, inputBase } from "@/lib/theme";
import { getDeviceId, getSavedNickname, saveNickname } from "@/lib/identity";
import { getRfHostMode, setRfHostMode } from "@/lib/ryzykfizyk/hostKey";
import {
  MIN_PLAYERS,
  BOT_DEVICE_ID,
  ROLE_LABEL,
  ROLE_EMOJI,
  ROLE_DESCRIPTION,
  ROLE_NIGHT_PROMPT,
  rolesFor,
} from "@/lib/mafia/roles";
import {
  openingScene,
  nightfallScene,
  mafiaWakesScene,
  deathStory,
  savedStory,
  noKillStory,
  lynchStory,
  noLynchStory,
  mafiaWinsScene,
  townWinsScene,
} from "@/lib/mafia/narrative";
import type { MfMe, MfPlayer, MfRoom } from "@/lib/mafia/types";

const noopSubscribe = () => () => {};
const credsKey = (roomCode: string) => `live-quiz-mafia-${roomCode}`;
const hostKey = (roomCode: string) => `mafia-${roomCode}`;
const PROGRESS_POLL_MS = 2000;

interface Creds {
  playerId: string;
  secret: string;
}

/** Raw string, not the parsed object: the store's snapshot has to be stable
 *  by identity, and a fresh object each read would loop forever. */
function readCredsRaw(roomCode: string): string | null {
  try {
    return localStorage.getItem(credsKey(roomCode));
  } catch {
    return null;
  }
}

export default function MafiaRoom({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<MfRoom | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [players, setPlayers] = useState<MfPlayer[]>([]);

  const storedCredsRaw = useSyncExternalStore(
    noopSubscribe,
    () => readCredsRaw(roomCode),
    () => null
  );
  const [joinedCredsRaw, setJoinedCredsRaw] = useState<string | null>(null);
  const credsRaw = joinedCredsRaw ?? storedCredsRaw;
  const creds = useMemo<Creds | null>(
    () => (credsRaw ? (JSON.parse(credsRaw) as Creds) : null),
    [credsRaw]
  );
  const [me, setMe] = useState<MfMe | null>(null);

  const savedNickname = useSyncExternalStore(noopSubscribe, getSavedNickname, () => "");
  const [typedNickname, setTypedNickname] = useState<string | null>(null);
  const nickname = typedNickname ?? savedNickname;
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const storedMode = useSyncExternalStore(
    noopSubscribe,
    () => getRfHostMode(hostKey(roomCode)),
    () => null
  );
  const [claimedHost, setClaimedHost] = useState(false);
  const isHost = storedMode !== null || claimedHost;
  const isScreenOnly = storedMode === "screen";

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Keyed by day so a new night starts blank without an effect resetting it.
  const [pickedByDay, setPickedByDay] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<{
    phase: string;
    acted: number;
    alive: number;
  } | null>(null);

  const loadedRoleKeyRef = useRef<string | null>(null);

  // ---- room + players ---------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("mf_rooms")
      .select("*")
      .eq("code", roomCode)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setLoadError("Nie ma takiego miasta. Sprawdź kod 👀");
          return;
        }
        setRoom(data as MfRoom);
      });
    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  useEffect(() => {
    if (!room?.id) return;
    const roomId = room.id;

    const fetchPlayers = () => {
      supabase
        .from("mf_players")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at")
        .then(({ data }) => data && setPlayers(data as MfPlayer[]));
    };
    fetchPlayers();

    const channel = supabase
      .channel(`mafia-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mf_rooms", filter: `id=eq.${roomId}` },
        (payload) => setRoom(payload.new as MfRoom)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mf_players", filter: `room_id=eq.${roomId}` },
        fetchPlayers
      )
      .subscribe((status) => {
        // Anything that happened while the channel was connecting was never
        // delivered -- re-read once it's live.
        if (status === "SUBSCRIBED") fetchPlayers();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  // ---- my private card --------------------------------------------------
  const refreshMe = useCallback(async () => {
    if (!creds) return;
    const res = await fetch(`/api/mafia/rooms/${roomCode}/me`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds),
    });
    if (res.ok) setMe((await res.json()) as MfMe);
  }, [creds, roomCode]);

  useEffect(() => {
    if (!room || !creds) return;
    // Re-read when the phase turns over: the detective's findings grow, and
    // roles only exist once the game has actually started.
    const key = `${room.status}-${room.day_number}`;
    if (loadedRoleKeyRef.current === key) return;
    loadedRoleKeyRef.current = key;
    refreshMe();
  }, [room, creds, refreshMe]);

  // The crew can't talk, so through the night their card is re-read to show
  // what the others have picked -- that's how they converge on one name.
  const isNight = room?.status === "noc";
  const amMafia = me?.role === "mafia";
  useEffect(() => {
    if (!isNight || !amMafia || !creds) return;
    const interval = setInterval(refreshMe, PROGRESS_POLL_MS);
    return () => clearInterval(interval);
  }, [isNight, amMafia, creds, refreshMe]);

  // ---- how many have acted ---------------------------------------------
  // Every phase the table waits on people to tap something -- including the
  // reveal, which otherwise sat on "Rozdanie" and needed the host to notice
  // that everyone had finished reading.
  const countingPhase =
    room?.status === "role_reveal" || room?.status === "noc" || room?.status === "glosowanie";
  const phaseKey = room ? `${room.status}-${room.day_number}` : null;
  useEffect(() => {
    if (!countingPhase) return;
    let cancelled = false;
    const tick = () => {
      fetch(`/api/mafia/rooms/${roomCode}/progress`)
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && typeof d.acted === "number" && d.phase) setProgress(d);
        })
        .catch(() => {});
    };
    tick();
    // Night picks can't be published over realtime without giving the game
    // away, so this one phase is polled.
    const interval = setInterval(tick, PROGRESS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // Keyed on the phase, not just the day: night and vote share a day
    // number, and the fresh count has to arrive with the new phase.
  }, [countingPhase, phaseKey, roomCode]);

  /** Just the request. Kept free of state so the auto-advance effect below
   *  doesn't have to touch React state on its way out of a phase. */
  const postAdvance = useCallback(
    () => fetch(`/api/mafia/rooms/${roomCode}/advance`, { method: "POST" }),
    [roomCode]
  );

  const advance = useCallback(async () => {
    setBusy(true);
    const res = await postAdvance();
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error ?? "Nie udało się ruszyć dalej.");
    } else {
      setActionError(null);
    }
    setBusy(false);
  }, [postAdvance]);

  // Night and voting close themselves once everyone living has acted. Guarded
  // by phase so a repeat can't skip the next one; the server also refuses a
  // transition out of a phase it has already left.
  const autoAdvancedRef = useRef<string | null>(null);
  // Counts from the phase we're actually in. A leftover "everyone's done"
  // from the night would otherwise close the vote the instant it opened.
  const live = progress && progress.phase === phaseKey ? progress : null;
  const everyoneActed = !!live && live.alive > 0 && live.acted >= live.alive && countingPhase;
  useEffect(() => {
    if (!isHost || !everyoneActed || !phaseKey) return;
    if (autoAdvancedRef.current === phaseKey) return;
    autoAdvancedRef.current = phaseKey;
    postAdvance();
  }, [isHost, everyoneActed, phaseKey, postAdvance]);

  // ---- actions ----------------------------------------------------------
  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!nickname.trim() || joining) return;
    setJoining(true);
    setJoinError(null);

    const trimmed = nickname.trim().slice(0, 20);
    const res = await fetch(`/api/mafia/rooms/${roomCode}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: trimmed, deviceId: getDeviceId() }),
    });
    const data = await res.json();
    setJoining(false);

    if (!res.ok) {
      setJoinError(data.error ?? "Nie udało się dołączyć.");
      return;
    }
    saveNickname(trimmed);
    const fresh = JSON.stringify({ playerId: data.playerId, secret: data.secret });
    localStorage.setItem(credsKey(roomCode), fresh);
    setJoinedCredsRaw(fresh);
  }

  /** Seats stand-ins so one person can run a whole game alone. They pick at
   *  night and vote during the day; the lobby list refreshes over realtime. */
  async function addBots(count: number) {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    const res = await fetch(`/api/mafia/rooms/${roomCode}/bots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error ?? "Nie udało się dosadzić.");
    }
    setBusy(false);
  }

  async function pick(targetId: string) {
    if (!creds || !room || busy) return;
    setBusy(true);
    setActionError(null);
    const res = await fetch(`/api/mafia/rooms/${roomCode}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...creds, targetId }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error ?? "Nie zapisało się.");
      return;
    }
    setPickedByDay((prev) => ({ ...prev, [`${room.status}-${room.day_number}`]: targetId }));
  }

  // ---- render -----------------------------------------------------------
  if (loadError) return <Centered title="Ups!" message={loadError} />;
  if (!room) return <Centered title="Chwila…" message="Zaglądam do miasta." />;

  const ev = room.last_event;
  const alive = players.filter((p) => p.alive);
  const dead = players.filter((p) => !p.alive);
  const iAmPlayer = !!creds;
  const myPlayer = creds ? players.find((p) => p.id === creds.playerId) : undefined;
  const amAlive = myPlayer?.alive ?? false;
  // Falls back to the server's copy so a reload mid-night doesn't look like
  // you never picked.
  const picked = pickedByDay[`${room.status}-${room.day_number}`] ?? me?.myPick ?? undefined;

  /** Takes over running the game and moves it on, so a table whose host
   *  device was never marked can't get stranded mid-phase. */
  const claimAndAdvance = () => {
    setRfHostMode(hostKey(roomCode), "play");
    setClaimedHost(true);
    advance();
  };

  /** `quiet` renders it as a line of small print instead of a big button --
   *  for screens where the player already has one obvious thing to press and
   *  a second button of equal weight just raises the question of which. */
  const nextButton = (label: string, quiet = false) =>
    isHost ? (
      <button
        onClick={advance}
        disabled={busy}
        className={
          quiet
            ? "text-sm font-bold text-white/40 underline underline-offset-4"
            : primaryButton + " text-lg"
        }
      >
        {label}
      </button>
    ) : (
      <button
        onClick={claimAndAdvance}
        disabled={busy}
        className="text-sm font-bold text-white/40 underline underline-offset-4"
      >
        Nikt nie klika? Przejmij prowadzenie
      </button>
    );
  const joinUrl =
    typeof window !== "undefined" ? `${window.location.origin}/mafia/${roomCode}` : "";

  // Someone running the game from a screen nobody plays on.
  if (!iAmPlayer && !isScreenOnly && room.status === "lobby") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-white">
        <p className="text-lg font-bold text-white/50">
          Miasto <span className={`font-black ${gradientText}`}>{roomCode}</span>
        </p>
        <form onSubmit={handleJoin} className={`flex w-full max-w-sm flex-col gap-4 p-6 ${card}`}>
          <h1 className="text-center text-xl font-black">Jak Cię zawołać? 👋</h1>
          <input
            value={nickname}
            onChange={(e) => setTypedNickname(e.target.value)}
            maxLength={20}
            placeholder="Twoja ksywka"
            autoFocus
            className={`text-center text-lg font-bold ${inputBase}`}
            required
          />
          {joinError && <p className="text-center text-sm font-semibold text-rose-400">{joinError}</p>}
          <button type="submit" disabled={joining} className={primaryButton + " text-lg"}>
            {joining ? "Wchodzę…" : "Wchodzę do miasta"}
          </button>
        </form>
      </div>
    );
  }

  if (room.status === "lobby") {
    const split = rolesFor(Math.max(players.length, MIN_PLAYERS));
    return (
      <div className="flex flex-1 flex-col items-center gap-5 p-5 text-center text-white">
        <p className="text-sm font-bold text-white/60">Zeskanujcie i wchodźcie 🌃</p>
        <p className={`text-5xl font-black tracking-[0.15em] ${gradientText}`}>{roomCode}</p>
        {joinUrl && (
          <div className={`p-3 ${card}`}>
            <div className="rounded-2xl bg-white p-3">
              <QRCodeSVG value={joinUrl} size={180} />
            </div>
          </div>
        )}

        <div className={`w-full max-w-sm p-4 ${card}`}>
          <p className="mb-3 text-base font-black">Miasto ({players.length})</p>
          {players.length === 0 ? (
            <p className="text-sm text-white/50">Pusto. Ktoś musi być pierwszy 👀</p>
          ) : (
            <div className="flex flex-wrap justify-center gap-2">
              {players.map((p) => (
                <span
                  key={p.id}
                  className={`rounded-full border-2 border-black px-3 py-1.5 text-sm font-bold shadow-[3px_3px_0_0_#000] ${
                    p.device_id === BOT_DEVICE_ID
                      ? "bg-white/40 text-black/60"
                      : "bg-white text-black"
                  }`}
                >
                  {p.device_id === BOT_DEVICE_ID ? "🤖" : avatarFor(p.id)} {p.nickname}
                </span>
              ))}
            </div>
          )}
          {players.length >= MIN_PLAYERS && (
            <p className="mt-3 text-xs font-medium text-white/40">
              Przy {players.length} osobach: {split.mafia} × mafia
              {split.detektyw ? ", detektyw" : ""}
              {split.lekarz ? ", lekarz" : ""}
            </p>
          )}
        </div>

        {isHost ? (
          <>
            <button
              onClick={advance}
              disabled={players.length < MIN_PLAYERS || busy}
              className={primaryButton + " text-lg"}
            >
              {busy ? "Rozdaję role…" : "Gasimy światła 🌙"}
            </button>
            {players.length < MIN_PLAYERS && (
              <p className="text-xs font-bold text-white/40">
                Brakuje jeszcze {MIN_PLAYERS - players.length} os. — Mafia potrzebuje minimum{" "}
                {MIN_PLAYERS}.
              </p>
            )}
            {/* Six phones is a lot to borrow just to check that it works. */}
            <button
              onClick={() => addBots(Math.max(1, MIN_PLAYERS - players.length))}
              disabled={busy}
              className="text-xs font-bold text-white/40 underline underline-offset-4"
            >
              {players.length < MIN_PLAYERS
                ? `Nie ma kompletu? Dosadź ${MIN_PLAYERS - players.length} × 🤖`
                : "Dosadź jeszcze jednego 🤖"}
            </button>
            <p className="-mt-3 text-[11px] text-white/25">
              Boty grają same — dobre na próbę, kiepskie na domówkę.
            </p>
          </>
        ) : (
          <button
            onClick={() => {
              setRfHostMode(hostKey(roomCode), "play");
              setClaimedHost(true);
            }}
            className="text-sm font-bold text-white/40 underline underline-offset-4"
          >
            To ja prowadzę to miasto 🎛️
          </button>
        )}
        {actionError && <p className="text-sm font-semibold text-rose-400">{actionError}</p>}
      </div>
    );
  }

  // ---- cards on the table, before the first night ------------------------
  if (room.status === "role_reveal") {
    const iAmReady = myPlayer?.ready ?? false;
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 text-white">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-white/40">
          {live ? `${live.acted} / ${live.alive} przeczytało` : "Rozdanie"}
        </p>

        <div className={`whitespace-pre-line p-5 text-center text-sm leading-relaxed ${card}`}>
          {openingScene(ev?.seed ?? 0)}
        </div>

        {!iAmPlayer ? (
          <div className={`p-6 text-center ${card}`}>
            <p className="font-black">Prowadzisz miasto.</p>
            <p className="mt-1 text-sm text-white/50">Czekaj, aż wszyscy poznają swoje role.</p>
          </div>
        ) : !me?.role ? (
          <Centered title="Chwila…" message="Rozdaję karty." />
        ) : (
          <>
            <div className={`p-6 text-center ${card}`}>
              <p className="text-5xl">{ROLE_EMOJI[me.role]}</p>
              <p className={`mt-2 text-2xl font-black ${gradientText}`}>{ROLE_LABEL[me.role]}</p>
              <p className="mt-2 text-sm text-white/60">{ROLE_DESCRIPTION[me.role]}</p>
              {me.allies.length > 0 && (
                <p className="mt-3 rounded-xl border-2 border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm font-bold text-rose-200">
                  Grasz z: {me.allies.join(", ")}
                </p>
              )}
              <p className="mt-3 text-xs text-white/30">
                Nikt inny tego nie widzi. Zapamiętaj i schowaj telefon.
              </p>
            </div>

            {iAmReady ? (
              <p className="text-center text-sm font-bold text-white/50">
                Schowaj telefon. Czekamy na resztę…
              </p>
            ) : (
              <button
                onClick={() => pick(creds!.playerId)}
                disabled={busy}
                className={primaryButton + " text-lg"}
              >
                Zapamiętane, chowam telefon 👍
              </button>
            )}
          </>
        )}

        {actionError && (
          <p className="text-center text-sm font-semibold text-rose-400">{actionError}</p>
        )}

        {/* Only once this player has read their own card. Two big buttons at
            the same time -- "I know who I am" next to "lights out" -- read as
            a choice between two things, and it isn't one: the first is yours,
            the second happens by itself when the last person has tapped. */}
        {(!iAmPlayer || iAmReady) && (
          <div className="mt-auto pt-2 text-center">
            {nextButton("Wszyscy już wiedzą? Gasimy światła 🌙", true)}
          </div>
        )}
      </div>
    );
  }

  if (room.status === "koniec") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-white">
        <p className="text-6xl">{room.winner === "mafia" ? "🔫" : "🎉"}</p>
        <h1 className={`text-3xl font-black ${gradientText}`}>
          {room.winner === "mafia" ? "Mafia przejęła miasto" : "Miasto wygrało!"}
        </h1>
        <div className={`whitespace-pre-line p-5 text-center text-sm leading-relaxed ${card}`}>
          {room.winner === "mafia"
            ? mafiaWinsScene(ev?.seed ?? 0)
            : townWinsScene(ev?.seed ?? 0)}
        </div>
        <div className={`w-full max-w-sm p-4 ${card}`}>
          <p className="mb-3 text-sm font-black text-white/70">Kto był kim</p>
          <ul className="flex flex-col gap-2">
            {players.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                <span className={p.alive ? "" : "text-white/40 line-through"}>
                  {avatarFor(p.id)} {p.nickname}
                </span>
                <span className="font-black">
                  {p.revealed_role
                    ? `${ROLE_EMOJI[p.revealed_role]} ${ROLE_LABEL[p.revealed_role]}`
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-white/30">
            Koniec gry — wszystkie karty na stół.
          </p>
        </div>
        {isHost && (
          <Link href="/mafia" className={primaryButton + " mt-2 text-lg"}>
            Nowe miasto 🔁
          </Link>
        )}
      </div>
    );
  }

  const dayHeader = (
    <div className="grid w-full grid-cols-3 items-center gap-2 text-sm font-bold text-white/60">
      <span className="text-left">Dzień {room.day_number}</span>
      <span className="text-center text-xs text-white/40">
        {live ? `${live.acted} / ${live.alive} gotowych` : ""}
      </span>
      <span className="text-right">{alive.length} żywych</span>
    </div>
  );

  // ---- night ------------------------------------------------------------
  if (room.status === "noc") {
    return (
      <div className="flex flex-1 flex-col gap-3 p-4 text-white">
        {dayHeader}
        <p className="text-center text-4xl">🌙</p>
        <p className="whitespace-pre-line text-center text-sm italic leading-relaxed text-white/50">
          {nightfallScene(room.day_number)}
          {me?.role === "mafia" ? `\n\n${mafiaWakesScene(room.day_number)}` : ""}
        </p>

        {!iAmPlayer || !amAlive ? (
          <div className={`p-6 text-center ${card}`}>
            <p className="font-black">{iAmPlayer ? "Nie żyjesz." : "Prowadzisz miasto."}</p>
            <p className="mt-1 text-sm text-white/50">Miasto śpi. Ktoś nie doczeka rana…</p>
          </div>
        ) : (
          <>
            {me?.role && (
              <div className={`p-4 text-center ${card}`}>
                <p className="text-2xl">{ROLE_EMOJI[me.role]}</p>
                <p className="font-black">{ROLE_LABEL[me.role]}</p>
                <p className="mt-1 text-xs text-white/50">{ROLE_DESCRIPTION[me.role]}</p>
                {me.allies.length > 0 && (
                  <p className="mt-2 text-xs font-bold text-rose-300">
                    Twoi: {me.allies.join(", ")}
                  </p>
                )}
                {me.findings.length > 0 && (
                  <p className="mt-2 text-xs text-white/60">
                    {me.findings
                      .map((f) => `${f.nickname}: ${f.isMafia ? "MAFIA 🔫" : "czysty"}`)
                      .join(" • ")}
                  </p>
                )}
              </div>
            )}

            {me?.role === "mafia" && me.allyPicks.length > 0 && (
              <div className="rounded-xl border-2 border-rose-400/40 bg-rose-400/10 px-3 py-2 text-center text-xs font-bold text-rose-200">
                {me.allyPicks
                  .map((a) => `${a.nickname}: ${a.target ?? "jeszcze się zastanawia"}`)
                  .join(" • ")}
                <span className="mt-1 block font-medium text-rose-200/60">
                  Musicie wskazać tę samą osobę — inaczej nikt nie zginie.
                </span>
              </div>
            )}

            <p className="text-center text-sm font-black">
              {me?.role ? ROLE_NIGHT_PROMPT[me.role] : "Wybierz kogoś"}
            </p>

            <div className="grid grid-cols-2 gap-2">
              {alive
                .filter((p) => p.id !== creds?.playerId)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => pick(p.id)}
                    /* Changeable until the night closes: the crew has to be
                       able to move onto whoever the others settled on. */
                    disabled={busy}
                    className={`rounded-2xl border-2 px-3 py-4 text-sm font-black transition-all ${
                      picked === p.id
                        ? "border-black bg-rose-400 text-black shadow-[4px_4px_0_0_#000]"
                        : "border-white/15 bg-white/5 text-white/80"
                    }`}
                  >
                    <span className="block text-xl">{avatarFor(p.id)}</span>
                    {p.nickname}
                  </button>
                ))}
            </div>

            {picked && (
              <p className="text-center text-xs font-bold text-white/50">
                Wybrane — możesz jeszcze zmienić zdanie. Czekamy na resztę…
              </p>
            )}
            {actionError && (
              <p className="text-center text-sm font-semibold text-rose-400">{actionError}</p>
            )}
          </>
        )}

        {/* Someone always forgets to tap; the night mustn't hang on them. */}
        <div className="mt-auto pt-2 text-center">
          {nextButton("Wszyscy kliknęli? Kończymy noc 🌅", true)}
        </div>
      </div>
    );
  }

  // ---- morning ----------------------------------------------------------
  if (room.status === "dzien") {
    const story = !ev
      ? ""
      : ev.saved
        ? savedStory(ev.seed)
        : ev.victimName
          ? deathStory(ev.victimName, ev.seed)
          : noKillStory(ev.seed);

    return (
      <div className="flex flex-1 flex-col gap-4 p-4 text-white">
        {dayHeader}
        <p className="text-center text-4xl">🌅</p>
        <div className={`p-5 text-center ${card}`}>
          <p className="whitespace-pre-line text-base font-bold leading-relaxed">{story}</p>
          {ev?.victimName && !ev.saved && ev.victimRole && (
            <p className="mt-3 text-sm text-white/60">
              Karta odkryta: {ev.victimName} — {ROLE_EMOJI[ev.victimRole]}{" "}
              {ROLE_LABEL[ev.victimRole]}
            </p>
          )}
        </div>
        <AliveList players={alive} dead={dead} />
        {nextButton("Głosujemy 🗳️")}
      </div>
    );
  }

  // ---- voting -----------------------------------------------------------
  if (room.status === "glosowanie") {
    return (
      <div className="flex flex-1 flex-col gap-3 p-4 text-white">
        {dayHeader}
        <p className="text-center text-sm font-black">Kogo wyrzucamy z miasta?</p>

        {!iAmPlayer || !amAlive ? (
          <div className={`p-6 text-center ${card}`}>
            <p className="text-sm text-white/50">
              {iAmPlayer ? "Nie żyjesz — tylko patrzysz." : "Prowadzisz — nie głosujesz."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {alive.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pick(p.id)}
                  disabled={busy || !!picked}
                  className={`rounded-2xl border-2 px-3 py-4 text-sm font-black transition-all ${
                    picked === p.id
                      ? "border-black bg-rose-400 text-black shadow-[4px_4px_0_0_#000]"
                      : "border-white/15 bg-white/5 text-white/80"
                  } ${picked && picked !== p.id ? "opacity-30" : ""}`}
                >
                  <span className="block text-xl">{avatarFor(p.id)}</span>
                  {p.nickname}
                </button>
              ))}
            </div>
            {picked && (
              <p className="text-center text-xs font-bold text-white/50">
                Zagłosowane. Czekamy na resztę…
              </p>
            )}
            {actionError && (
              <p className="text-center text-sm font-semibold text-rose-400">{actionError}</p>
            )}
          </>
        )}

        {/* The vote can't wait on someone who's gone to the kitchen -- and
            with a host who's already dead there's nobody left to close it. */}
        <div className="mt-auto pt-2 text-center">
          {nextButton("Wszyscy zagłosowali? Zamykamy głosowanie ⚖️", true)}
        </div>
      </div>
    );
  }

  // ---- verdict ----------------------------------------------------------
  const verdict = !ev
    ? ""
    : ev.victimName
      ? lynchStory(ev.victimName, ev.seed)
      : noLynchStory(ev.seed);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 text-white">
      {dayHeader}
      <p className="text-center text-4xl">⚖️</p>
      <div className={`p-5 text-center ${card}`}>
        <p className="whitespace-pre-line text-base font-bold leading-relaxed">{verdict}</p>
        {ev?.victimName && ev.victimRole && (
          <p className="mt-3 text-sm text-white/60">
            Karta odkryta: {ev.victimName} — {ROLE_EMOJI[ev.victimRole]}{" "}
            {ROLE_LABEL[ev.victimRole]}
          </p>
        )}
      </div>
      <AliveList players={alive} dead={dead} />
      {nextButton("Zapada noc 🌙")}
      {actionError && (
        <p className="text-center text-sm font-semibold text-rose-400">{actionError}</p>
      )}
    </div>
  );
}

function Centered({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-white">
      <h1 className="text-2xl font-black">{title}</h1>
      <p className="mt-2 text-white/60">{message}</p>
    </div>
  );
}

function AliveList({ players, dead }: { players: MfPlayer[]; dead: MfPlayer[] }) {
  return (
    <div className={`p-4 ${card}`}>
      <p className="mb-2 text-sm font-black text-white/70">Żyją ({players.length})</p>
      <div className="flex flex-wrap gap-2">
        {players.map((p) => (
          <span
            key={p.id}
            className="rounded-full border-2 border-black bg-white px-3 py-1.5 text-sm font-bold text-black shadow-[3px_3px_0_0_#000]"
          >
            {avatarFor(p.id)} {p.nickname}
          </span>
        ))}
      </div>
      {dead.length > 0 && (
        <>
          <p className="mb-2 mt-4 text-sm font-black text-white/40">Odeszli ({dead.length})</p>
          <div className="flex flex-wrap gap-2">
            {dead.map((p) => (
              <span
                key={p.id}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/40 line-through"
              >
                {avatarFor(p.id)} {p.nickname}
                {p.revealed_role ? ` ${ROLE_EMOJI[p.revealed_role]}` : ""}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
