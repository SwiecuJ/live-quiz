"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import { useCountdown } from "@/lib/useCountdown";
import { ANSWER_STYLES } from "@/lib/answerStyles";
import { avatarFor } from "@/lib/avatar";
import { card, gradientText, primaryButton, inputBase } from "@/lib/theme";
import { NEXT_QUESTION_DELAY_SECONDS } from "@/lib/constants";
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

function storageKey(roomCode: string) {
  return `live-quiz-player-${roomCode}`;
}

export default function PlayRoom({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [player, setPlayer] = useState<Player | null>(null);
  const [nickname, setNickname] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [players, setPlayers] = useState<Player[]>([]);
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Keyed by question_id rather than reset-per-round: a round transition
  // can't corrupt a previous round's entry, and a late-arriving reveal
  // response can't overwrite the wrong round's answer either. Same fix as
  // HostRoom's answered-count tracking, applied to "what did *I* pick".
  const [myAnswers, setMyAnswers] = useState<Record<string, MyAnswer>>({});
  const [answering, setAnswering] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [resultRevealedAt, setResultRevealedAt] = useState<string | null>(null);

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
  useEffect(() => {
    if (!room || room.status !== "round_result" || !player) return;
    const key = `${room.status}-${room.current_question_index}`;
    if (loadedResultKeyRef.current === key) return;
    loadedResultKeyRef.current = key;
    setResultRevealedAt(new Date().toISOString());

    let cancelled = false;
    fetch(
      `/api/rooms/${roomCode}/question?reveal=1&index=${room.current_question_index}&playerId=${player.id}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setQuestion(data.question);
        setTotalQuestions(data.totalQuestions);
        // Keyed by question_id, so this can never clobber a different
        // round's entry even if it arrives late.
        setMyAnswers((prev) => ({
          ...prev,
          [data.question.id]: {
            selectedIndex: data.yourAnswer?.selected_index ?? -1,
            points: data.yourAnswer?.points_awarded ?? 0,
          },
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [room, roomCode, player]);

  const { remainingSeconds, fraction } = useCountdown(
    room?.status === "in_progress" ? room.question_start_at : null,
    room?.round_time_seconds ?? 20
  );

  const nextCountdown = useCountdown(
    room?.status === "round_result" ? resultRevealedAt : null,
    NEXT_QUESTION_DELAY_SECONDS
  );

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!room || !nickname.trim() || joining) return;

    setJoining(true);
    setJoinError(null);

    const { data, error } = await supabase
      .from("players")
      .insert({ room_id: room.id, nickname: nickname.trim().slice(0, 20) })
      .select()
      .single();

    setJoining(false);

    if (error || !data) {
      setJoinError("Nie wyszło, spróbuj jeszcze raz 😅");
      return;
    }

    localStorage.setItem(storageKey(roomCode), data.id);
    setPlayer(data as Player);
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
        nickname={nickname}
        setNickname={setNickname}
        joining={joining}
        joinError={joinError}
        onJoin={handleJoin}
      />
    );
  }

  if (room.status === "lobby") {
    return (
      <CenteredMessage
        title={`${avatarFor(player.id)} ${player.nickname}!`}
        message="Czekaj na start, zaraz się zaczyna 🔥"
      />
    );
  }

  // Guard against a stale `question` from the previous round while the new
  // one is still loading -- otherwise a fast tap can insert an answer
  // against the wrong question_id, which then shows up as "no answer".
  const currentQuestionReady = question?.order_index === room.current_question_index;
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

  const roundResultReady =
    question && currentQuestionReady && question.correct_index !== undefined && myAnswer;

  if (room.status === "round_result" && !roundResultReady) {
    return <CenteredMessage title="Chwila…" message="Sprawdzam Twoją odpowiedź." />;
  }

  if (room.status === "round_result" && question && roundResultReady) {
    const rank = players.findIndex((p) => p.id === player.id) + 1;
    const answered = myAnswer!.selectedIndex >= 0;
    const isCorrect = answered && myAnswer!.selectedIndex === question.correct_index;
    return (
      <RoundResultView
        question={question}
        selectedIndex={answered ? myAnswer!.selectedIndex : null}
        isCorrect={isCorrect}
        answered={answered}
        points={myAnswer!.points ?? 0}
        totalScore={players.find((p) => p.id === player.id)?.total_score ?? player.total_score}
        rank={rank || null}
        totalPlayers={players.length}
        nextInSeconds={nextCountdown.remainingSeconds}
      />
    );
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
  nickname,
  setNickname,
  joining,
  joinError,
  onJoin,
}: {
  roomCode: string;
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

      <div className="grid w-full max-w-sm grid-cols-1 gap-2">
        {question.options.map((opt, i) => {
          const style = ANSWER_STYLES[i];
          const isRightAnswer = i === question.correct_index;
          const wasPicked = i === selectedIndex;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-black ${
                isRightAnswer
                  ? `border-black text-black ${style.bg} ${style.shadow}`
                  : wasPicked
                    ? "border-rose-400 bg-rose-400/20 text-rose-200"
                    : "border-white/10 bg-white/5 text-white/40"
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-base">
                {style.icon}
              </span>
              <span className="flex-1">{opt}</span>
              {isRightAnswer && <span>✓ To ta!</span>}
              {wasPicked && !isRightAnswer && <span>👈 Ty</span>}
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
}: {
  nickname: string;
  avatar: string;
  rank: number | null;
  totalScore: number;
}) {
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
      <p className="text-sm text-white/40">Czekaj, aż host odpali nowy quiz 🎉</p>
    </div>
  );
}
