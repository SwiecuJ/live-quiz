export type RoomStatus = "lobby" | "in_progress" | "round_result" | "finished";

export interface Quiz {
  id: string;
  prompt: string;
  created_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  order_index: number;
}

/** Question shape safe to send to players before they've answered. */
export type PublicQuestion = Omit<Question, "correct_index">;

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

export interface Answer {
  id: string;
  player_id: string;
  question_id: string;
  room_id: string;
  selected_index: number;
  answered_at: string;
  points_awarded: number;
}
