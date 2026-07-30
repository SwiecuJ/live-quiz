"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase/client";
import { useCountdown } from "@/lib/useCountdown";
import { ANSWER_STYLES } from "@/lib/answerStyles";
import { avatarFor } from "@/lib/avatar";
import { card, gradientText, primaryButton } from "@/lib/theme";
import { NEXT_QUESTION_DELAY_SECONDS } from "@/lib/constants";
import type { Player, Room } from "@/lib/types";

interface QuestionPayload {
  id: string;
  question_text: string;
  options: string[];
  order_index: number;
  correct_index?: number;
}

interface AnswerRow {
  id: string;
  player_id: string;
  selected_index: number;
  points_awarded: number;
}

interface SummaryQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  order_index: number;
}

interface SummaryAnswer {
  player_id: string;
  question_id: string;
  selected_index: number;
  points_awarded: number;
}

const REFRESH_DEBOUNCE_MS = 200;

export default function HostRoom({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  // Append-only log of every answer INSERT seen over realtime, each tagged
  // with its question_id. Deliberately never reset per-round: filtering by
  // the *current* question's id at read time is what makes "has everyone
  // answered" correct, instead of a Set that gets cleared in one effect
  // and read (still stale) by another effect in the same render pass.
  const [answerEvents, setAnswerEvents] = useState<{ player_id: string; question_id: string }[]>(
    []
  );
  const [roundAnswers, setRoundAnswers] = useState<AnswerRow[]>([]);

  const [starting, setStarting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [resultRevealedAt, setResultRevealedAt] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    questions: SummaryQuestion[];
    answers: SummaryAnswer[];
  } | null>(null);

  const endedRoundKeyRef = useRef<string | null>(null);
  const loadedQuestionKeyRef = useRef<string | null>(null);
  const loadedResultKeyRef = useRef<string | null>(null);
  const advancedKeyRef = useRef<string | null>(null);
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

  // Realtime subscriptions, once we know the room id.
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
      .channel(`host-room-${room.id}`)
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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "answers", filter: `room_id=eq.${room.id}` },
        (payload) => {
          const row = payload.new as { player_id: string; question_id: string };
          setAnswerEvents((prev) => [
            ...prev,
            { player_id: row.player_id, question_id: row.question_id },
          ]);
        }
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
    fetch(`/api/rooms/${roomCode}/question?index=${room.current_question_index}`)
      .then((res) => res.json())
      .then((data) => {
        // The round may have already moved on by the time this resolves --
        // applying a stale response would show the wrong question.
        if (cancelled) return;
        setQuestion(data.question);
        setTotalQuestions(data.totalQuestions);
      });
    return () => {
      cancelled = true;
    };
  }, [room, roomCode]);

  // Fetch the revealed question + answers once a round ends.
  useEffect(() => {
    if (!room || room.status !== "round_result") return;
    const key = `${room.status}-${room.current_question_index}`;
    if (loadedResultKeyRef.current === key) return;
    loadedResultKeyRef.current = key;
    setResultRevealedAt(new Date().toISOString());

    let cancelled = false;
    fetch(
      `/api/rooms/${roomCode}/question?reveal=1&withRoundAnswers=1&index=${room.current_question_index}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setQuestion(data.question);
        setTotalQuestions(data.totalQuestions);
        setRoundAnswers((data.roundAnswers ?? []) as AnswerRow[]);
      });
    return () => {
      cancelled = true;
    };
  }, [room, roomCode]);

  // Fetch the full game recap once it's over.
  useEffect(() => {
    if (!room || room.status !== "finished" || summary) return;
    fetch(`/api/rooms/${roomCode}/summary`)
      .then((res) => res.json())
      .then((data) => setSummary({ questions: data.questions, answers: data.answers }));
  }, [room, roomCode, summary]);

  const { remainingSeconds, fraction, isDone } = useCountdown(
    room?.status === "in_progress" ? room.question_start_at : null,
    room?.round_time_seconds ?? 20
  );

  const nextCountdown = useCountdown(
    room?.status === "round_result" ? resultRevealedAt : null,
    NEXT_QUESTION_DELAY_SECONDS
  );

  // Filtered by the *current* question's id rather than reset-per-round --
  // see the answerEvents state comment above for why that matters.
  const currentQuestionReady = question?.order_index === room?.current_question_index;
  const answeredCount =
    currentQuestionReady && question
      ? answerEvents.filter((e) => e.question_id === question.id).length
      : 0;

  const endRoundOnce = useCallback(() => {
    if (!room) return;
    const key = `${room.status}-${room.current_question_index}`;
    if (endedRoundKeyRef.current === key) return;
    endedRoundKeyRef.current = key;
    fetch(`/api/rooms/${roomCode}/end-round`, { method: "POST" });
  }, [room, roomCode]);

  // Auto end the round once the timer runs out.
  useEffect(() => {
    if (!room || room.status !== "in_progress" || !isDone) return;
    endRoundOnce();
  }, [room, isDone, endRoundOnce]);

  // Auto end the round early once every current player has answered.
  useEffect(() => {
    if (!room || room.status !== "in_progress" || !currentQuestionReady) return;
    if (players.length === 0 || answeredCount < players.length) return;
    endRoundOnce();
  }, [room, players.length, answeredCount, currentQuestionReady, endRoundOnce]);

  // Auto advance to the next question a few seconds after the round result is shown.
  useEffect(() => {
    if (!room || room.status !== "round_result" || !nextCountdown.isDone) return;
    const key = `${room.status}-${room.current_question_index}`;
    if (advancedKeyRef.current === key) return;
    advancedKeyRef.current = key;
    fetch(`/api/rooms/${roomCode}/next`, { method: "POST" });
  }, [room, roomCode, nextCountdown.isDone]);

  async function handleStart() {
    setStarting(true);
    await fetch(`/api/rooms/${roomCode}/start`, { method: "POST" });
    setStarting(false);
  }

  async function handleNext() {
    if (room) {
      advancedKeyRef.current = `${room.status}-${room.current_question_index}`;
    }
    setAdvancing(true);
    await fetch(`/api/rooms/${roomCode}/next`, { method: "POST" });
    setAdvancing(false);
  }

  if (loadError) {
    return <CenteredMessage title="Ups!" message={loadError} />;
  }
  if (!room) {
    return <CenteredMessage title="Chwila…" message="Ogarniam pokój." />;
  }

  const joinUrl =
    typeof window !== "undefined" ? `${window.location.origin}/play/${roomCode}` : "";

  return (
    <div className="flex flex-1 flex-col p-6 text-white">
      {room.status === "lobby" && (
        <LobbyView
          roomCode={roomCode}
          joinUrl={joinUrl}
          players={players}
          starting={starting}
          onStart={handleStart}
        />
      )}

      {room.status === "in_progress" && !currentQuestionReady && (
        <CenteredMessage title="Chwila…" message="Ładuję kolejne pytanie." />
      )}

      {room.status === "in_progress" && question && currentQuestionReady && (
        <QuestionView
          question={question}
          questionNumber={room.current_question_index + 1}
          totalQuestions={totalQuestions}
          remainingSeconds={remainingSeconds}
          fraction={fraction}
          answeredCount={answeredCount}
          totalPlayers={players.length}
        />
      )}

      {room.status === "round_result" && (!question || question.correct_index === undefined) && (
        <CenteredMessage title="Chwila…" message="Podliczam wyniki." />
      )}

      {room.status === "round_result" && question && question.correct_index !== undefined && (
        <RoundResultView
          question={question}
          players={players}
          roundAnswers={roundAnswers}
          isLastQuestion={room.current_question_index + 1 >= totalQuestions}
          advancing={advancing}
          onNext={handleNext}
          nextInSeconds={nextCountdown.remainingSeconds}
        />
      )}

      {room.status === "finished" && <FinalView players={players} summary={summary} />}
    </div>
  );
}

function CenteredMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-white">
      <h1 className="text-3xl font-black">{title}</h1>
      <p className="mt-2 text-lg text-white/60">{message}</p>
    </div>
  );
}

function LobbyView({
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
    <div className="flex flex-1 flex-col items-center justify-center gap-10">
      <div className="text-center">
        <p className="text-xl font-bold text-white/60">Wbijajcie na telefonach 📱</p>
        <p className={`text-6xl font-black tracking-[0.2em] sm:text-8xl ${gradientText}`}>
          {roomCode}
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-12">
        {joinUrl && (
          <div className={`p-4 ${card}`}>
            <div className="rounded-2xl bg-white p-3">
              <QRCodeSVG value={joinUrl} size={200} />
            </div>
          </div>
        )}

        <div className={`min-w-[280px] flex-1 p-4 ${card}`}>
          <p className="mb-3 text-lg font-black">Ekipa ({players.length})</p>
          {players.length === 0 ? (
            <p className="text-white/50">Czekamy… kto pierwszy? 👀</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {players.map((p) => (
                <span
                  key={p.id}
                  className="rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-bold text-black shadow-[3px_3px_0_0_#000]"
                >
                  {avatarFor(p.id)} {p.nickname}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onStart}
        disabled={players.length === 0 || starting}
        className={primaryButton + " text-xl"}
      >
        {starting ? "Startujemy…" : "Zaczynamy! 🎉"}
      </button>
    </div>
  );
}

function QuestionView({
  question,
  questionNumber,
  totalQuestions,
  remainingSeconds,
  fraction,
  answeredCount,
  totalPlayers,
}: {
  question: QuestionPayload;
  questionNumber: number;
  totalQuestions: number;
  remainingSeconds: number;
  fraction: number;
  answeredCount: number;
  totalPlayers: number;
}) {
  return (
    <div className="flex flex-1 flex-col gap-8 py-6">
      <div className="flex items-center justify-between text-lg font-bold text-white/60">
        <span>
          Runda {questionNumber} / {totalQuestions}
        </span>
        <span>
          {answeredCount} / {totalPlayers} strzeliło
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <h2 className="max-w-4xl text-3xl font-extrabold sm:text-5xl">{question.question_text}</h2>
        <div className={`text-6xl font-black tabular-nums ${gradientText}`}>{remainingSeconds}</div>
        <div className="h-2 w-full max-w-xl overflow-hidden rounded-full border-2 border-white/10 bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink-400 via-orange-300 to-lime-300 transition-[width] duration-100 linear"
            style={{ width: `${fraction * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {question.options.map((opt, i) => {
          const style = ANSWER_STYLES[i];
          return (
            <div
              key={i}
              className={`flex items-center gap-4 rounded-2xl border-2 border-black px-5 py-4 text-lg font-black text-black ${style.bg} ${style.shadow}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-lg">
                {style.icon}
              </span>
              {opt}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoundResultView({
  question,
  players,
  roundAnswers,
  isLastQuestion,
  advancing,
  onNext,
  nextInSeconds,
}: {
  question: QuestionPayload;
  players: Player[];
  roundAnswers: AnswerRow[];
  isLastQuestion: boolean;
  advancing: boolean;
  onNext: () => void;
  nextInSeconds: number;
}) {
  const playerById = new Map(players.map((p) => [p.id, p]));

  return (
    <div className="flex flex-1 flex-col items-center gap-8 py-6">
      <h2 className="max-w-4xl text-center text-2xl font-extrabold sm:text-4xl">
        {question.question_text}
      </h2>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
        {question.options.map((opt, i) => {
          const style = ANSWER_STYLES[i];
          const isCorrect = i === question.correct_index;
          return (
            <div
              key={i}
              className={`flex items-center gap-4 rounded-2xl border-2 border-black px-5 py-4 text-lg font-black transition-opacity ${
                isCorrect
                  ? `text-black ${style.bg} ${style.shadow}`
                  : "border-white/10 bg-white/5 text-white/40"
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-lg">
                {style.icon}
              </span>
              {opt}
              {isCorrect && <span className="ml-auto">✓ To ta!</span>}
            </div>
          );
        })}
      </div>

      <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-2">
        <div className={`p-4 ${card}`}>
          <p className="mb-3 text-lg font-black">Ta runda 🔥</p>
          <ol className="flex flex-col gap-2">
            {roundAnswers.map((a) => (
              <li
                key={a.id}
                className="flex justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <span>
                  {avatarFor(a.player_id)} {playerById.get(a.player_id)?.nickname ?? "?"}
                </span>
                <span className={`font-black ${gradientText}`}>+{a.points_awarded}</span>
              </li>
            ))}
            {roundAnswers.length === 0 && (
              <p className="text-white/50">Cisza… nikt nie strzelił 🦗</p>
            )}
          </ol>
        </div>

        <div className={`p-4 ${card}`}>
          <p className="mb-3 text-lg font-black">Tabela wyników 🏆</p>
          <ol className="flex flex-col gap-2">
            {players.map((p, i) => (
              <li
                key={p.id}
                className="flex justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <span>
                  {i + 1}. {avatarFor(p.id)} {p.nickname}
                </span>
                <span className="font-black">{p.total_score}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <button onClick={onNext} disabled={advancing} className={primaryButton + " text-xl"}>
          {advancing ? "Ładuję…" : isLastQuestion ? "Zobacz wyniki! 🏁" : "Dalej! ➡️"}
        </button>
        {!advancing && (
          <p className="text-sm text-white/40">
            {isLastQuestion ? "Wyniki" : "Lecimy dalej"} za {Math.max(0, nextInSeconds)}s ⏱️
          </p>
        )}
      </div>
    </div>
  );
}

function FinalView({
  players,
  summary,
}: {
  players: Player[];
  summary: { questions: SummaryQuestion[]; answers: SummaryAnswer[] } | null;
}) {
  const router = useRouter();
  const podium = players.slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];
  const playerById = new Map(players.map((p) => [p.id, p]));

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 py-6">
      <h2 className={`text-4xl font-black sm:text-5xl ${gradientText}`}>I po quizie! 🎉</h2>

      <div className="flex items-end gap-4">
        {podium.map((p, i) => (
          <div key={p.id} className="flex flex-col items-center gap-2">
            <span className="text-4xl">{medals[i]}</span>
            <div
              className={`flex w-28 flex-col items-center justify-end rounded-t-2xl border-2 border-black bg-white/5 p-3 ${
                i === 0 ? "h-40" : i === 1 ? "h-32" : "h-24"
              }`}
            >
              <span className="text-center font-black">
                {avatarFor(p.id)} {p.nickname}
              </span>
              <span className="text-sm text-white/60">{p.total_score}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={`w-full max-w-md p-4 ${card}`}>
        <ol className="flex flex-col gap-2">
          {players.map((p, i) => (
            <li
              key={p.id}
              className="flex justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            >
              <span>
                {i + 1}. {avatarFor(p.id)} {p.nickname}
              </span>
              <span className="font-black">{p.total_score}</span>
            </li>
          ))}
        </ol>
      </div>

      {summary && (
        <div className={`w-full max-w-3xl p-4 ${card}`}>
          <p className="mb-4 text-lg font-black">Podsumowanie pytań 📋</p>
          <div className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto pr-1">
            {summary.questions.map((q) => {
              const top3 = summary.answers
                .filter((a) => a.question_id === q.id)
                .sort((a, b) => b.points_awarded - a.points_awarded)
                .slice(0, 3);
              return (
                <div
                  key={q.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 text-left"
                >
                  <p className="font-bold">
                    {q.order_index + 1}. {q.question_text}
                  </p>
                  <p className="mt-1 text-sm text-emerald-300">✓ {q.options[q.correct_index]}</p>
                  <ol className="mt-2 flex flex-col gap-1">
                    {top3.map((a, i) => (
                      <li
                        key={a.player_id}
                        className="flex justify-between text-sm text-white/80"
                      >
                        <span>
                          {i + 1}. {avatarFor(a.player_id)}{" "}
                          {playerById.get(a.player_id)?.nickname ?? "?"}
                        </span>
                        <span className="font-bold">+{a.points_awarded}</span>
                      </li>
                    ))}
                    {top3.length === 0 && (
                      <li className="text-sm text-white/40">Nikt nie odpowiedział 🦗</li>
                    )}
                  </ol>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button onClick={() => router.push("/")} className={primaryButton + " text-lg"}>
        Nowy quiz 🔁
      </button>
    </div>
  );
}
