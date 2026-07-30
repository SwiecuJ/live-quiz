import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateRoomCode } from "@/lib/roomCode";
import { drawQuestions } from "@/lib/ryzykfizyk/questions";
import { TOTAL_ROUNDS } from "@/lib/ryzykfizyk/betting";

export const runtime = "nodejs";

const MAX_CODE_ATTEMPTS = 5;

/** Creates a room and draws its questions up front, so the set is fixed for the whole game. */
export async function POST() {
  const supabase = createServiceRoleClient();
  const questionIds = drawQuestions(TOTAL_ROUNDS).map((q) => q.id);

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
