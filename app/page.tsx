"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { card, gradientText, primaryButton, inputBase } from "@/lib/theme";
import { markAsHost } from "@/lib/hostStorage";

const ROUND_OPTIONS = [5, 10, 15] as const;
type HostMode = "screen" | "phone";

export default function Home() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [rounds, setRounds] = useState<(typeof ROUND_OPTIONS)[number]>(10);
  const [hostMode, setHostMode] = useState<HostMode>("screen");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

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
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl text-center">
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

          <div className="flex flex-col gap-2 text-left text-sm font-semibold text-white/70">
            Gdzie pokazujesz pytania?
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { mode: "screen" as const, label: "Na tym ekranie", icon: "🖥️" },
                  { mode: "phone" as const, label: "Z mojego telefonu", icon: "📱" },
                ] satisfies { mode: HostMode; label: string; icon: string }[]
              ).map((opt) => (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => setHostMode(opt.mode)}
                  className={`rounded-xl border-2 px-3 py-3 text-center text-sm font-black transition-all ${
                    hostMode === opt.mode
                      ? "border-black bg-lime-300 text-black shadow-[4px_4px_0_0_#000]"
                      : "border-white/15 bg-white/5 text-white/60"
                  }`}
                >
                  <span className="block text-xl">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs font-medium text-white/40">
              {hostMode === "screen"
                ? "Kod QR na dużym ekranie, Ty tylko prowadzisz."
                : "Kod QR na Twoim telefonie i grasz razem z resztą."}
            </p>
          </div>

          {createError && <p className="text-sm font-semibold text-rose-400">{createError}</p>}

          <button type="submit" disabled={creating} className={`mt-2 ${primaryButton}`}>
            {creating ? "Kuma temat…" : "Odpalamy! 🚀"}
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
    </div>
  );
}
