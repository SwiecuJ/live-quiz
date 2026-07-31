import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateRoomCode } from "@/lib/roomCode";

export const runtime = "nodejs";

const MAX_CODE_ATTEMPTS = 5;

export async function POST() {
  const supabase = createServiceRoleClient();

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const candidate = generateRoomCode();
    const { error } = await supabase.from("mf_rooms").insert({ code: candidate });
    if (!error) return NextResponse.json({ roomCode: candidate });

    if (error.code !== "23505") {
      console.error("mafia: failed to create room", error);
      return NextResponse.json(
        { error: "Nie udało się otworzyć miasta. Czy migracja 0004 jest uruchomiona?" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Nie udało się wylosować kodu." }, { status: 500 });
}
