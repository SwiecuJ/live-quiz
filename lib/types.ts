export type RoomStatus = "lobby" | "in_progress" | "round_result" | "finished";

/**
 * Only the two rows clients actually hold in state live here. Question and
 * answer shapes vary per endpoint (a question is served with or without
 * `correct_index`, answers with or without scores), so each screen declares
 * the shape it actually receives instead of sharing a type that would have
 * to make half its fields optional.
 */

export interface Room {
  id: string;
  code: string;
  quiz_id: string;
  status: RoomStatus;
  current_question_index: number;
  question_start_at: string | null;
  round_time_seconds: number;
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  nickname: string;
  total_score: number;
  created_at: string;
}
