import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateRoomCode } from "@/lib/roomCode";
import { drawQuestions } from "@/lib/ryzykfizyk/questions";
import { ROUND_OPTIONS, DEFAULT_ROUNDS } from "@/lib/ryzykfizyk/betting";

export const runtime = "nodejs";

const MAX_CODE_ATTEMPTS = 5;

/** Creates a room and draws its questions up front, so the set is fixed for the whole game. */
export async function POST(req: NextRequest) {
  let rounds: number = DEFAULT_ROUNDS;
  try {
    const body = await req.json();
    // Only the offered lengths are accepted -- an arbitrary number from a
    // hand-made request would either be a one-question game or outlast the
    // question pool.
    if (ROUND_OPTIONS.includes(body?.rounds)) rounds = body.rounds;
  } catch {
    // No body is fine; the default stands.
  }

  const supabase = createServiceRoleClient();
  const questionIds = drawQuestions(rounds).map((q) => q.id);

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const candidate = generateRoomCode();
    const { error } = await supabase
      .from("rf_rooms")
      .insert({ code: candidate, question_ids: questionIds });

    if (!error) return NextResponse.json({ roomCode: candidate });

    // Unique violation on `code` -> try another one.
    if (error.code !== "23505") {
      console.error("rf: failed to create room", error);
      return NextResponse.json(
        { error: "Nie udało się utworzyć pokoju. Czy migracja 0003 jest uruchomiona?" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Nie udało się wygenerować unikalnego kodu pokoju." },
    { status: 500 }
  );
}
