"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { card, gradientText, primaryButton, inputBase } from "@/lib/theme";
import { setRfHostMode } from "@/lib/ryzykfizyk/hostKey";
import { TOTAL_ROUNDS, START_BALANCE } from "@/lib/ryzykfizyk/betting";

export default function RyzykFizykHome() {
  const router = useRouter();

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [playsToo, setPlaysToo] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/rf/rooms", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "Nie udało się odpalić gry.");
        setCreating(false);
        return;
      }
      setRfHostMode(data.roomCode, playsToo ? "play" : "screen");
      router.push(`/rf/${data.roomCode}`);
    } catch {
      setCreateError("Ups, sieć się posypała. Spróbuj ponownie.");
      setCreating(false);
    }
  }

  function handleJoin(e: FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code) router.push(`/rf/${code}`);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl text-center">
        <Link
          href="/"
          className="text-xs font-bold text-white/40 underline underline-offset-4 hover:text-white/70"
        >
          ← Quizownia
        </Link>
        <span className="mt-4 block">
          <span className="inline-block -rotate-2 rounded-full border-2 border-black bg-amber-300 px-4 py-1 text-xs font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_#000]">
            Zgaduj i obstawiaj 🎲
          </span>
        </span>
        <h1 className={`mt-5 text-5xl font-black tracking-tight sm:text-6xl ${gradientText}`}>
          Ryzyk Fizyk
        </h1>
        <p className="mt-3 text-lg text-white/60">
          Pytania z odpowiedzią liczbową. Nie musisz wiedzieć — musisz dobrze obstawić 💸
        </p>
      </div>

      <div className={`mt-8 w-full max-w-xl p-6 text-left ${card}`}>
        <h2 className="mb-3 text-lg font-black text-white">Jak się gra?</h2>
        <ol className="flex flex-col gap-2 text-sm text-white/70">
          <li>
            <span className="font-black text-white">1.</span> Każdy wpisuje swój typ — liczbę.
          </li>
          <li>
            <span className="font-black text-white">2.</span> Typy lądują na macie, od najmniejszego
            do największego. Każdy dostaje swój kurs.
          </li>
          <li>
            <span className="font-black text-white">3.</span> Obstawiacie, który typ jest najbliżej —{" "}
            <span className="font-black text-amber-300">ale nie za wysoko</span>. Przestrzelony typ
            nie wygrywa.
          </li>
          <li>
            <span className="font-black text-white">4.</span> Autor zwycięskiego typu bierze bonus,
            obstawiający — stawkę razy kurs.
          </li>
        </ol>
        <p className="mt-3 text-xs font-medium text-white/40">
          {TOTAL_ROUNDS} rund, każdy zaczyna z {START_BALANCE}$. Zły typ sam w sobie nic nie kosztuje
          — tracisz tylko to, co postawisz.
        </p>
      </div>

      <div className="mt-6 grid w-full max-w-xl gap-4 sm:grid-cols-2">
        <div className={`flex flex-col gap-3 p-6 ${card}`}>
          <h2 className="text-lg font-black text-white">Odpal grę 🎰</h2>

          {/* Same shape as Quizownia: showing the board is the default, and
              sitting at the table on the same device is the opt-in. */}
          <div className="flex flex-col gap-1">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-white/45 transition-colors hover:text-white/70">
              <input
                type="checkbox"
                checked={playsToo}
                onChange={(e) => setPlaysToo(e.target.checked)}
                className="h-3.5 w-3.5 shrink-0 accent-amber-300"
              />
              Gram i prowadzę z tego urządzenia 📱
            </label>
            <p className="text-[11px] font-medium leading-snug text-white/30">
              {playsToo
                ? "Kod QR pokażesz na swoim ekranie i siadasz do stołu z resztą."
                : "Bez tego ten ekran tylko pokazuje kod i typy — Ty grasz z telefonu."}
            </p>
          </div>

          {createError && <p className="text-sm font-semibold text-rose-400">{createError}</p>}
          <button onClick={handleCreate} disabled={creating} className={`mt-auto ${primaryButton}`}>
            {creating ? "Rozdaję żetony…" : "Odpalamy! 🚀"}
          </button>
        </div>

        <form onSubmit={handleJoin} className={`flex flex-col gap-3 p-6 ${card}`}>
          <h2 className="text-lg font-black text-white">Dołącz 🕹️</h2>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="np. AB12CD"
            className={`text-center text-2xl font-black uppercase tracking-widest ${inputBase}`}
            maxLength={8}
            required
          />
          <button type="submit" className={`mt-auto ${primaryButton}`}>
            Wskakuję!
          </button>
        </form>
      </div>
    </div>
  );
}
