/**
 * Classic Mafia, adapted so the phone replaces the narrator.
 *
 * The role split follows the usual convention: roughly one mafioso per four
 * players, with the detective and doctor added as the table grows. Below six
 * players the game doesn't work -- one lynch swings it outright and the mafia
 * effectively can't hide -- so that's the floor.
 */
export type MafiaRole = "mafia" | "detektyw" | "lekarz" | "mieszkaniec";

export const MIN_PLAYERS = 6;
export const MAX_PLAYERS = 20;

export interface RoleCounts {
  mafia: number;
  detektyw: number;
  lekarz: number;
  mieszkaniec: number;
}

/** Rounds to the nearest quarter of the table, never fewer than one. */
export function mafiaCountFor(players: number): number {
  return Math.max(1, Math.round(players / 4));
}

export function rolesFor(players: number): RoleCounts {
  const mafia = mafiaCountFor(players);
  // The detective comes first: without it the town is guessing blind. The
  // doctor only earns a seat once the table is big enough that a nightly
  // save doesn't stall the game.
  const detektyw = players >= MIN_PLAYERS ? 1 : 0;
  const lekarz = players >= 7 ? 1 : 0;
  return {
    mafia,
    detektyw,
    lekarz,
    mieszkaniec: Math.max(0, players - mafia - detektyw - lekarz),
  };
}

/** One entry per player, shuffled. */
export function dealRoles(players: number): MafiaRole[] {
  const counts = rolesFor(players);
  const deck: MafiaRole[] = [
    ...Array<MafiaRole>(counts.mafia).fill("mafia"),
    ...Array<MafiaRole>(counts.detektyw).fill("detektyw"),
    ...Array<MafiaRole>(counts.lekarz).fill("lekarz"),
    ...Array<MafiaRole>(counts.mieszkaniec).fill("mieszkaniec"),
  ];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export type Winner = "mafia" | "miasto" | null;

/**
 * Mafia win once they match the rest of the table -- from there no vote can
 * go against them. The town wins the moment the last mafioso is out.
 */
export function checkWinner(aliveMafia: number, aliveTown: number): Winner {
  if (aliveMafia === 0) return "miasto";
  if (aliveMafia >= aliveTown) return "mafia";
  return null;
}

export const ROLE_LABEL: Record<MafiaRole, string> = {
  mafia: "Mafia",
  detektyw: "Detektyw",
  lekarz: "Lekarz",
  mieszkaniec: "Mieszkaniec",
};

export const ROLE_EMOJI: Record<MafiaRole, string> = {
  mafia: "🔫",
  detektyw: "🕵️",
  lekarz: "💉",
  mieszkaniec: "🧑",
};

/** What that role is told to do once the lights go out. */
export const ROLE_NIGHT_PROMPT: Record<MafiaRole, string> = {
  mafia: "Kogo dziś sprzątacie?",
  detektyw: "Kogo prześwietlasz tej nocy?",
  lekarz: "Kogo dziś pilnujesz?",
  // Citizens have no power, but they tap too -- otherwise the people who
  // sit out the night would be obvious from across the room.
  mieszkaniec: "Kogo podejrzewasz?",
};

export const ROLE_DESCRIPTION: Record<MafiaRole, string> = {
  mafia: "Nocą wybieracie ofiarę. W dzień udawaj, że nic nie wiesz.",
  detektyw: "Co noc sprawdzasz jedną osobę i dowiadujesz się, czy to mafia.",
  lekarz: "Co noc chronisz jedną osobę. Jeśli trafisz na cel mafii — przeżyje.",
  mieszkaniec: "Nie masz mocy. Masz przeczucie, głos i gadane.",
};
