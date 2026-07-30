"use client";

import { useEffect, useRef, useState, useSyncExternalStore, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase/client";
import { useGameDriver } from "@/lib/useGameDriver";
import { ANSWER_STYLES } from "@/lib/answerStyles";
import { avatarFor } from "@/lib/avatar";
import { card, gradientText, primaryButton, inputBase } from "@/lib/theme";
import { isMarkedHost, markAsHost } from "@/lib/hostStorage";
import { getDeviceId, getSavedNickname, saveNickname } from "@/lib/identity";
import type { Player, Room } from "@/lib/types";

interface QuestionPayload {
  id: string;
  question_text: string;
  options: string[];
  order_index: number;
  correct_index?: number;
}

interface MyAnswer {
  selectedIndex: number;
  points: number | null;
}

const REFRESH_DEBOUNCE_MS = 200;
// How long a freshly-arrived round result stays on screen before yielding
// to whatever the live room state has since moved on to. Without this, a
// round result that finishes loading right as the host auto-advances would
// otherwise get skipped entirely -- see the resultToShow comment below.
const RESULT_DISPLAY_MS = 7000;

function storageKey(roomCode: string) {
  return `live-quiz-player-${roomCode}`;
}

// The host marker lives in localStorage, which doesn't exist while this
// renders on the server. useSyncExternalStore is how you read that safely:
// the server snapshot is "not host", so the markup matches on hydration and
// then corrects itself on the client. It never changes underneath us, hence
// the no-op subscribe.
const noopSubscribe = () => () => {};

export default function PlayRoom({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [player, setPlayer] = useState<Player | null>(null);
  // Falls back to the nickname this device used last time, so a returning
  // player just taps through. Read via the store (not an initial useState
  // value) because localStorage doesn't exist during the server render;
  // `typedNickname` stays null until they actually edit it.
  const savedNickname = useSyncExternalStore(noopSubscribe, getSavedNickname, () => "");
  const [typedNickname, setTypedNickname] = useState<string | null>(null);
  const nickname = typedNickname ?? savedNickname;
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Whether this phone is also running the game: either it created the room,
  // or someone tapped "I'm hosting" in the lobby.
  const storedHost = useSyncExternalStore(
    noopSubscribe,
    () => isMarkedHost(roomCode),
    () => false
  );
  const [claimedHost, setClaimedHost] = useState(false);
  const isHost = storedHost || claimedHost;
  const [starting, setStarting] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Keyed by question_id rather than reset-per-round: a round transition
  // can't corrupt a previous round's entry, and a late-arriving reveal
  // response can't overwrite the wrong round's answer either.
  const [myAnswers, setMyAnswers] = useState<Record<string, MyAnswer>>({});
  const [answering, setAnswering] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);

  // The round result to actually display right now, independent of what
  // room.status has moved on to. Set the moment reveal data for a round
  // arrives and cleared after RESULT_DISPLAY_MS -- so a round the host
  // advances past quickly still gets shown to this player for a beat
  // instead of being skipped entirely.
  const [resultToShow, setResultToShow] = useState<{
    question: QuestionPayload;
    myAnswer: MyAnswer;
  } | null>(null);
  const resultToShowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadedQuestionKeyRef = useRef<string | null>(null);
  const loadedResultKeyRef = useRef<string | null>(null);
  const refreshPlayersTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial room load.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("rooms")
      .select("*")
      .eq("code", roomCode)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setLoadError("Nie ma takiego pokoju. Sprawdź kod 👀");
          return;
        }
        setRoom(data as Room);
      });
    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  // Restore a previous join (e.g. after refresh) from localStorage.
  useEffect(() => {
    if (!room?.id) return;
    const savedId = localStorage.getItem(storageKey(roomCode));
    if (!savedId) return;

    supabase
      .from("players")
      .select("*")
      .eq("id", savedId)
      .eq("room_id", room.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPlayer(data as Player);
      });
  }, [room?.id, roomCode]);

  // Realtime subscriptions.
  useEffect(() => {
    if (!room?.id) return;

    const fetchPlayersNow = () => {
      supabase
        .from("players")
        .select("*")
        .eq("room_id", room.id)
        .order("total_score", { ascending: false })
        .then(({ data }) => data && setPlayers(data as Player[]));
    };
    fetchPlayersNow();

    // Debounced: a scoring pass updates every player's row in quick
    // succession, which would otherwise trigger one full refetch per row.
    const refreshPlayers = () => {
      if (refreshPlayersTimeoutRef.current) clearTimeout(refreshPlayersTimeoutRef.current);
      refreshPlayersTimeoutRef.current = setTimeout(fetchPlayersNow, REFRESH_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`play-room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => setRoom(payload.new as Room)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${room.id}` },
        refreshPlayers
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (refreshPlayersTimeoutRef.current) clearTimeout(refreshPlayersTimeoutRef.current);
    };
  }, [room?.id]);

  // Fetch the question when a new round starts.
  useEffect(() => {
    if (!room || room.status !== "in_progress") return;
    const key = `${room.status}-${room.current_question_index}`;
    if (loadedQuestionKeyRef.current === key) return;
    loadedQuestionKeyRef.current = key;

    let cancelled = false;
    setQuestion(null);
    setAnswerError(null);
    // A new round is live, so the previous round's buffered result has had
    // its moment -- drop it now rather than letting its timer run on and
    // eat into the time available to answer this question.
    if (resultToShowTimeoutRef.current) clearTimeout(resultToShowTimeoutRef.current);
    setResultToShow(null);
    fetch(`/api/rooms/${roomCode}/question?index=${room.current_question_index}`)
      .then((res) => res.json())
      .then((data) => {
        // The round may have already moved on by the time this resolves
        // (real network latency + fast auto-advance) -- applying a stale
        // response here would show the wrong question for the round.
        if (cancelled) return;
        setQuestion(data.question);
        setTotalQuestions(data.totalQuestions);
      });
    return () => {
      cancelled = true;
    };
  }, [room, roomCode]);

  // Fetch the revealed answer + own score once the round ends. One request
  // (not two sequential ones) -- see the route's own comment for why that
  // matters on a slow connection.
  //
  // Deliberately no cancellation guard here: unlike the question-fetch
  // effect above, a "late" response here is still exactly what we want to
  // show (see resultToShow) even if the host has since auto-advanced past
  // it -- guarding it out was the bug, not the fix.
  useEffect(() => {
    if (!room || room.status !== "round_result" || !player) return;
    const key = `${room.status}-${room.current_question_index}`;
    if (loadedResultKeyRef.current === key) return;
    loadedResultKeyRef.current = key;

    fetch(
      `/api/rooms/${roomCode}/question?reveal=1&index=${room.current_question_index}&playerId=${player.id}`
    )
      .then((res) => res.json())
      .then((data) => {
        const revealedAnswer: MyAnswer = {
          selectedIndex: data.yourAnswer?.selected_index ?? -1,
          points: data.yourAnswer?.points_awarded ?? 0,
        };
        setMyAnswers((prev) => ({ ...prev, [data.question.id]: revealedAnswer }));

        setResultToShow({ question: data.question, myAnswer: revealedAnswer });
        if (resultToShowTimeoutRef.current) clearTimeout(resultToShowTimeoutRef.current);
        resultToShowTimeoutRef.current = setTimeout(() => setResultToShow(null), RESULT_DISPLAY_MS);
      });
  }, [room, roomCode, player]);

  // Clear any pending "hide the buffered result" timeout on unmount.
  useEffect(() => {
    return () => {
      if (resultToShowTimeoutRef.current) clearTimeout(resultToShowTimeoutRef.current);
    };
  }, []);

  // Guard against a stale `question` from the previous round while the new
  // one is still loading -- otherwise a fast tap can insert an answer
  // against the wrong question_id, which then shows up as "no answer".
  const currentQuestionReady = question?.order_index === room?.current_question_index;

  // When this phone is the host it runs the exact same game logic the big
  // screen does; otherwise the hook just supplies the countdown for display.
  const { remainingSeconds, fraction, nextInSeconds } = useGameDriver({
    roomCode,
    room,
    questionId: currentQuestionReady && question ? question.id : null,
    playerCount: players.length,
    isDriver: isHost,
  });

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!room || !nickname.trim() || joining) return;

    setJoining(true);
    setJoinError(null);

    const trimmed = nickname.trim().slice(0, 20);
    let { data, error } = await supabase
      .from("players")
      .insert({ room_id: room.id, nickname: trimmed, device_id: getDeviceId() })
      .select()
      .single();

    // If the 0002 migration hasn't been applied yet there's no device_id
    // column, and rejecting the join over that would lock everyone out of
    // the game. Fall back to joining without the identity -- they play
    // normally, they just don't accrue an all-time score.
    if (error && (error.code === "PGRST204" || error.code === "42703")) {
      ({ data, error } = await supabase
        .from("players")
        .insert({ room_id: room.id, nickname: trimmed })
        .select()
        .single());
    }

    setJoining(false);

    if (error || !data) {
      setJoinError("Nie wyszło, spróbuj jeszcze raz 😅");
      return;
    }

    saveNickname(trimmed);
    localStorage.setItem(storageKey(roomCode), data.id);
    setPlayer(data as Player);
  }

  async function handleStart() {
    setStarting(true);
    await fetch(`/api/rooms/${roomCode}/start`, { method: "POST" });
    setStarting(false);
  }

  function handleClaimHost() {
    markAsHost(roomCode);
    setClaimedHost(true);
  }

  async function handleAnswer(index: number) {
    if (!player || !question || answering || myAnswers[question.id]) return;
    setAnswering(true);
    setAnswerError(null);
    const questionId = question.id;
    setMyAnswers((prev) => ({ ...prev, [questionId]: { selectedIndex: index, points: null } }));

    const { error } = await supabase.from("answers").insert({
      player_id: player.id,
      question_id: questionId,
      room_id: room!.id,
      selected_index: index,
    });

    setAnswering(false);
    if (error) {
      if (error.code === "23505") {
        // Unique violation -- this question was already answered (e.g. a
        // reconnect replaying the tap). The DB copy is the real one, so
        // just keep the UI locked, nothing to retry.
        return;
      }
      // A genuine failure (network blip etc.) -- nothing was recorded, so
      // unlock the UI and let them tap again instead of silently stranding
      // them in a "locked but never actually answered" state.
      setMyAnswers((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
      setAnswerError("Nie wysłało się, spróbuj jeszcze raz 😬");
    }
  }

  if (loadError) {
    return <CenteredMessage title="Ups!" message={loadError} />;
  }
  if (!room) {
    return <CenteredMessage title="Chwila…" message="Ogarniam pokój." />;
  }

  if (!player) {
    return (
      <JoinView
        roomCode={roomCode}
        isHost={isHost}
        nickname={nickname}
        setNickname={setTypedNickname}
        joining={joining}
        joinError={joinError}
        onJoin={handleJoin}
      />
    );
  }

  if (room.status === "lobby") {
    const joinUrl =
      typeof window !== "undefined" ? `${window.location.origin}/play/${roomCode}` : "";
    return isHost ? (
      <HostLobbyView
        roomCode={roomCode}
        joinUrl={joinUrl}
        players={players}
        starting={starting}
        onStart={handleStart}
      />
    ) : (
      <WaitingView
        player={player}
        roomCode={roomCode}
        players={players}
        onClaimHost={handleClaimHost}
      />
    );
  }

  // A buffered round result takes priority over whatever room.status has
  // moved on to in the meantime -- that's the whole point (see the
  // resultToShow state comment above).
  if (resultToShow) {
    const rank = players.findIndex((p) => p.id === player.id) + 1;
    const answered = resultToShow.myAnswer.selectedIndex >= 0;
    const isCorrect =
      answered && resultToShow.myAnswer.selectedIndex === resultToShow.question.correct_index;
    return (
      <RoundResultView
        question={resultToShow.question}
        selectedIndex={answered ? resultToShow.myAnswer.selectedIndex : null}
        isCorrect={isCorrect}
        answered={answered}
        points={resultToShow.myAnswer.points ?? 0}
        totalScore={players.find((p) => p.id === player.id)?.total_score ?? player.total_score}
        rank={rank || null}
        totalPlayers={players.length}
        nextInSeconds={nextInSeconds}
      />
    );
  }

  const myAnswer = question ? myAnswers[question.id] : undefined;

  if (room.status === "in_progress" && !currentQuestionReady) {
    return <CenteredMessage title="Chwila…" message="Ładuję kolejne pytanie." />;
  }

  if (room.status === "in_progress" && question && currentQuestionReady) {
    return (
      <AnswerView
        question={question}
        questionNumber={room.current_question_index + 1}
        totalQuestions={totalQuestions}
        remainingSeconds={remainingSeconds}
        fraction={fraction}
        selectedIndex={myAnswer?.selectedIndex ?? null}
        answerError={answerError}
        onAnswer={handleAnswer}
      />
    );
  }

  if (room.status === "round_result") {
    return <CenteredMessage title="Chwila…" message="Sprawdzam Twoją odpowiedź." />;
  }

  if (room.status === "finished") {
    const rank = players.findIndex((p) => p.id === player.id) + 1;
    const totalScore = players.find((p) => p.id === player.id)?.total_score ?? player.total_score;
    return (
      <FinalView
        nickname={player.nickname}
        avatar={avatarFor(player.id)}
        rank={rank || null}
        totalScore={totalScore}
        isHost={isHost}
        players={players}
      />
    );
  }

  return <CenteredMessage title="Chwila…" message="Ogarniam grę…" />;
}

function CenteredMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-white">
      <h1 className="text-2xl font-black">{title}</h1>
      <p className="mt-2 text-white/60">{message}</p>
    </div>
  );
}

