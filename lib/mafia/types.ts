import type { MafiaRole } from "./roles";

export type MafiaStatus = "lobby" | "noc" | "dzien" | "glosowanie" | "wynik" | "koniec";

export interface MfLastEvent {
  type: "noc" | "lincz";
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
  revealed_role: MafiaRole | null;
  created_at: string;
}

export interface MfMe {
  role: MafiaRole | null;
  allies: string[];
  findings: { nickname: string; isMafia: boolean }[];
}
