"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { card, gradientText, primaryButton, inputBase } from "@/lib/theme";

const ROUND_OPTIONS = [5, 10, 15] as const;

export default function Home() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [rounds, setRounds] = useState<(typeof ROUND_OPTIONS)[number]>(10);
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

      router.push(`/host/${data.roomCode}`);
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
          Live quiz, ogarnia go AI ⚡
        </span>
        <h1 className={`mt-5 text-6xl font-black tracking-tight sm:text-7xl ${gradientText}`}>
          Live Quiz
        </h1>
        <p className="mt-3 text-lg text-white/60">
          Wrzuć temat, AI ogarnie pytania. Albo wskakuj do gry kumpla kodem 🎉
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

          {createError && <p className="text-sm font-semibold text-rose-400">{createError}</p>}

          <button type="submit" disabled={creating} className={`mt-2 ${primaryButton}`}>
            {creating ? "AI kuma temat…" : "Odpalamy! 🚀"}
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
