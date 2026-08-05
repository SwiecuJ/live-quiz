"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { card, gradientText, primaryButton, inputBase } from "@/lib/theme";
import { markAsHost } from "@/lib/hostStorage";
import { avatarsFor } from "@/lib/avatar";

const ROUND_OPTIONS = [5, 10, 15] as const;
const MEDALS = ["🥇", "🥈", "🥉"];
type HostMode = "screen" | "phone";

interface Leader {
  nickname: string;
  total_score: number;
  games_played: number;
}

export default function Home() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [rounds, setRounds] = useState<(typeof ROUND_OPTIONS)[number]>(10);
  const [hostMode, setHostMode] = useState<HostMode>("screen");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const [leaders, setLeaders] = useState<Leader[]>([]);
  // Keyed by nickname here -- the all-time table has no player rows behind it.
  const avatar = avatarsFor(leaders.map((l) => l.nickname));

  useEffect(() => {
    let cancelled = false;
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setLeaders(data.leaders ?? []);
      })
      .catch(() => {
        // Nothing to show is a fine outcome here -- the section just stays hidden.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || creating) return;

    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), rounds }),
      });
      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error ?? "Coś nie wyszło, spróbuj jeszcze raz 😅");
        setCreating(false);
        return;
      }

      if (hostMode === "phone") {
        // This device runs the game AND plays, so it goes to the player
        // screen -- the host lobby there shows the QR for everyone else.
        markAsHost(data.roomCode);
        router.push(`/play/${data.roomCode}`);
      } else {
        router.push(`/host/${data.roomCode}`);
      }
    } catch {
      setCreateError("Ups, sieć się posypała. Spróbuj ponownie.");
      setCreating(false);
    }
  }

  function handleJoin(e: FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setJoinError("Wpisz kod, bez tego nie wejdziesz 👀");
      return;
    }
    router.push(`/play/${code}`);
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="absolute right-4 top-4 flex flex-col items-end gap-2 sm:right-6 sm:top-6 sm:flex-row">
        <Link
          href="/rf"
          className="rotate-2 rounded-full border-2 border-black bg-amber-300 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-black shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5 sm:text-sm"
        >
          🎲 Ryzyk Fizyk
        </Link>
        <Link
          href="/mafia"
          className="-rotate-2 rounded-full border-2 border-black bg-rose-400 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-black shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5 sm:text-sm"
        >
          🔪 Mafia
        </Link>
      </div>

      <div className="mt-14 w-full max-w-3xl text-center sm:mt-0">
        <span className="inline-block -rotate-2 rounded-full border-2 border-black bg-lime-300 px-4 py-1 text-xs font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_#000]">
          Quiz na żywo, gotowy w 10 sekund ⚡
        </span>
        <h1 className={`mt-5 text-6xl font-black tracking-tight sm:text-7xl ${gradientText}`}>
          Quizownia
        </h1>
        <p className="mt-3 text-lg text-white/60">
          Wrzuć temat, pytania zrobią się same. Albo wskakuj do gry kumpla kodem 🎉
        </p>
      </div>

      <div className="mt-12 grid w-full max-w-3xl gap-6 sm:grid-cols-2">
        <form onSubmit={handleCreate} className={`flex flex-col gap-4 p-6 ${card}`}>
          <h2 className="text-xl font-black text-white">Zrób quiza 🎲</h2>

          <label className="flex flex-col gap-2 text-left text-sm font-semibold text-white/70">
            O czym ma być?
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="np. imprezowe ciekawostki, seriale, memy…"
              rows={3}
              className={`resize-none ${inputBase}`}
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-left text-sm font-semibold text-white/70">
            Ile pytań?
            <select
              value={rounds}
              onChange={(e) =>
                setRounds(Number(e.target.value) as (typeof ROUND_OPTIONS)[number])
              }
              className={inputBase}
            >
              {ROUND_OPTIONS.map((n) => (
                <option key={n} value={n} className="bg-[#0a0a0c]">
                  {n}
                </option>
              ))}
            </select>
          </label>

          {/* Hosting from the big screen is the default; playing along is the
              opt-in, so it's fine print rather than an equal-weight choice. */}
          <div className="flex flex-col gap-1 text-left">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-white/45 transition-colors hover:text-white/70">
              <input
                type="checkbox"
                checked={hostMode === "phone"}
                onChange={(e) => setHostMode(e.target.checked ? "phone" : "screen")}
                className="h-3.5 w-3.5 shrink-0 accent-lime-300"
              />
              Gram i hostuję z tego urządzenia 📱
            </label>
            <p className="text-[11px] font-medium leading-snug text-white/30">
              {hostMode === "phone"
                ? "Kod QR pokażesz na swoim ekranie i grasz razem z ekipą."
                : "Bez tego ten ekran tylko wyświetla pytania — Ty prowadzisz."}
            </p>
          </div>

          {createError && <p className="text-sm font-semibold text-rose-400">{createError}</p>}

          <button type="submit" disabled={creating} className={`mt-2 ${primaryButton}`}>
            {creating ? "Wymyślam pytania…" : "Odpalamy! 🚀"}
          </button>
        </form>

        <form onSubmit={handleJoin} className={`flex flex-col gap-4 p-6 ${card}`}>
          <h2 className="text-xl font-black text-white">Wskakuj do gry 🕹️</h2>

          <label className="flex flex-col gap-2 text-left text-sm font-semibold text-white/70">
            Kod od organizatora
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="np. AB12CD"
              className={`text-center text-2xl font-black uppercase tracking-widest ${inputBase}`}
              maxLength={8}
              required
            />
          </label>

          {joinError && <p className="text-sm font-semibold text-rose-400">{joinError}</p>}

          <button type="submit" className={`mt-auto ${primaryButton}`}>
            Wskakuję!
          </button>
        </form>
      </div>

      {leaders.length > 0 && (
        <div className={`mt-6 w-full max-w-3xl p-6 ${card}`}>
          <h2 className="mb-1 text-xl font-black text-white">Ranking wszech czasów 👑</h2>
          <p className="mb-4 text-xs font-medium text-white/40">
            Punkty ze wszystkich rozegranych gier.
          </p>
          <ol className="flex flex-col gap-2">
            {leaders.map((l, i) => (
              <li
                key={`${l.nickname}-${i}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <span className="w-7 shrink-0 text-center text-base font-black">
                  {MEDALS[i] ?? `${i + 1}.`}
                </span>
                <span className="flex-1 truncate font-bold text-white/90">
                  {avatar(l.nickname)} {l.nickname}
                </span>
                <span className="shrink-0 text-xs text-white/40">
                  {l.games_played} {l.games_played === 1 ? "gra" : "gier"}
                </span>
                <span className={`shrink-0 font-black ${gradientText}`}>{l.total_score}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
