// "Party flyer" look: flat neon colors, thick borders, hard offset shadows
// (no blur) on a near-black background. Deliberately not soft-gradient
// glassmorphism -- that reads as generic/AI-templated.

export const card =
  "rounded-[28px] border-2 border-white/15 bg-[#151519] shadow-[6px_6px_0_0_rgba(255,62,165,0.35)]";

export const gradientText =
  "bg-gradient-to-r from-pink-400 via-orange-300 to-lime-300 bg-clip-text text-transparent";

export const primaryButton =
  "rounded-2xl border-2 border-black bg-lime-300 px-8 py-4 font-black uppercase tracking-tight text-black shadow-[6px_6px_0_0_#FF3EA5] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#FF3EA5] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#FF3EA5] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0";

export const inputBase =
  "rounded-xl border-2 border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition-colors focus:border-lime-300 focus:ring-2 focus:ring-lime-300/30";

export const chip =
  "rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-bold text-black shadow-[3px_3px_0_0_#000]";