function JoinView({
  roomCode,
  isHost,
  nickname,
  setNickname,
  joining,
  joinError,
  onJoin,
}: {
  roomCode: string;
  isHost: boolean;
  nickname: string;
  setNickname: (v: string) => void;
  joining: boolean;
  joinError: string | null;
  onJoin: (e: FormEvent) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-white">
      <p className="text-lg font-bold text-white/50">
        Pokój <span className={`font-black ${gradientText}`}>{roomCode}</span>
      </p>
      <form onSubmit={onJoin} className={`flex w-full max-w-sm flex-col gap-4 p-6 ${card}`}>
        {isHost && (
          <p className="-mt-1 text-center text-xs font-black uppercase tracking-widest text-lime-300">
            🎛️ Hostujesz z telefonu
          </p>
        )}
        <h1 className="text-center text-xl font-black text-white">Jak Cię zawołać? 👋</h1>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={20}
          placeholder="Twoja ksywka"
          autoFocus
          className={`text-center text-lg font-bold ${inputBase}`}
          required
        />
        {joinError && <p className="text-center text-sm font-semibold text-rose-400">{joinError}</p>}
        <button type="submit" disabled={joining} className={primaryButton + " text-lg"}>
          {joining ? "Wskakuję…" : "Wskakuję!"}
        </button>
      </form>
    </div>
  );
}

