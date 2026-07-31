/**
 * Fixed pool of numeric-answer questions. Deliberately not generated per
 * game: the whole point of "closest without going over" is that the answer
 * is a real, checkable number, and a made-up one would quietly break that.
 *
 * Everything here is a stable, verifiable figure -- no populations, records
 * or anything else that drifts and would age into being wrong. Where a
 * value is conventionally rounded (Everest, the equator) the commonly cited
 * one is used, which is what people will be guessing against anyway.
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
  // ---- ciało i biologia ----------------------------------------------
  { id: "kosci", text: "Ile kości ma szkielet dorosłego człowieka?", answer: 206 },
  { id: "zeby", text: "Ile zębów ma dorosły człowiek (z ósemkami)?", answer: 32 },
  { id: "zeby-mleczne", text: "Ile zębów mlecznych ma dziecko?", answer: 20 },
  { id: "chromosomy", text: "Ile chromosomów ma komórka człowieka?", answer: 46 },
  { id: "zebra", text: "Ile par żeber ma człowiek?", answer: 12 },
  { id: "kosci-dloni", text: "Ile kości jest w jednej ludzkiej dłoni?", answer: 27 },
  { id: "kosci-stopy", text: "Ile kości jest w jednej ludzkiej stopie?", answer: 26 },
  { id: "jamy-serca", text: "Ile jam ma ludzkie serce?", answer: 4 },
  { id: "ciaza", text: "Ile mniej więcej dni trwa ciąża u człowieka?", answer: 280, unit: "dni" },
  { id: "kregi-zyrafy", text: "Ile kręgów szyjnych ma żyrafa?", answer: 7 },
  { id: "serca-osmiornicy", text: "Ile serc ma ośmiornica?", answer: 3 },
  { id: "nogi-pajaka", text: "Ile nóg ma pająk?", answer: 8 },
  { id: "nogi-owada", text: "Ile nóg ma owad?", answer: 6 },
  { id: "nogi-kraba", text: "Ile odnóży ma krab (razem ze szczypcami)?", answer: 10 },
  { id: "zoladki-krowy", text: "Ile komór ma żołądek krowy?", answer: 4 },
  { id: "skrzydla-motyla", text: "Ile skrzydeł ma motyl?", answer: 4 },

  // ---- kosmos ---------------------------------------------------------
  { id: "planety", text: "Ile planet jest w Układzie Słonecznym?", answer: 8 },
  { id: "ksiezyce-marsa", text: "Ile księżyców ma Mars?", answer: 2 },
  { id: "ksiezyce-ziemi", text: "Ile naturalnych księżyców ma Ziemia?", answer: 1 },
  { id: "swiatlo", text: "Ile wynosi prędkość światła w próżni?", answer: 300000, unit: "km/s" },
  { id: "slonce-minuty", text: "Ile minut światło leci ze Słońca na Ziemię?", answer: 8, unit: "min" },
  { id: "ludzie-na-ksiezycu", text: "Ilu ludzi stanęło na Księżycu?", answer: 12 },
  { id: "rok-ksiezyc", text: "W którym roku człowiek pierwszy raz stanął na Księżycu?", answer: 1969 },
  { id: "rok-gagarin", text: "W którym roku Gagarin poleciał w kosmos?", answer: 1961 },
  { id: "doba-marsa", text: "Ile mniej więcej godzin trwa doba na Marsie?", answer: 25, unit: "h" },

  // ---- geografia ------------------------------------------------------
  { id: "kontynenty", text: "Ile jest kontynentów?", answer: 7 },
  { id: "oceany", text: "Ile oceanów wyróżnia się dzisiaj na Ziemi?", answer: 5 },
  { id: "everest", text: "Ile metrów ma wysokość Mount Everestu?", answer: 8849, unit: "m" },
  { id: "rysy", text: "Ile metrów ma wysokość Rysów?", answer: 2499, unit: "m" },
  { id: "rownik", text: "Ile kilometrów ma równik?", answer: 40075, unit: "km" },
  { id: "rowy-marianski", text: "Ile metrów głębokości ma Rów Mariański?", answer: 10994, unit: "m" },
  { id: "strefy-czasowe", text: "Ile jest stref czasowych na świecie?", answer: 24 },
  { id: "wisla", text: "Ile kilometrów ma Wisła?", answer: 1047, unit: "km" },
  { id: "odra", text: "Ile kilometrów ma Odra?", answer: 854, unit: "km" },
  { id: "wojewodztwa", text: "Ile województw jest w Polsce?", answer: 16 },
  { id: "ue-panstwa", text: "Ile państw należy do Unii Europejskiej?", answer: 27 },
  { id: "onz", text: "Ile państw należy do ONZ?", answer: 193 },
  { id: "stany-usa", text: "Ile stanów ma USA?", answer: 50 },
  { id: "pkin", text: "Ile metrów ma Pałac Kultury i Nauki razem z iglicą?", answer: 237, unit: "m" },
  { id: "eiffel", text: "Ile metrów ma wieża Eiffla?", answer: 330, unit: "m" },
  { id: "empire", text: "Ile pięter ma Empire State Building?", answer: 102 },
  { id: "sasiedzi-polski", text: "Z iloma państwami graniczy Polska?", answer: 7 },

  // ---- historia -------------------------------------------------------
  { id: "chrzest", text: "W którym roku odbył się chrzest Polski?", answer: 966 },
  { id: "grunwald", text: "W którym roku była bitwa pod Grunwaldem?", answer: 1410 },
  { id: "konstytucja", text: "W którym roku uchwalono Konstytucję 3 maja?", answer: 1791 },
  { id: "niepodleglosc", text: "W którym roku Polska odzyskała niepodległość?", answer: 1918 },
  { id: "wybuch-wojny", text: "W którym roku wybuchła II wojna światowa?", answer: 1939 },
  { id: "koniec-wojny", text: "W którym roku skończyła się II wojna światowa?", answer: 1945 },
  { id: "dlugosc-wojny", text: "Ile lat trwała II wojna światowa?", answer: 6, unit: "lat" },
  { id: "mur", text: "W którym roku upadł mur berliński?", answer: 1989 },
  { id: "ue-rok", text: "W którym roku Polska weszła do Unii Europejskiej?", answer: 2004 },
  { id: "rozbiory", text: "Ile było rozbiorów Polski?", answer: 3 },
  { id: "wojna-stuletnia", text: "Ile lat trwała wojna stuletnia?", answer: 116, unit: "lat" },
  { id: "cuda-swiata", text: "Ile było starożytnych cudów świata?", answer: 7 },

  // ---- polityka i instytucje ------------------------------------------
  { id: "poslowie", text: "Ilu posłów zasiada w Sejmie?", answer: 460 },
  { id: "senatorowie", text: "Ilu senatorów zasiada w Senacie?", answer: 100 },
  { id: "kadencja", text: "Ile lat trwa kadencja Prezydenta RP?", answer: 5, unit: "lat" },
  { id: "gwiazdy-ue", text: "Ile gwiazd jest na fladze Unii Europejskiej?", answer: 12 },
  { id: "gwiazdy-usa", text: "Ile gwiazd jest na fladze USA?", answer: 50 },
  { id: "pasy-usa", text: "Ile pasów jest na fladze USA?", answer: 13 },
  { id: "kolory-flagi-pl", text: "Ile kolorów ma flaga Polski?", answer: 2 },

  // ---- sport ----------------------------------------------------------
  { id: "pilkarze", text: "Ilu piłkarzy jednej drużyny jest na boisku?", answer: 11 },
  { id: "mecz", text: "Ile minut trwa regulaminowy mecz piłki nożnej?", answer: 90, unit: "min" },
  { id: "koszykarze", text: "Ilu koszykarzy jednej drużyny jest na parkiecie?", answer: 5 },
  { id: "siatkarze", text: "Ilu siatkarzy jednej drużyny jest na boisku?", answer: 6 },
  { id: "hokeisci", text: "Ilu hokeistów jednej drużyny jest na lodzie?", answer: 6 },
  { id: "maraton", text: "Ile kilometrów ma maraton (w zaokrągleniu)?", answer: 42, unit: "km" },
  { id: "kola-olimpijskie", text: "Ile kół jest w symbolu olimpijskim?", answer: 5 },
  { id: "igrzyska-lata", text: "Co ile lat odbywają się letnie igrzyska olimpijskie?", answer: 4, unit: "lata" },
  { id: "szachownica", text: "Ile pól ma szachownica?", answer: 64 },
  { id: "figury-szachowe", text: "Ile bierek ma jeden gracz na starcie partii szachów?", answer: 16 },
  { id: "pionki", text: "Ile pionków ma jeden gracz w szachach?", answer: 8 },
  { id: "dolki-golf", text: "Ile dołków ma pełne pole golfowe?", answer: 18 },

  // ---- gry i codzienność ----------------------------------------------
  { id: "talia", text: "Ile kart ma standardowa talia bez jokerów?", answer: 52 },
  { id: "kostka", text: "Ile oczek jest w sumie na jednej kostce do gry?", answer: 21 },
  { id: "monopoly", text: "Ile pól ma plansza do Monopoly?", answer: 40 },
  { id: "domino", text: "Ile kamieni ma klasyczny zestaw domina?", answer: 28 },
  { id: "pianino", text: "Ile klawiszy ma standardowe pianino?", answer: 88 },
  { id: "pianino-czarne", text: "Ile czarnych klawiszy ma standardowe pianino?", answer: 36 },
  { id: "gitara", text: "Ile strun ma standardowa gitara?", answer: 6 },
  { id: "skrzypce", text: "Ile strun mają skrzypce?", answer: 4 },
  { id: "krasnoludki", text: "Ilu krasnoludków miała Królewna Śnieżka?", answer: 7 },
  { id: "muzy", text: "Ile muz było w mitologii greckiej?", answer: 9 },
  { id: "prace-herkulesa", text: "Ile prac wykonał Herkules?", answer: 12 },
  { id: "wladca-pierscieni", text: "Ile filmów liczy trylogia Władca Pierścieni?", answer: 3 },
  { id: "tecza", text: "Ile kolorów tradycyjnie wymienia się w tęczy?", answer: 7 },

  // ---- liczby, miary, czas --------------------------------------------
  { id: "alfabet-pl", text: "Ile liter ma polski alfabet?", answer: 32 },
  { id: "alfabet-en", text: "Ile liter ma alfabet angielski?", answer: 26 },
  { id: "zodiak", text: "Ile jest znaków zodiaku?", answer: 12 },
  { id: "luty", text: "Ile dni ma luty w roku przestępnym?", answer: 29 },
  { id: "luty-zwykly", text: "Ile dni ma luty w zwykłym roku?", answer: 28 },
  { id: "rok-przestepny", text: "Ile dni ma rok przestępny?", answer: 366 },
  { id: "miesiace-31", text: "Ile miesięcy w roku ma 31 dni?", answer: 7 },
  { id: "tygodnie-roku", text: "Ile pełnych tygodni ma rok?", answer: 52 },
  { id: "godziny-tygodnia", text: "Ile godzin ma tydzień?", answer: 168, unit: "h" },
  { id: "minuty-doby", text: "Ile minut ma doba?", answer: 1440, unit: "min" },
  { id: "sekundy-doby", text: "Ile sekund ma doba?", answer: 86400, unit: "s" },
  { id: "kat-pelny", text: "Ile stopni ma kąt pełny?", answer: 360, unit: "°" },
  { id: "kat-prosty", text: "Ile stopni ma kąt prosty?", answer: 90, unit: "°" },
  { id: "trojkat", text: "Ile stopni mają razem kąty w trójkącie?", answer: 180, unit: "°" },
  { id: "sciany-szescianu", text: "Ile ścian ma sześcian?", answer: 6 },
  { id: "krawedzie-szescianu", text: "Ile krawędzi ma sześcian?", answer: 12 },
  { id: "wierzcholki-szescianu", text: "Ile wierzchołków ma sześcian?", answer: 8 },
  { id: "boki-osmiokata", text: "Ile boków ma ośmiokąt?", answer: 8 },
  { id: "tuzin", text: "Ile sztuk to tuzin?", answer: 12 },
  { id: "kopa", text: "Ile sztuk to kopa?", answer: 60 },
  { id: "wrzenie", text: "W ilu stopniach Celsjusza wrze woda na poziomie morza?", answer: 100, unit: "°C" },
  { id: "litr-wody", text: "Ile gramów waży litr wody?", answer: 1000, unit: "g" },
  { id: "cm-metr", text: "Ile centymetrów ma metr?", answer: 100, unit: "cm" },
  { id: "ml-litr", text: "Ile mililitrów ma litr?", answer: 1000, unit: "ml" },
  { id: "bity-bajt", text: "Ile bitów ma bajt?", answer: 8 },
  { id: "cyfry", text: "Ile jest cyfr arabskich?", answer: 10 },
  { id: "klawisze-f", text: "Ile klawiszy funkcyjnych F ma typowa klawiatura?", answer: 12 },
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
