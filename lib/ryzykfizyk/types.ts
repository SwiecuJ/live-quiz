import type { Slot } from "./betting";

export type RfStatus = "lobby" | "guessing" | "betting" | "reveal" | "finished";

export interface RfRoom {
  id: string;
  code: string;
  status: RfStatus;
  current_round: number;
  question_ids: string[];
  slots: Slot[] | null;
  phase_started_at: string | null;
  created_at: string;
}

export interface RfPlayer {
  id: string;
  room_id: string;
  nickname: string;
  device_id: string | null;
  balance: number;
  created_at: string;
}

export interface RfGuess {
  id: string;
  player_id: string;
  round_index: number;
  value: number;
}

export interface RfBet {
  id: string;
  player_id: string;
  round_index: number;
  slot_key: string;
  amount: number;
}
