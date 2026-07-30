"use client";

import { useEffect, useRef, useState, useSyncExternalStore, FormEvent } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase/client";
import { avatarFor } from "@/lib/avatar";
import { card, gradientText, primaryButton, inputBase } from "@/lib/theme";
import { isMarkedHost, markAsHost } from "@/lib/hostStorage";
import { getDeviceId, getSavedNickname, saveNickname } from "@/lib/identity";
import { hostKeyFor } from "@/lib/ryzykfizyk/hostKey";
import { useRfDriver } from "@/lib/ryzykfizyk/useRfDriver";
import {
  BET_AMOUNTS,
  MAX_BETS_PER_ROUND,
  AUTHOR_BONUS,
  UNDER_SLOT_KEY,
  parseGuess,
  type Slot,
} from "@/lib/ryzykfizyk/betting";
import type { RfBet, RfPlayer, RfRoom as RfRoomRow } from "@/lib/ryzykfizyk/types";

interface QuestionState {
  question: { id: string; text: string; unit: string | null } | null;
  totalRounds: number;
  answer: number | null;
  winningSlotKey: string | null;
}

const REFRESH_DEBOUNCE_MS = 200;
const noopSubscribe = () => () => {};
const playerKey = (roomCode: string) => `live-quiz-rf-player-${roomCode}`;

