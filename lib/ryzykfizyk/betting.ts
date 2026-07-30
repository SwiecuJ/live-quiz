/**
 * Betting maths for Ryzyk Fizyk.
 *
 * The rule that makes the game: the winning guess is the one closest to the
 * real number *without going over*. Guessing high is how you lose, which is
 * why a wildly optimistic guess is worse than a cautious one -- and why
 * there has to be a slot for "everyone overshot".
 *
 * A wrong guess costs nothing by itself. You only lose what you staked.
 */

export interface Guess {
  playerId: string;
  value: number;
}

export interface Slot {
  /** Stable id used by bets. `UNDER_SLOT_KEY` for the everyone-overshot slot. */
  key: string;
  /** null on the everyone-overshot slot. */
  value: number | null;
  /** Everyone who submitted this exact number. */
  authorIds: string[];
  odds: number;
}

export interface Bet {
  playerId: string;
  slotKey: string;
  amount: number;
}

export const START_BALANCE = 2000;
export const AUTHOR_BONUS = 300;
export const BET_AMOUNTS = [100, 200, 300, 400, 500] as const;
export const MAX_BETS_PER_ROUND = 2;
export const TOTAL_ROUNDS = 7;

export const UNDER_SLOT_KEY = "under";
/** Long shot: it only pays when the whole table overshot. */
export const UNDER_SLOT_ODDS = 5;

/**
 * Odds fall towards the middle of the row and rise at both ends, the way
 * they do on the physical mat: the safe-looking middle guesses win most
 * often, so backing an outlier has to be worth more.
 */
function oddsForPosition(index: number, count: number): number {
  if (count <= 1) return 2;
  const centre = (count - 1) / 2;
  const distance = Math.abs(index - centre) / centre;
  return 2 + Math.round(distance * 2);
}

/** Identical guesses share one slot, so backing a popular number is one bet. */
export function buildSlots(guesses: Guess[]): Slot[] {
  const byValue = new Map<number, string[]>();
  for (const guess of guesses) {
    const authors = byValue.get(guess.value);
    if (authors) authors.push(guess.playerId);
    else byValue.set(guess.value, [guess.playerId]);
  }

  const values = [...byValue.keys()].sort((a, b) => a - b);

  const answerSlots: Slot[] = values.map((value, index) => ({
    key: String(value),
    value,
    authorIds: byValue.get(value)!,
    odds: oddsForPosition(index, values.length),
  }));

  return [
    { key: UNDER_SLOT_KEY, value: null, authorIds: [], odds: UNDER_SLOT_ODDS },
    ...answerSlots,
  ];
}

/**
 * The highest guess that didn't go over. Returns `UNDER_SLOT_KEY` when every
 * guess overshot -- with nobody under the answer, the table collectively got
 * it wrong and only the players who bet on that outcome get paid.
 */
export function winningSlotKey(slots: Slot[], correctAnswer: number): string {
  let winner = UNDER_SLOT_KEY;
  for (const slot of slots) {
    if (slot.value === null) continue;
    if (slot.value <= correctAnswer) winner = slot.key;
  }
  return winner;
}

export interface RoundOutcome {
  winningKey: string;
  /** Net change per player: stake x odds when their bet lands, minus the stake when it doesn't. */
  deltas: Record<string, number>;
}

export function resolveRound(
  slots: Slot[],
  bets: Bet[],
  correctAnswer: number
): RoundOutcome {
  const winningKey = winningSlotKey(slots, correctAnswer);
  const winningSlot = slots.find((s) => s.key === winningKey);
  const deltas: Record<string, number> = {};
  const add = (playerId: string, amount: number) => {
    deltas[playerId] = (deltas[playerId] ?? 0) + amount;
  };

  for (const bet of bets) {
    if (bet.slotKey === winningKey) {
      const odds = slots.find((s) => s.key === bet.slotKey)?.odds ?? 2;
      add(bet.playerId, bet.amount * odds);
    } else {
      add(bet.playerId, -bet.amount);
    }
  }

  // Whoever actually landed the number gets paid for it, bet or no bet.
  // Nobody authors the everyone-overshot slot, so it pays no bonus.
  for (const authorId of winningSlot?.authorIds ?? []) {
    add(authorId, AUTHOR_BONUS);
  }

  return { winningKey, deltas };
}

/** Comfortably inside both bigint and JS safe-integer range. */
export const MAX_GUESS = 1_000_000_000_000;

/** Guesses must be whole, non-negative numbers -- they get sorted and compared. */
export function parseGuess(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0 || value > MAX_GUESS) return null;
  return Math.round(value);
}
