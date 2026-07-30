import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateRoomCode } from "@/lib/roomCode";

export const runtime = "nodejs";

const MODEL = "claude-haiku-4-5-20251001";
const ALLOWED_ROUNDS = [5, 10, 15];
const MAX_CODE_ATTEMPTS = 5;

interface GeneratedQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
}

function buildSystemPrompt(rounds: number) {
  return `Jesteś generatorem pytań quizowych. Na podstawie tematu podanego przez użytkownika wygeneruj dokładnie ${rounds} pytań quizowych typu jednokrotnego wyboru.

Zwróć WYŁĄCZNIE poprawny JSON, bez żadnego dodatkowego tekstu, bez markdown, bez bloków kodu. Format:

{
  "questions": [
    {
      "question": "Treść pytania",
      "options": ["Odpowiedź A", "Odpowiedź B", "Odpowiedź C", "Odpowiedź D"],
      "correctIndex": 0
    }
  ]
}

Zasady:
- Dokładnie ${rounds} pytań w tablicy "questions".
- Dokładnie 4 opcje odpowiedzi w "options" dla każdego pytania.
- "correctIndex" to indeks (0-3) poprawnej odpowiedzi w tablicy "options".
- Pytania muszą być zróżnicowane i związane z tematem podanym przez użytkownika.
- Odpowiedzi mają być zwięzłe (maks. kilka słów).
- Nie dodawaj żadnego wyjaśnienia ani komentarza poza samym JSON-em.`;
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return text.trim();
  return text.slice(start, end + 1).trim();
}

function isValidQuestion(q: unknown): q is GeneratedQuestion {
  if (!q || typeof q !== "object") return false;
  const obj = q as Record<string, unknown>;
  return (
    typeof obj.question === "string" &&
    Array.isArray(obj.options) &&
    obj.options.length === 4 &&
    obj.options.every((o) => typeof o === "string") &&
    typeof obj.correctIndex === "number" &&
    Number.isInteger(obj.correctIndex) &&
    obj.correctIndex >= 0 &&
    obj.correctIndex <= 3
  );
}

export async function POST(req: NextRequest) {
  let body: { prompt?: string; rounds?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe żądanie." }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  const rounds = body.rounds;

  if (!prompt) {
    return NextResponse.json({ error: "Brak tematu quizu." }, { status: 400 });
  }
  if (!rounds || !ALLOWED_ROUNDS.includes(rounds)) {
    return NextResponse.json({ error: "Nieprawidłowa liczba rund." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Serwer nie ma skonfigurowanego ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }

  const anthropic = new Anthropic({ apiKey });

  let questions: GeneratedQuestion[];
  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: buildSystemPrompt(rounds),
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Model nie zwrócił tekstu.");
    }

    const jsonText = extractJson(textBlock.text);
    const parsed = JSON.parse(jsonText);

    if (!Array.isArray(parsed.questions) || !parsed.questions.every(isValidQuestion)) {
      throw new Error("Model zwrócił nieprawidłowy format pytań.");
    }

    questions = parsed.questions.slice(0, rounds);
    if (questions.length !== rounds) {
      throw new Error("Model zwrócił nieprawidłową liczbę pytań.");
    }
  } catch (err) {
    console.error("generate-quiz: AI generation failed", err);
    return NextResponse.json(
      { error: "Nie udało się wygenerować quizu. Spróbuj ponownie." },
      { status: 502 }
    );
  }

  const supabase = createServiceRoleClient();

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .insert({ prompt })
    .select("id")
    .single();

  if (quizError || !quiz) {
    console.error("generate-quiz: failed to insert quiz", quizError);
    return NextResponse.json({ error: "Nie udało się zapisać quizu." }, { status: 500 });
  }

  const questionRows = questions.map((q, index) => ({
    quiz_id: quiz.id,
    question_text: q.question,
    options: q.options,
    correct_index: q.correctIndex,
    order_index: index,
  }));

  const { error: questionsError } = await supabase.from("questions").insert(questionRows);
  if (questionsError) {
    console.error("generate-quiz: failed to insert questions", questionsError);
    return NextResponse.json({ error: "Nie udało się zapisać pytań." }, { status: 500 });
  }

  let roomCode: string | null = null;
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const candidate = generateRoomCode();
    const { error: roomError } = await supabase
      .from("rooms")
      .insert({ code: candidate, quiz_id: quiz.id });

    if (!roomError) {
      roomCode = candidate;
      break;
    }
    // Unique violation on `code` -> retry with a new random code.
    if (roomError.code !== "23505") {
      console.error("generate-quiz: failed to create room", roomError);
      return NextResponse.json({ error: "Nie udało się utworzyć pokoju." }, { status: 500 });
    }
  }

  if (!roomCode) {
    return NextResponse.json(
      { error: "Nie udało się wygenerować unikalnego kodu pokoju." },
      { status: 500 }
    );
  }

  return NextResponse.json({ roomCode });
}