export default function RfRoom({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<RfRoomRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [players, setPlayers] = useState<RfPlayer[]>([]);

  // Only the id is stored; the live row comes from `players` so the balance
  // is always the refreshed one rather than a copy that needs syncing.
  const [myId, setMyId] = useState<string | null>(null);
  // Covers the moment right after joining, before the list has caught up.
  const [justJoined, setJustJoined] = useState<RfPlayer | null>(null);

  const savedNickname = useSyncExternalStore(noopSubscribe, getSavedNickname, () => "");
  const [typedNickname, setTypedNickname] = useState<string | null>(null);
  const nickname = typedNickname ?? savedNickname;
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const storedHost = useSyncExternalStore(
    noopSubscribe,
    () => isMarkedHost(hostKeyFor(roomCode)),
    () => false
  );
  const [claimedHost, setClaimedHost] = useState(false);
  const isHost = storedHost || claimedHost;
  const [starting, setStarting] = useState(false);

  const [questionState, setQuestionState] = useState<QuestionState | null>(null);
  // Keyed by round so a round change can't leave a previous round's guess or
  // bets on screen, without an effect reaching in to reset them.
  const [guessByRound, setGuessByRound] = useState<Record<number, number>>({});
  const [betsByRound, setBetsByRound] = useState<Record<number, RfBet[]>>({});

  const loadedQuestionKeyRef = useRef<string | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const me = (myId ? players.find((p) => p.id === myId) : undefined) ?? justJoined;

  // ---- room + realtime ------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("rf_rooms")
      .select("*")
      .eq("code", roomCode)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setLoadError("Nie ma takiego stolika. Sprawdź kod 👀");
          return;
        }
        setRoom(data as RfRoomRow);
      });
    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  useEffect(() => {
    if (!room?.id) return;
    const savedId = localStorage.getItem(playerKey(roomCode));
    if (!savedId) return;
    supabase
      .from("rf_players")
      .select("*")
      .eq("id", savedId)
      .eq("room_id", room.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setMyId(data.id);
          setJustJoined(data as RfPlayer);
        }
      });
  }, [room?.id, roomCode]);

  useEffect(() => {
    if (!room?.id) return;
    const roomId = room.id;

    const fetchPlayers = () => {
      supabase
        .from("rf_players")
        .select("*")
        .eq("room_id", roomId)
        .order("balance", { ascending: false })
        .then(({ data }) => data && setPlayers(data as RfPlayer[]));
    };
    fetchPlayers();

    // A payout rewrites every player's row at once; debouncing collapses
    // that burst into one refetch.
    const refreshPlayers = () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(fetchPlayers, REFRESH_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`rf-room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rf_rooms", filter: `id=eq.${roomId}` },
        (payload) => setRoom(payload.new as RfRoomRow)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rf_players", filter: `room_id=eq.${roomId}` },
        refreshPlayers
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [room?.id]);

  // ---- per-round question ---------------------------------------------
  useEffect(() => {
    if (!room || room.status === "lobby") return;
    const key = `${room.status}-${room.current_round}`;
    if (loadedQuestionKeyRef.current === key) return;
    loadedQuestionKeyRef.current = key;

    let cancelled = false;
    fetch(`/api/rf/rooms/${roomCode}/state`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setQuestionState(data);
      });
    return () => {
      cancelled = true;
    };
  }, [room, roomCode]);

  // Bets come from the database rather than memory, so refreshing mid-round
  // doesn't hand someone a fresh pair of bets.
  const roundForBets = room?.current_round ?? null;
  const phaseForBets = room?.status ?? null;
  useEffect(() => {
    if (!room?.id || !myId) return;
    if (phaseForBets !== "betting" && phaseForBets !== "reveal") return;
    if (roundForBets === null) return;

    supabase
      .from("rf_bets")
      .select("id, player_id, round_index, slot_key, amount")
      .eq("room_id", room.id)
      .eq("player_id", myId)
      .eq("round_index", roundForBets)
      .then(({ data }) => {
        if (data) setBetsByRound((prev) => ({ ...prev, [roundForBets]: data as RfBet[] }));
      });
  }, [room?.id, myId, phaseForBets, roundForBets]);

  const { remainingSeconds, guessedThisRound } = useRfDriver({
    roomCode,
    room,
    isHost,
    playerCount: players.length,
  });

  // ---- actions ---------------------------------------------------------
  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!room || !nickname.trim() || joining) return;
    setJoining(true);
    setJoinError(null);

    const trimmed = nickname.trim().slice(0, 20);
    const { data, error } = await supabase
      .from("rf_players")
      .insert({ room_id: room.id, nickname: trimmed, device_id: getDeviceId() })
      .select()
      .single();

    setJoining(false);
    if (error || !data) {
      setJoinError("Nie wyszło, spróbuj jeszcze raz 😅");
      return;
    }
    saveNickname(trimmed);
    localStorage.setItem(playerKey(roomCode), data.id);
    setMyId(data.id);
    setJustJoined(data as RfPlayer);
  }

  async function handleStart() {
    setStarting(true);
    await fetch(`/api/rf/rooms/${roomCode}/advance`, { method: "POST" });
    setStarting(false);
  }

  /** Returns an error message, or null when the guess landed. */
  async function submitGuess(raw: string): Promise<string | null> {
    if (!room || !myId) return "Coś poszło nie tak.";
    const value = parseGuess(raw);
    if (value === null) return "Wpisz samą liczbę, np. 206";

    const round = room.current_round;
    const { error } = await supabase
      .from("rf_guesses")
      .insert({ room_id: room.id, player_id: myId, round_index: round, value });

    // A duplicate means this round is already answered from another tab --
    // the stored one stands.
    if (error && error.code !== "23505") return "Nie wysłało się, spróbuj jeszcze raz 😬";

    setGuessByRound((prev) => ({ ...prev, [round]: value }));
    return null;
  }

  /** Returns an error message, or null when the bet landed. */
  async function submitBet(slotKey: string, amount: number): Promise<string | null> {
    if (!room || !me || !myId) return "Coś poszło nie tak.";
    const round = room.current_round;
    const mine = betsByRound[round] ?? [];

    if (mine.length >= MAX_BETS_PER_ROUND) return `Możesz obstawić maks. ${MAX_BETS_PER_ROUND} typy.`;
    if (mine.some((b) => b.slot_key === slotKey)) return "Ten typ już obstawiony.";
    const staked = mine.reduce((sum, b) => sum + b.amount, 0);
    if (staked + amount > me.balance) return "Nie masz tyle w banku 💸";

    const { data, error } = await supabase
      .from("rf_bets")
      .insert({ room_id: room.id, player_id: myId, round_index: round, slot_key: slotKey, amount })
      .select()
      .single();

    if (error || !data) return "Zakład nie przeszedł, spróbuj jeszcze raz 😬";

    setBetsByRound((prev) => ({ ...prev, [round]: [...(prev[round] ?? []), data as RfBet] }));
    return null;
  }

  function handleClaimHost() {
    markAsHost(hostKeyFor(roomCode));
    setClaimedHost(true);
  }

  // ---- render ----------------------------------------------------------
  if (loadError) return <Centered title="Ups!" message={loadError} />;
  if (!room) return <Centered title="Chwila…" message="Ogarniam stolik." />;

  if (!me) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-white">
        <p className="text-lg font-bold text-white/50">
          Stolik <span className={`font-black ${gradientText}`}>{roomCode}</span>
        </p>
        <form onSubmit={handleJoin} className={`flex w-full max-w-sm flex-col gap-4 p-6 ${card}`}>
          {isHost && (
            <p className="-mt-1 text-center text-xs font-black uppercase tracking-widest text-amber-300">
              🎛️ Prowadzisz z tego urządzenia
            </p>
          )}
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
          {joinError && (
            <p className="text-center text-sm font-semibold text-rose-400">{joinError}</p>
          )}
          <button type="submit" disabled={joining} className={primaryButton + " text-lg"}>
            {joining ? "Siadam…" : "Siadam do stołu!"}
          </button>
        </form>
      </div>
    );
  }

  const round = room.current_round;
  const slots = (room.slots ?? []) as Slot[];
  const question = questionState?.question;
  const roundLabel = `Runda ${round + 1} / ${questionState?.totalRounds ?? "?"}`;
  const myBets = betsByRound[round] ?? [];

  if (room.status === "lobby") {
    const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/rf/${roomCode}` : "";
    return isHost ? (
      <div className="flex flex-1 flex-col items-center gap-5 p-5 text-center text-white">
        <p className="text-sm font-bold text-white/60">Pokaż im ten kod 👇</p>
        <p className={`text-5xl font-black tracking-[0.15em] ${gradientText}`}>{roomCode}</p>
        {joinUrl && (
          <div className={`p-3 ${card}`}>
            <div className="rounded-2xl bg-white p-3">
              <QRCodeSVG value={joinUrl} size={180} />
            </div>
          </div>
        )}
        <PlayerChips players={players} />
        <button
          onClick={handleStart}
          disabled={players.length === 0 || starting}
          className={primaryButton + " text-lg"}
        >
          {starting ? "Rozdaję…" : "Zaczynamy! 🎲"}
        </button>
      </div>
    ) : (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-white">
        <h1 className="text-2xl font-black">
          {avatarFor(me.id)} {me.nickname}!
        </h1>
        <p className="text-white/60">Czekaj na start, zaraz rozdajemy żetony 🎲</p>
        <PlayerChips players={players} />
        <button
          onClick={handleClaimHost}
          className="mt-2 text-sm font-bold text-white/40 underline underline-offset-4"
        >
          To ja prowadzę stolik {roomCode} 🎛️
        </button>
      </div>
    );
  }

  if (room.status === "guessing") {
    return (
      <GuessPhase
        key={round}
        roundLabel={roundLabel}
        remainingSeconds={remainingSeconds}
        note={isHost ? `${guessedThisRound} / ${players.length} wpisało` : undefined}
        questionText={question?.text ?? "…"}
        unit={question?.unit ?? null}
        alreadySent={guessByRound[round] ?? null}
        onSubmit={submitGuess}
      />
    );
  }

  if (room.status === "betting") {
    return (
      <BettingPhase
        key={round}
        roundLabel={roundLabel}
        remainingSeconds={remainingSeconds}
        questionText={question?.text ?? ""}
        slots={slots}
        myBets={myBets}
        balance={me.balance}
        onPlaceBet={submitBet}
      />
    );
  }

  if (room.status === "reveal") {
    const answer = questionState?.answer ?? null;
    const winningKey = questionState?.winningSlotKey ?? null;
    const winningSlot = slots.find((s) => s.key === winningKey);
    const iAuthored = !!winningSlot?.authorIds.includes(me.id);
    const delta =
      myBets.reduce(
        (sum, b) =>
          b.slot_key === winningKey
            ? sum + b.amount * (slots.find((s) => s.key === b.slot_key)?.odds ?? 2)
            : sum - b.amount,
        0
      ) + (iAuthored ? AUTHOR_BONUS : 0);

    return (
      <div className="flex flex-1 flex-col items-center gap-3 p-4 text-center text-white">
        <PhaseHeader left={roundLabel} right={`${remainingSeconds}s`} />
        <p className="px-1 text-sm font-bold leading-snug text-white/60">{question?.text}</p>
        <p className="text-sm font-bold text-white/50">Prawidłowa odpowiedź</p>
        <p className={`text-5xl font-black ${gradientText}`}>
          {answer !== null ? answer.toLocaleString("pl") : "—"}
          {question?.unit ? <span className="text-2xl"> {question.unit}</span> : null}
        </p>
        <p className="text-sm font-bold text-white/60">
          {winningKey === UNDER_SLOT_KEY
            ? "Wszyscy przestrzelili! 🙈"
            : `Wygrywa typ ${winningSlot?.value?.toLocaleString("pl") ?? "—"}`}
        </p>
        <div
          className={`px-6 py-4 text-2xl font-black ${card} ${
            delta > 0 ? "text-lime-300" : delta < 0 ? "text-rose-400" : "text-white/60"
          }`}
        >
          {delta > 0 ? "+" : ""}
          {delta}$
          {iAuthored && <span className="block text-xs text-white/50">w tym bonus za typ 🎯</span>}
        </div>
        <Standings players={players} meId={me.id} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-white">
      <p className="text-6xl">🏁</p>
      <h1 className={`text-3xl font-black ${gradientText}`}>Koniec gry!</h1>
      <Standings players={players} meId={me.id} />
      {isHost ? (
        <Link href="/rf" className={primaryButton + " mt-2 text-lg"}>
          Nowa gra 🔁
        </Link>
      ) : (
        <p className="text-sm text-white/40">Czekaj, aż prowadzący odpali nową 🎲</p>
      )}
    </div>
  );
}

/** Remounted each round via `key`, so the input and its error start clean. */
function GuessPhase({
  roundLabel,
  remainingSeconds,
  note,
  questionText,
  unit,
  alreadySent,
  onSubmit,
}: {
  roundLabel: string;
  remainingSeconds: number;
  note?: string;
  questionText: string;
  unit: string | null;
  alreadySent: number | null;
  onSubmit: (raw: string) => Promise<string | null>;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handle(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError(await onSubmit(text));
    setSending(false);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 text-white">
      <PhaseHeader left={roundLabel} right={`${remainingSeconds}s`} note={note} />
      <h2 className="flex-1 px-1 py-6 text-center text-2xl font-extrabold leading-snug">
        {questionText}
      </h2>

      {alreadySent !== null ? (
        <div className={`p-6 text-center ${card}`}>
          <p className="text-sm font-bold text-white/50">Twój typ</p>
          <p className={`text-4xl font-black ${gradientText}`}>
            {alreadySent.toLocaleString("pl")}
          </p>
          <p className="mt-2 text-xs text-white/40">Czekamy na resztę…</p>
        </div>
      ) : (
        <form onSubmit={handle} className={`flex flex-col gap-3 p-5 ${card}`}>
          <label className="text-sm font-bold text-white/60">
            Twój typ{unit ? ` (${unit})` : ""}
          </label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            inputMode="numeric"
            placeholder="np. 206"
            autoFocus
            className={`text-center text-3xl font-black ${inputBase}`}
          />
          {error && <p className="text-center text-sm font-semibold text-rose-400">{error}</p>}
          <button type="submit" disabled={sending} className={primaryButton + " text-lg"}>
            {sending ? "Wysyłam…" : "Stawiam na to 🎯"}
          </button>
          <p className="text-center text-xs text-white/30">
            Nie wiesz? Strzelaj — za sam typ nic nie tracisz.
          </p>
        </form>
      )}
    </div>
  );
}

/** Remounted each round via `key`, so the selected slot and error reset. */
function BettingPhase({
  roundLabel,
  remainingSeconds,
  questionText,
  slots,
  myBets,
  balance,
  onPlaceBet,
}: {
  roundLabel: string;
  remainingSeconds: number;
  questionText: string;
  slots: Slot[];
  myBets: RfBet[];
  balance: number;
  onPlaceBet: (slotKey: string, amount: number) => Promise<string | null>;
}) {
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const staked = myBets.reduce((sum, b) => sum + b.amount, 0);
  const left = balance - staked;
  const maxedOut = myBets.length >= MAX_BETS_PER_ROUND;

  async function handleAmount(amount: number) {
    if (!pendingSlot) return;
    const err = await onPlaceBet(pendingSlot, amount);
    setError(err);
    if (!err) setPendingSlot(null);
  }

  return (
    <div className="flex flex-1 flex-col gap-3 p-4 text-white">
      <PhaseHeader left={roundLabel} right={`${remainingSeconds}s`} />
      <p className="px-1 text-center text-base font-bold leading-snug text-white/80">
        {questionText}
      </p>
      <p className="text-center text-xs font-bold text-white/40">
        Który typ jest najbliżej — <span className="text-amber-300">ale nie za wysoko?</span>
      </p>

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold">
        <span className="text-white/50">Bank</span>
        <span>
          <span className="text-lime-300">{left}$</span>
          {staked > 0 && <span className="text-white/40"> (w grze {staked}$)</span>}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {slots.map((slot) => {
          const mine = myBets.find((b) => b.slot_key === slot.key);
          const selected = pendingSlot === slot.key;
          return (
            <button
              key={slot.key}
              onClick={() => setPendingSlot(selected ? null : slot.key)}
              disabled={!!mine || maxedOut}
              className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                mine
                  ? "border-black bg-lime-300 text-black shadow-[4px_4px_0_0_#000]"
                  : selected
                    ? "border-amber-300 bg-amber-300/20 text-white"
                    : "border-white/15 bg-white/5 text-white/80"
              } ${maxedOut && !mine ? "opacity-40" : ""}`}
            >
              <span className="flex-1 text-lg font-black">
                {slot.value === null ? "Wszyscy przestrzelili" : slot.value.toLocaleString("pl")}
              </span>
              {slot.authorIds.length > 0 && (
                <span className="text-xs">{slot.authorIds.map((id) => avatarFor(id)).join("")}</span>
              )}
              <span className="text-sm font-black text-amber-300">{slot.odds}×</span>
              {mine && <span className="text-sm font-black">{mine.amount}$</span>}
            </button>
          );
        })}
      </div>

      {error && <p className="text-center text-sm font-semibold text-rose-400">{error}</p>}

      {pendingSlot && (
        <div className={`flex flex-col gap-2 p-4 ${card}`}>
          <p className="text-center text-sm font-bold text-white/60">Ile stawiasz?</p>
          <div className="grid grid-cols-5 gap-2">
            {BET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => handleAmount(amount)}
                disabled={amount > left}
                className="rounded-xl border-2 border-black bg-amber-300 py-3 text-sm font-black text-black shadow-[3px_3px_0_0_#000] disabled:opacity-30"
              >
                {amount}
              </button>
            ))}
          </div>
        </div>
      )}

      {maxedOut && (
        <p className="text-center text-xs font-bold text-white/40">
          Masz już {MAX_BETS_PER_ROUND} zakłady. Czekamy na resztę…
        </p>
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

function PhaseHeader({ left, right, note }: { left: string; right: string; note?: string }) {
  return (
    <div className="flex items-center justify-between text-sm font-bold text-white/60">
      <span>{left}</span>
      {note && <span className="text-xs text-white/40">{note}</span>}
      <span className="tabular-nums">{right}</span>
    </div>
  );
}

function PlayerChips({ players }: { players: RfPlayer[] }) {
  return (
    <div className={`w-full max-w-sm p-4 ${card}`}>
      <p className="mb-3 text-base font-black">Stolik ({players.length})</p>
      {players.length === 0 ? (
        <p className="text-sm text-white/50">Czekamy… kto pierwszy? 👀</p>
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          {players.map((p) => (
            <span
              key={p.id}
              className="rounded-full border-2 border-black bg-white px-3 py-1.5 text-sm font-bold text-black shadow-[3px_3px_0_0_#000]"
            >
              {avatarFor(p.id)} {p.nickname}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Standings({ players, meId }: { players: RfPlayer[]; meId: string }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className={`w-full max-w-sm p-4 ${card}`}>
      <p className="mb-3 text-sm font-black text-white/70">Kasa przy stole 💰</p>
      <ol className="flex flex-col gap-2">
        {players.map((p, i) => (
          <li
            key={p.id}
            className={`flex justify-between rounded-xl border px-3 py-2 text-sm ${
              p.id === meId ? "border-amber-300/60 bg-amber-300/10" : "border-white/10 bg-white/5"
            }`}
          >
            <span>
              {medals[i] ?? `${i + 1}.`} {avatarFor(p.id)} {p.nickname}
            </span>
            <span className="font-black">{p.balance}$</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
