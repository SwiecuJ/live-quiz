/**
 * Fixed pool of numeric-answer questions. Deliberately not generated per
 * game: the whole point of "closest without going over" is that the answer
 * is a real, checkable number, and a made-up one would quietly break that.
 *
 * `unit` is appended when showing the answer, so questions read naturally
 * without repeating the unit in every guess.
 */
export interface RfQuestion {
  id: string;
  text: string;
  answer: number;
  unit?: string;
}

export const RF_QUESTIONS: RfQuestion[] = [
  { id: "kosci", text: "Ile kości ma szkielet dorosłego człowieka?", answer: 206 },
  { id: "zeby", text: "Ile zębów ma dorosły człowiek (z ósemkami)?", answer: 32 },
  { id: "chromosomy", text: "Ile chromosomów ma komórka człowieka?", answer: 46 },
  { id: "serca-osmiornicy", text: "Ile serc ma ośmiornica?", answer: 3 },
  { id: "nogi-pajaka", text: "Ile nóg ma pająk?", answer: 8 },
  { id: "nogi-owada", text: "Ile nóg ma owad?", answer: 6 },

  { id: "planety", text: "Ile planet jest w Układzie Słonecznym?", answer: 8 },
  { id: "ksiezyce-marsa", text: "Ile księżyców ma Mars?", answer: 2 },
  { id: "swiatlo", text: "Ile wynosi prędkość światła w próżni?", answer: 300000, unit: "km/s" },
  { id: "everest", text: "Ile metrów ma wysokość Mount Everestu?", answer: 8849, unit: "m" },
  { id: "kontynenty", text: "Ile jest kontynentów?", answer: 7 },
  { id: "oceany", text: "Ile oceanów wyróżnia się dzisiaj na Ziemi?", answer: 5 },

  { id: "wojewodztwa", text: "Ile województw jest w Polsce?", answer: 16 },
  { id: "poslowie", text: "Ilu posłów zasiada w Sejmie?", answer: 460 },
  { id: "senatorowie", text: "Ilu senatorów zasiada w Senacie?", answer: 100 },
  { id: "alfabet-pl", text: "Ile liter ma polski alfabet?", answer: 32 },
  { id: "wisla", text: "Ile kilometrów ma Wisła?", answer: 1047, unit: "km" },
  { id: "pkin", text: "Ile metrów ma Pałac Kultury i Nauki razem z iglicą?", answer: 237, unit: "m" },
  { id: "ue-rok", text: "W którym roku Polska weszła do Unii Europejskiej?", answer: 2004 },
  { id: "ue-panstwa", text: "Ile państw należy do Unii Europejskiej?", answer: 27 },

  { id: "szachownica", text: "Ile pól ma szachownica?", answer: 64 },
  { id: "talia", text: "Ile kart ma standardowa talia bez jokerów?", answer: 52 },
  { id: "kostka", text: "Ile oczek jest w sumie na jednej kostce do gry?", answer: 21 },
  { id: "monopoly", text: "Ile pól ma plansza do Monopoly?", answer: 40 },
  { id: "pianino", text: "Ile klawiszy ma standardowe pianino?", answer: 88 },
  { id: "gitara", text: "Ile strun ma standardowa gitara?", answer: 6 },

  { id: "pilkarze", text: "Ilu piłkarzy jednej drużyny jest na boisku?", answer: 11 },
  { id: "mecz", text: "Ile minut trwa regulaminowy mecz piłki nożnej?", answer: 90, unit: "min" },
  { id: "koszykarze", text: "Ilu koszykarzy jednej drużyny jest na parkiecie?", answer: 5 },
  { id: "maraton", text: "Ile kilometrów ma maraton (w zaokrągleniu)?", answer: 42, unit: "km" },

  { id: "sekundy-doby", text: "Ile sekund ma doba?", answer: 86400, unit: "s" },
  { id: "kat-pelny", text: "Ile stopni ma kąt pełny?", answer: 360, unit: "°" },
  { id: "wrzenie", text: "W ilu stopniach Celsjusza wrze woda na poziomie morza?", answer: 100, unit: "°C" },
  { id: "litr-wody", text: "Ile gramów waży litr wody?", answer: 1000, unit: "g" },
  { id: "zodiak", text: "Ile jest znaków zodiaku?", answer: 12 },
  { id: "luty", text: "Ile dni ma luty w roku przestępnym?", answer: 29 },
  { id: "wojna-stuletnia", text: "Ile lat trwała wojna stuletnia?", answer: 116, unit: "lat" },
  { id: "statua", text: "Ile kolców ma korona Statuy Wolności?", answer: 7 },
];

/** Picks `count` distinct questions at random. */
export function drawQuestions(count: number): RfQuestion[] {
  const pool = [...RF_QUESTIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export function findQuestion(id: string): RfQuestion | undefined {
  return RF_QUESTIONS.find((q) => q.id === id);
}
