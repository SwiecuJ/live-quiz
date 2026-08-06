import type { MafiaRole } from "./roles";

export type MafiaStatus =
  | "lobby"
  | "role_reveal"
  | "noc"
  | "dzien"
  | "glosowanie"
  | "wynik"
  | "koniec";

export interface MfLastEvent {
  type: "start" | "noc" | "lincz";
  seed: number;
  victimName: string | null;
  victimRole: MafiaRole | null;
  saved?: boolean;
}

export interface MfRoom {
  id: string;
  code: string;
  status: MafiaStatus;
  day_number: number;
  last_event: MfLastEvent | null;
  winner: "mafia" | "miasto" | null;
  phase_started_at: string | null;
  created_at: string;
}

export interface MfPlayer {
  id: string;
  room_id: string;
  nickname: string;
  device_id: string | null;
  alive: boolean;
  ready: boolean;
  revealed_role: MafiaRole | null;
  created_at: string;
}

export interface MfMe {
  role: MafiaRole | null;
  allies: string[];
  findings: { nickname: string; isMafia: boolean }[];
  /** Mafia only: what the rest of the crew has picked so far tonight. */
  allyPicks: {
    playerId: string;
    nickname: string;
    target: string | null;
    targetId: string | null;
  }[];
  myPick: string | null;
  /** Dead players only: every night move on the table, as it happens. */
  nightBoard: {
    playerId: string;
    nickname: string;
    role: MafiaRole | null;
    targetId: string | null;
    target: string | null;
  }[];
}