/** Lobby as seen by the organiser hosting from their own phone. */
function HostLobbyView({
  roomCode,
  joinUrl,
  players,
  starting,
  onStart,
}: {
  roomCode: string;
  joinUrl: string;
  players: Player[];
  starting: boolean;
  onStart: () => void;
}) {
  return (
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

      <div className={`w-full max-w-sm p-4 ${card}`}>
        <p className="mb-3 text-base font-black">Ekipa ({players.length})</p>
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

      <button
        onClick={onStart}
        disabled={players.length === 0 || starting}
        className={primaryButton + " text-lg"}
      >
        {starting ? "Startujemy…" : "Zaczynamy! 🎉"}
      </button>
    </div>
  );
}

/** Lobby as seen by an ordinary player waiting for the organiser. */
function WaitingView({
  player,
  roomCode,
  players,
  onClaimHost,
}: {
  player: Player;
  roomCode: string;
  players: Player[];
  onClaimHost: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-white">
      <h1 className="text-2xl font-black">
        {avatarFor(player.id)} {player.nickname}!
      </h1>
      <p className="text-white/60">Czekaj na start, zaraz się zaczyna 🔥</p>

      <div className={`mt-2 w-full max-w-sm p-4 ${card}`}>
        <p className="mb-3 text-sm font-black text-white/70">Ekipa ({players.length})</p>
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
      </div>

      <button
        onClick={onClaimHost}
        className="mt-2 text-sm font-bold text-white/40 underline underline-offset-4"
      >
        To ja hostuję pokój {roomCode} 🎛️
      </button>
    </div>
  );
}

