"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { card, gradientText, primaryButton, inputBase } from "@/lib/theme";
import { setRfHostMode } from "@/lib/ryzykfizyk/hostKey";
import { MIN_PLAYERS, MAX_PLAYERS } from "@/lib/mafia/roles";

export default function MafiaHome() {
  const router = useRouter();

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [playsToo, setPlaysToo] = useState(true);
  const [joinCode, setJoinCode] = useState("");

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/mafia/rooms", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "Nie udało się otworzyć miasta.");
        setCreating(false);
        return;
      }
      setRfHostMode(`mafia-${data.roomCode}`, playsToo ? "play" : "screen");
      router.push(`/mafia/${data.roomCode}`);
    } catch {
      setCreateError("Ups, sieć się posypała. Spróbuj ponownie.");
      setCreating(false);
    }
  }

  function handleJoin(e: FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code) router.push(`/mafia/${code}`);
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link
        href="/"
        className="absolute right-4 top-4 -rotate-2 rounded-full border-2 border-black bg-lime-300 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-black shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5 sm:right-6 sm:top-6 sm:text-sm"
      >
        🎪 Quizownia
      </Link>

      <div className="w-full max-w-xl text-center">
        <span className="mt-8 block sm:mt-4">
          <span className="inline-block -rotate-2 rounded-full border-2 border-black bg-rose-400 px-4 py-1 text-xs font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_#000]">
            Kto tu kłamie? 🔪
          </span>
        </span>
        <h1 className={`mt-5 text-5xl font-black tracking-tight sm:text-6xl ${gradientText}`}>
          Mafia
        </h1>
        <p className="mt-3 text-lg text-white/60">
          Telefon jest narratorem. Nikt nie musi siedzieć z boku i prowadzić 🌙
        </p>
      </div>

      <div className={`mt-8 w-full max-w-xl p-6 text-left ${card}`}>
        <h2 className="mb-3 text-lg font-black text-white">Jak to działa?</h2>
        <ol className="flex flex-col gap-2 text-sm text-white/70">
          <li>
            <span className="font-black text-white">1.</span> Wszyscy skanują kod. Każdy dostaje
            swoją rolę na własny telefon — nikt inny jej nie zobaczy.
          </li>
          <li>
            <span className="font-black text-white">2.</span> Nocą{" "}
            <span className="font-black text-rose-300">każdy</span> coś klika: mafia wybiera ofiarę,
            lekarz kogoś ratuje, detektyw prześwietla, a mieszkańcy typują podejrzanego. Po ruchach
            nie poznasz, kto ma jaką rolę.
          </li>
          <li>
            <span className="font-black text-white">3.</span> Rano telefon opowiada, co się stało.
            Potem kłótnia i głosowanie.
          </li>
          <li>
            <span className="font-black text-white">4.</span> Mafia wygrywa, gdy jest jej tylu co
            reszty. Miasto — gdy wyłapie wszystkich.
          </li>
        </ol>
        <p className="mt-3 text-xs font-medium text-white/40">
          Od {MIN_PLAYERS} do {MAX_PLAYERS} osób. Im więcej graczy, tym więcej mafii — i tym
          wcześniej dołączają lekarz i detektyw.
        </p>
      </div>

      <div className="mt-6 grid w-full max-w-xl gap-4 sm:grid-cols-2">
        <div className={`flex flex-col gap-3 p-6 ${card}`}>
          <h2 className="text-lg font-black text-white">Otwórz miasto 🌃</h2>

          <div className="flex flex-col gap-1">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-white/45 transition-colors hover:text-white/70">
              <input
                type="checkbox"
                checked={playsToo}
                onChange={(e) => setPlaysToo(e.target.checked)}
                className="h-3.5 w-3.5 shrink-0 accent-rose-400"
              />
              Gram razem z resztą 📱
            </label>
            <p className="text-[11px] font-medium leading-snug text-white/30">
              {playsToo
                ? "Dostaniesz swoją rolę i grasz jak każdy."
                : "Ten ekran tylko pokazuje kod i przebieg — Ty nie dostajesz roli."}
            </p>
          </div>

          {createError && <p className="text-sm font-semibold text-rose-400">{createError}</p>}
          <button onClick={handleCreate} disabled={creating} className={`mt-auto ${primaryButton}`}>
            {creating ? "Gasimy światła…" : "Zaczynamy! 🌙"}
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
            Wchodzę!
          </button>
        </form>
      </div>
    </div>
  );
}