function AnswerView({
  question,
  questionNumber,
  totalQuestions,
  remainingSeconds,
  fraction,
  selectedIndex,
  answerError,
  onAnswer,
}: {
  question: QuestionPayload;
  questionNumber: number;
  totalQuestions: number;
  remainingSeconds: number;
  fraction: number;
  selectedIndex: number | null;
  answerError: string | null;
  onAnswer: (index: number) => void;
}) {
  const hasAnswered = selectedIndex !== null;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 text-white">
      {answerError && (
        <p className="rounded-xl border-2 border-black bg-rose-400 px-4 py-2 text-center text-sm font-bold text-black shadow-[3px_3px_0_0_#000]">
          {answerError}
        </p>
      )}
      <div className="flex items-center justify-between text-sm font-bold text-white/60">
        <span>
          Runda {questionNumber} / {totalQuestions}
        </span>
        <span className="tabular-nums">{remainingSeconds}s</span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full border-2 border-white/10 bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pink-400 via-orange-300 to-lime-300 transition-[width] duration-100 linear"
          style={{ width: `${fraction * 100}%` }}
        />
      </div>

      <h2 className="flex-1 items-center px-1 py-4 text-center text-2xl font-extrabold leading-snug">
        {question.question_text}
      </h2>

      {hasAnswered && (
        <p className="text-center text-sm font-bold text-white/60">
          Strzelone! 🎯 Czekamy na resztę ekipy…
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {question.options.map((opt, i) => {
          const style = ANSWER_STYLES[i];
          const isPicked = i === selectedIndex;
          return (
            <button
              key={i}
              onClick={() => onAnswer(i)}
              disabled={hasAnswered}
              className={`flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-black px-3 py-4 text-center text-lg font-black text-black transition-all active:scale-95 disabled:active:scale-100 ${style.bg} ${style.shadow} ${
                hasAnswered && !isPicked ? "opacity-40" : ""
              } ${isPicked ? "ring-4 ring-white" : ""}`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-black bg-white text-2xl">
                {style.icon}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RoundResultView({
  question,
  selectedIndex,
  isCorrect,
  answered,
  points,
  totalScore,
  rank,
  totalPlayers,
  nextInSeconds,
}: {
  question: QuestionPayload;
  selectedIndex: number | null;
  isCorrect: boolean;
  answered: boolean;
  points: number;
  totalScore: number;
  rank: number | null;
  totalPlayers: number;
  nextInSeconds: number;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-4 p-4 text-center text-white">
      <p className="text-5xl">{!answered ? "🤐" : isCorrect ? "🎯" : "😅"}</p>
      <h1 className="text-2xl font-black">
        {!answered ? "Bez odpowiedzi" : isCorrect ? "W punkt!" : "Kulą w płot"}
      </h1>
      <p className={`text-xl font-black ${gradientText}`}>+{points} pkt</p>

      {/* Same 2x2 arrangement, tile shape and colour order as the answering
          screen, so each option stays exactly where it was a second ago and
          the eye can go straight to the one it tapped. */}
      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        {question.options.map((opt, i) => {
          const style = ANSWER_STYLES[i];
          const isRightAnswer = i === question.correct_index;
          const wasPicked = i === selectedIndex;
          return (
            <div
              key={i}
              className={`flex min-h-[110px] flex-col items-center justify-center gap-2 break-words rounded-2xl border-2 px-2 py-3 text-center text-sm font-black leading-tight ${
                isRightAnswer
                  ? `border-black text-black ${style.bg} ${style.shadow}`
                  : wasPicked
                    ? "border-rose-400 bg-rose-400/20 text-rose-200"
                    : "border-white/10 bg-white/5 text-white/40"
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-xl">
                {style.icon}
              </span>
              <span>{opt}</span>
              {isRightAnswer && <span className="text-xs">✓ To ta!</span>}
              {wasPicked && !isRightAnswer && <span className="text-xs">👈 Twoja</span>}
            </div>
          );
        })}
      </div>

      <div className={`mt-2 px-6 py-4 ${card}`}>
        <p className="text-lg">
          Twój wynik: <span className="font-black">{totalScore}</span>
        </p>
        {rank && (
          <p className="text-white/60">
            {rank} miejsce z {totalPlayers}
          </p>
        )}
      </div>

      <p className="text-sm text-white/40">Kolejne pytanie za {Math.max(0, nextInSeconds)}s ⏱️</p>
    </div>
  );
}

function FinalView({
  nickname,
  avatar,
  rank,
  totalScore,
  isHost,
  players,
}: {
  nickname: string;
  avatar: string;
  rank: number | null;
  totalScore: number;
  isHost: boolean;
  players: Player[];
}) {
  const router = useRouter();
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-white">
      <p className="text-6xl">🏁</p>
      <h1 className={`text-3xl font-black ${gradientText}`}>Koniec gry! 🎉</h1>
      <p className="text-xl">
        {avatar} {nickname}
      </p>
      {rank && <p className="text-2xl font-black">{rank} miejsce!</p>}
      <p className="text-lg">
        Ostateczny wynik: <span className="font-black">{totalScore}</span>
      </p>

      {/* Without a big screen there's nowhere else to see the final table. */}
      {isHost && (
        <div className={`mt-2 w-full max-w-sm p-4 ${card}`}>
          <p className="mb-3 text-sm font-black text-white/70">Tabela końcowa 🏆</p>
          <ol className="flex flex-col gap-2">
            {players.map((p, i) => (
              <li
                key={p.id}
                className="flex justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                <span>
                  {medals[i] ?? `${i + 1}.`} {avatarFor(p.id)} {p.nickname}
                </span>
                <span className="font-black">{p.total_score}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {isHost ? (
        <button onClick={() => router.push("/")} className={primaryButton + " mt-2 text-lg"}>
          Nowy quiz 🔁
        </button>
      ) : (
        <p className="text-sm text-white/40">Czekaj, aż host odpali nowy quiz 🎉</p>
      )}
    </div>
  );
}
