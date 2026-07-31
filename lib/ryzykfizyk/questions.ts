/**
 * Fixed pool of numeric-answer questions. Deliberately not generated per
 * game: the whole point of "closest without going over" is that the answer
 * is a real, checkable number, and a made-up one would quietly break that.
 *
 * Every figure here is stable and verifiable. Nothing that drifts -- no
 * populations, records, prices or league tables -- because a pool that ages
 * into being wrong is worse than a smaller one: people lose money on a bad
 * answer and then argue about it.
 *
 * `unit` is appended when showing the answer, so questions read naturally
 * without repeating the unit in every guess.
 */
export type RfLevel = "latwy" | "sredni" | "trudny";

export interface RfQuestion {
  id: string;
  text: string;
  answer: number;
  unit?: string;
  level: RfLevel;
}

const L = (id: string, text: string, answer: number, unit?: string): RfQuestion => ({
  id,
  text,
  answer,
  unit,
  level: "latwy",
});
const S = (id: string, text: string, answer: number, unit?: string): RfQuestion => ({
  id,
  text,
  answer,
  unit,
  level: "sredni",
});
const T = (id: string, text: string, answer: number, unit?: string): RfQuestion => ({
  id,
  text,
  answer,
  unit,
  level: "trudny",
});

export const RF_QUESTIONS: RfQuestion[] = [
  // ══════════════ ŁATWY ══════════════
  // rzeczy, które każdy widział na własne oczy

  // zwierzęta i ciało
  L("nogi-pajaka", "Ile nóg ma pająk?", 8),
  L("nogi-owada", "Ile nóg ma owad?", 6),
  L("nogi-psa", "Ile łap ma pies?", 4),
  L("nogi-kury", "Ile nóg ma kura?", 2),
  L("skrzydla-motyla", "Ile skrzydeł ma motyl?", 4),
  L("nogi-stonogi-mit", "Ile odnóży ma krab razem ze szczypcami?", 10),
  L("serca-osmiornicy", "Ile serc ma ośmiornica?", 3),
  L("ramiona-osmiornicy", "Ile ramion ma ośmiornica?", 8),
  L("ramiona-rozgwiazdy", "Ile ramion ma typowa rozgwiazda?", 5),
  L("garby-dromadera", "Ile garbów ma dromader?", 1),
  L("garby-baktriana", "Ile garbów ma wielbłąd dwugarbny?", 2),
  L("rogi-nosorozca-bialego", "Ile rogów ma nosorożec biały?", 2),
  L("zeby", "Ile zębów ma dorosły człowiek z ósemkami?", 32),
  L("zeby-mleczne", "Ile zębów mlecznych ma dziecko?", 20),
  L("palce-reki", "Ile palców ma jedna ludzka dłoń?", 5),
  L("palce-razem", "Ile palców ma człowiek u rąk i nóg razem?", 20),
  L("oczy", "Ile oczu ma człowiek?", 2),
  L("nerki", "Ile nerek ma człowiek?", 2),
  L("pluca", "Ile płuc ma człowiek?", 2),
  L("jamy-serca", "Ile jam ma ludzkie serce?", 4),
  L("zebra", "Ile par żeber ma człowiek?", 12),
  L("zmysly", "Ile zmysłów tradycyjnie wymienia się u człowieka?", 5),

  // dom i codzienność
  L("dni-tygodnia", "Ile dni ma tydzień?", 7),
  L("miesiace-roku", "Ile miesięcy ma rok?", 12),
  L("pory-roku", "Ile jest pór roku?", 4),
  L("godziny-doby", "Ile godzin ma doba?", 24),
  L("minuty-godziny", "Ile minut ma godzina?", 60),
  L("sekundy-minuty", "Ile sekund ma minuta?", 60),
  L("dni-roku", "Ile dni ma zwykły rok?", 365),
  L("dni-rok-przestepny", "Ile dni ma rok przestępny?", 366),
  L("luty-zwykly", "Ile dni ma luty w zwykłym roku?", 28),
  L("luty", "Ile dni ma luty w roku przestępnym?", 29),
  L("dni-stycznia", "Ile dni ma styczeń?", 31),
  L("dni-kwietnia", "Ile dni ma kwiecień?", 30),
  L("tygodnie-roku", "Ile pełnych tygodni ma rok?", 52),
  L("cm-metr", "Ile centymetrów ma metr?", 100, "cm"),
  L("mm-cm", "Ile milimetrów ma centymetr?", 10, "mm"),
  L("m-kilometr", "Ile metrów ma kilometr?", 1000, "m"),
  L("gramy-kilogram", "Ile gramów ma kilogram?", 1000, "g"),
  L("ml-litr", "Ile mililitrów ma litr?", 1000, "ml"),
  L("litr-wody", "Ile gramów waży litr wody?", 1000, "g"),
  L("wrzenie", "W ilu stopniach Celsjusza wrze woda?", 100, "°C"),
  L("zamarzanie", "W ilu stopniach Celsjusza zamarza woda?", 0, "°C"),
  L("cyfry", "Ile jest cyfr arabskich?", 10),
  L("alfabet-pl", "Ile liter ma polski alfabet?", 32),
  L("alfabet-en", "Ile liter ma alfabet angielski?", 26),
  L("samogloski-pl", "Ile samogłosek ma polski alfabet?", 8),
  L("tuzin", "Ile sztuk to tuzin?", 12),
  L("kopa", "Ile sztuk to kopa?", 60),
  L("para", "Ile sztuk to para?", 2),
  L("procent-calosc", "Ile procent to całość?", 100, "%"),

  // geometria i liczby
  L("kat-pelny", "Ile stopni ma kąt pełny?", 360, "°"),
  L("kat-prosty", "Ile stopni ma kąt prosty?", 90, "°"),
  L("kat-polpelny", "Ile stopni ma kąt półpełny?", 180, "°"),
  L("trojkat-katy", "Ile stopni mają razem kąty w trójkącie?", 180, "°"),
  L("czworokat-katy", "Ile stopni mają razem kąty w czworokącie?", 360, "°"),
  L("boki-trojkata", "Ile boków ma trójkąt?", 3),
  L("boki-kwadratu", "Ile boków ma kwadrat?", 4),
  L("boki-pieciokata", "Ile boków ma pięciokąt?", 5),
  L("boki-szesciokata", "Ile boków ma sześciokąt?", 6),
  L("boki-osmiokata", "Ile boków ma ośmiokąt?", 8),
  L("sciany-szescianu", "Ile ścian ma sześcian?", 6),
  L("krawedzie-szescianu", "Ile krawędzi ma sześcian?", 12),
  L("wierzcholki-szescianu", "Ile wierzchołków ma sześcian?", 8),
  L("sciany-czworoscianu", "Ile ścian ma czworościan?", 4),
  L("kwadrat-12", "Ile wynosi 12 do kwadratu?", 144),
  L("kwadrat-9", "Ile wynosi 9 do kwadratu?", 81),
  L("dwa-do-dziesiatej", "Ile wynosi 2 do potęgi 10?", 1024),
  L("suma-1-do-10", "Ile wynosi suma liczb od 1 do 10?", 55),
  L("suma-1-do-100", "Ile wynosi suma liczb od 1 do 100?", 5050),

  // gry, muzyka, kultura popularna
  L("talia", "Ile kart ma standardowa talia bez jokerów?", 52),
  L("kolory-kart", "Ile kolorów ma talia kart?", 4),
  L("kostka", "Ile oczek jest w sumie na jednej kostce do gry?", 21),
  L("scianki-kostki", "Ile ścianek ma klasyczna kostka do gry?", 6),
  L("szachownica", "Ile pól ma szachownica?", 64),
  L("pionki", "Ile pionków ma jeden gracz w szachach?", 8),
  L("figury-szachowe", "Ile bierek ma jeden gracz na starcie partii szachów?", 16),
  L("monopoly", "Ile pól ma plansza do Monopoly?", 40),
  L("domino", "Ile kamieni ma klasyczny zestaw domina?", 28),
  L("gitara", "Ile strun ma standardowa gitara?", 6),
  L("skrzypce", "Ile strun mają skrzypce?", 4),
  L("pianino", "Ile klawiszy ma standardowe pianino?", 88),
  L("nuty-gamy", "Ile dźwięków ma gama durowa bez powtórzenia oktawy?", 7),
  L("krasnoludki", "Ilu krasnoludków miała Królewna Śnieżka?", 7),
  L("tecza", "Ile kolorów tradycyjnie wymienia się w tęczy?", 7),
  L("zodiak", "Ile jest znaków zodiaku?", 12),
  L("kola-olimpijskie", "Ile kół jest w symbolu olimpijskim?", 5),
  L("wladca-pierscieni", "Ile filmów liczy trylogia Władca Pierścieni?", 3),
  L("muszkieterowie", "Ilu było muszkieterów w tytule powieści Dumasa?", 3),
  L("cuda-swiata", "Ile było starożytnych cudów świata?", 7),
  L("kontynenty", "Ile jest kontynentów?", 7),
  L("oceany", "Ile oceanów wyróżnia się dzisiaj na Ziemi?", 5),
  L("planety", "Ile planet jest w Układzie Słonecznym?", 8),
  L("ksiezyce-ziemi", "Ile naturalnych księżyców ma Ziemia?", 1),

  // sport
  L("pilkarze", "Ilu piłkarzy jednej drużyny jest na boisku?", 11),
  L("mecz", "Ile minut trwa regulaminowy mecz piłki nożnej?", 90, "min"),
  L("polowa-meczu", "Ile minut trwa jedna połowa meczu piłki nożnej?", 45, "min"),
  L("koszykarze", "Ilu koszykarzy jednej drużyny jest na parkiecie?", 5),
  L("siatkarze", "Ilu siatkarzy jednej drużyny jest na boisku?", 6),
  L("hokeisci", "Ilu hokeistów jednej drużyny jest na lodzie?", 6),
  L("tenis-singiel", "Ilu tenisistów gra w meczu singlowym?", 2),
  L("igrzyska-lata", "Co ile lat odbywają się letnie igrzyska olimpijskie?", 4, "lata"),
  L("bramki-boisko", "Ile bramek jest na boisku do piłki nożnej?", 2),
  L("polowy-meczu", "Ile połów ma mecz piłki nożnej?", 2),

  // flagi i symbole
  L("kolory-flagi-pl", "Ile kolorów ma flaga Polski?", 2),
  L("gwiazdy-ue", "Ile gwiazd jest na fladze Unii Europejskiej?", 12),
  L("gwiazdy-usa", "Ile gwiazd jest na fladze USA?", 50),
  L("pasy-usa", "Ile pasów jest na fladze USA?", 13),
  L("kolory-flagi-fr", "Ile kolorów ma flaga Francji?", 3),
  L("statua", "Ile kolców ma korona Statuy Wolności?", 7),

  // ══════════════ ŚREDNI ══════════════
  // wiadomo mniej więcej, ale trzeba przymierzyć

  // ciało i biologia
  S("kosci", "Ile kości ma szkielet dorosłego człowieka?", 206),
  S("kosci-dloni", "Ile kości jest w jednej ludzkiej dłoni?", 27),
  S("kosci-stopy", "Ile kości jest w jednej ludzkiej stopie?", 26),
  S("chromosomy", "Ile chromosomów ma komórka człowieka?", 46),
  S("kregi-zyrafy", "Ile kręgów szyjnych ma żyrafa?", 7),
  S("zoladki-krowy", "Ile komór ma żołądek krowy?", 4),
  S("ciaza", "Ile mniej więcej dni trwa ciąża u człowieka?", 280, "dni"),
  S("tetno", "Ile uderzeń na minutę ma spoczynkowe tętno dorosłego?", 70),
  S("krew-litry", "Ile mniej więcej litrów krwi ma dorosły człowiek?", 5, "l"),
  S("woda-procent", "Ile procent masy ciała dorosłego stanowi woda?", 60, "%"),
  S("zeby-rekina-mit", "Ile zębów ma dorosły słoń?", 4),
  S("skrzydla-pszczoly", "Ile skrzydeł ma pszczoła?", 4),

  // czas i miary
  S("godziny-tygodnia", "Ile godzin ma tydzień?", 168, "h"),
  S("minuty-doby", "Ile minut ma doba?", 1440, "min"),
  S("sekundy-godziny", "Ile sekund ma godzina?", 3600, "s"),
  S("miesiace-31", "Ile miesięcy w roku ma 31 dni?", 7),
  S("bity-bajt", "Ile bitów ma bajt?", 8),
  S("klawisze-f", "Ile klawiszy funkcyjnych F ma typowa klawiatura?", 12),
  S("strefy-czasowe", "Ile jest stref czasowych na świecie?", 24),
  S("pianino-czarne", "Ile czarnych klawiszy ma standardowe pianino?", 36),
  S("pianino-biale", "Ile białych klawiszy ma standardowe pianino?", 52),
  S("kwadrat-25", "Ile wynosi 25 do kwadratu?", 625),
  S("dwa-do-16", "Ile wynosi 2 do potęgi 16?", 65536),

  // Polska
  S("wojewodztwa", "Ile województw jest w Polsce?", 16),
  S("poslowie", "Ilu posłów zasiada w Sejmie?", 460),
  S("senatorowie", "Ilu senatorów zasiada w Senacie?", 100),
  S("kadencja", "Ile lat trwa kadencja Prezydenta RP?", 5, "lat"),
  S("sasiedzi-polski", "Z iloma państwami graniczy Polska?", 7),
  S("wisla", "Ile kilometrów ma Wisła?", 1047, "km"),
  S("rysy", "Ile metrów ma wysokość Rysów?", 2499, "m"),
  S("pkin", "Ile metrów ma Pałac Kultury i Nauki razem z iglicą?", 237, "m"),
  S("ue-rok", "W którym roku Polska weszła do Unii Europejskiej?", 2004),
  S("nato-rok", "W którym roku Polska weszła do NATO?", 1999),
  S("chrzest", "W którym roku odbył się chrzest Polski?", 966),
  S("grunwald", "W którym roku była bitwa pod Grunwaldem?", 1410),
  S("konstytucja", "W którym roku uchwalono Konstytucję 3 maja?", 1791),
  S("niepodleglosc", "W którym roku Polska odzyskała niepodległość?", 1918),
  S("rozbiory", "Ile było rozbiorów Polski?", 3),

  // świat
  S("ue-panstwa", "Ile państw należy do Unii Europejskiej?", 27),
  S("onz", "Ile państw należy do ONZ?", 193),
  S("stany-usa", "Ile stanów ma USA?", 50),
  S("everest", "Ile metrów ma wysokość Mount Everestu?", 8849, "m"),
  S("eiffel", "Ile metrów ma wieża Eiffla?", 330, "m"),
  S("empire", "Ile pięter ma Empire State Building?", 102),
  S("wybuch-wojny", "W którym roku wybuchła II wojna światowa?", 1939),
  S("koniec-wojny", "W którym roku skończyła się II wojna światowa?", 1945),
  S("dlugosc-wojny", "Ile lat trwała II wojna światowa?", 6, "lat"),
  S("mur", "W którym roku upadł mur berliński?", 1989),
  S("rok-ksiezyc", "W którym roku człowiek pierwszy raz stanął na Księżycu?", 1969),
  S("rok-gagarin", "W którym roku Gagarin poleciał w kosmos?", 1961),
  S("titanic-rok", "W którym roku zatonął Titanic?", 1912),
  S("rewolucja-fr", "W którym roku wybuchła rewolucja francuska?", 1789),
  S("odkrycie-ameryki", "W którym roku Kolumb dotarł do Ameryki?", 1492),
  S("wojna-stuletnia", "Ile lat trwała wojna stuletnia?", 116, "lat"),

  // kosmos
  S("ksiezyce-marsa", "Ile księżyców ma Mars?", 2),
  S("slonce-minuty", "Ile minut światło leci ze Słońca na Ziemię?", 8, "min"),
  S("ludzie-na-ksiezycu", "Ilu ludzi stanęło na Księżycu?", 12),
  S("doba-marsa", "Ile mniej więcej godzin trwa doba na Marsie?", 25, "h"),
  S("swiatlo", "Ile wynosi prędkość światła w próżni?", 300000, "km/s"),

  // sport i gry
  S("maraton", "Ile kilometrów ma maraton w zaokrągleniu?", 42, "km"),
  S("dolki-golf", "Ile dołków ma pełne pole golfowe?", 18),
  S("pola-warcaby", "Ile pionków ma jeden gracz w warcabach stupolowych?", 20),
  S("krazki-backgammon", "Ile pionków ma jeden gracz w backgammonie?", 15),
  S("bramka-wysokosc", "Ile metrów szerokości ma bramka do piłki nożnej?", 7, "m"),
  S("kosz-wysokosc", "Ile metrów nad ziemią wisi obręcz do koszykówki?", 3, "m"),
  S("muzy", "Ile muz było w mitologii greckiej?", 9),
  S("prace-herkulesa", "Ile prac wykonał Herkules?", 12),

  // ══════════════ TRUDNY ══════════════
  // tu naprawdę trzeba strzelać

  S("rownik", "Ile kilometrów ma równik?", 40075, "km"),
  T("rowy-marianski", "Ile metrów głębokości ma Rów Mariański?", 10994, "m"),
  T("odra", "Ile kilometrów ma Odra?", 854, "km"),
  T("warta", "Ile kilometrów ma Warta?", 808, "km"),
  T("bug", "Ile kilometrów ma Bug?", 772, "km"),
  T("nil", "Ile kilometrów ma Nil?", 6650, "km"),
  T("amazonka", "Ile kilometrów ma Amazonka?", 6400, "km"),
  T("wolga", "Ile kilometrów ma Wołga?", 3531, "km"),
  T("dunaj", "Ile kilometrów ma Dunaj?", 2850, "km"),
  T("mont-blanc", "Ile metrów ma Mont Blanc?", 4808, "m"),
  T("kilimandzaro", "Ile metrów ma Kilimandżaro?", 5895, "m"),
  T("k2", "Ile metrów ma K2?", 8611, "m"),
  T("sniezka", "Ile metrów ma Śnieżka?", 1603, "m"),
  T("baltyk-glebokosc", "Ile metrów ma największa głębokość Bałtyku?", 459, "m"),
  T("hel-dlugosc", "Ile kilometrów ma Mierzeja Helska?", 35, "km"),

  T("obwod-ziemi-poludnik", "Ile kilometrów ma obwód Ziemi przez bieguny?", 40008, "km"),
  T("promien-ziemi", "Ile kilometrów ma promień Ziemi?", 6371, "km"),
  T("odleglosc-ksiezyc", "Ile tysięcy kilometrów dzieli Ziemię od Księżyca?", 384, "tys. km"),
  T("odleglosc-slonce", "Ile milionów kilometrów dzieli Ziemię od Słońca?", 150, "mln km"),
  T("srednica-slonca", "Ile tysięcy kilometrów ma średnica Słońca?", 1392, "tys. km"),
  T("rok-swietlny", "Ile bilionów kilometrów ma rok świetlny?", 9, "bln km"),
  T("temperatura-slonca", "Ile stopni Celsjusza ma powierzchnia Słońca?", 5500, "°C"),
  T("predkosc-ziemi", "Ile kilometrów na sekundę Ziemia pokonuje wokół Słońca?", 30, "km/s"),

  T("wysokosc-burdz", "Ile metrów ma Burdż Chalifa?", 828, "m"),
  T("wysokosc-cn", "Ile metrów ma wieża CN Tower w Toronto?", 553, "m"),
  T("dlugosc-muru", "Ile tysięcy kilometrów ma Wielki Mur Chiński?", 21, "tys. km"),
  T("schody-eiffla", "Ile schodów prowadzi na drugi poziom wieży Eiffla?", 674),
  T("wysokosc-niagara", "Ile metrów ma wysokość wodospadu Niagara?", 51, "m"),
  T("wysokosc-angel", "Ile metrów ma wodospad Salto Ángel?", 979, "m"),

  T("kosci-noworodka", "Ile kości ma noworodek?", 270),
  T("miesnie", "Ile mniej więcej mięśni szkieletowych ma człowiek?", 600),
  T("naczynia-km", "Ile tysięcy kilometrów mają wszystkie naczynia krwionośne człowieka?", 100, "tys. km"),
  T("komorki-mozgu", "Ile miliardów neuronów ma ludzki mózg?", 86, "mld"),
  T("oddechy", "Ile oddechów na minutę bierze dorosły w spoczynku?", 16),
  T("wlosy", "Ile tysięcy włosów ma przeciętna ludzka głowa?", 100, "tys."),
  T("temperatura-ciala", "Ile stopni Celsjusza ma prawidłowa temperatura ciała?", 37, "°C"),

  T("pszczola-kwiaty", "Ile kwiatów odwiedza pszczoła podczas jednego lotu?", 100),
  T("serce-kolibra", "Ile uderzeń na minutę ma serce kolibra w locie?", 1200),
  T("predkosc-geparda", "Ile kilometrów na godzinę osiąga gepard?", 110, "km/h"),
  T("predkosc-sokola", "Ile kilometrów na godzinę osiąga sokół wędrowny w locie nurkowym?", 350, "km/h"),
  T("waga-slonia", "Ile ton waży dorosły słoń afrykański?", 6, "t"),
  T("dlugosc-plywacza", "Ile metrów długości ma płetwal błękitny?", 30, "m"),
  T("zycie-muchy", "Ile dni żyje mucha domowa?", 28, "dni"),
  T("jaja-strusia", "Ile kilogramów waży jajo strusia?", 1, "kg"),

  T("bajty-kilobajt", "Ile bajtów ma kibibajt (KiB)?", 1024),
  T("dwa-do-32", "Ile wynosi 2 do potęgi 32?", 4294967296),
  T("liczba-pi", "Ile wynosi liczba pi pomnożona przez 100 i zaokrąglona?", 314),
  T("sekundy-roku", "Ile milionów sekund ma rok?", 31, "mln"),
  T("godziny-roku", "Ile godzin ma zwykły rok?", 8760, "h"),
  T("minuty-roku", "Ile minut ma zwykły rok?", 525600, "min"),
  T("dni-stulecia", "Ile dni ma stulecie bez lat przestępnych?", 36500, "dni"),

  T("klawisze-organow", "Ile klawiszy ma pedał organów koncertowych?", 32),
  T("struny-harfy", "Ile strun ma harfa koncertowa?", 47),
  T("elementy-orkiestry", "Ilu muzyków liczy typowa orkiestra symfoniczna?", 80),
  T("dlugosc-symfonii", "Ile symfonii napisał Beethoven?", 9),
  T("opery-mozarta", "Ile symfonii napisał Mozart?", 41),
  T("preludia-chopina", "Ile preludiów op. 28 napisał Chopin?", 24),

  T("kosci-domino-podwojne", "Ile kamieni ma zestaw domina podwójnie dziewiątkowego?", 55),
  T("mozliwe-partie-szach", "Ile jest możliwych otwarć pierwszym ruchem w szachach?", 20),
  T("pola-go", "Ile przecięć ma plansza do go?", 361),
  T("karty-tarota", "Ile kart ma pełna talia tarota?", 78),
  T("kostki-rubika", "Ile małych kwadratów ma jedna ściana kostki Rubika?", 9),
  T("naklejki-rubika", "Ile kolorowych naklejek ma kostka Rubika?", 54),

  T("igrzyska-1896", "W którym roku odbyły się pierwsze nowożytne igrzyska olimpijskie?", 1896),
  T("mundial-pierwszy", "W którym roku odbyły się pierwsze mistrzostwa świata w piłce nożnej?", 1930),
  T("tour-de-france", "W którym roku odbył się pierwszy Tour de France?", 1903),
  T("dlugosc-tour", "Ile mniej więcej kilometrów liczy cały Tour de France?", 3500, "km"),
  T("basen-olimpijski", "Ile metrów długości ma basen olimpijski?", 50, "m"),
  T("bieznia-stadion", "Ile metrów ma okrążenie bieżni stadionowej?", 400, "m"),
  T("wysokosc-siatki", "Ile centymetrów ma wysokość siatki w siatkówce mężczyzn?", 243, "cm"),
  T("waga-pilki", "Ile gramów waży piłka do piłki nożnej?", 430, "g"),

  T("wynalezienie-druku", "W którym roku Gutenberg wydrukował swoją Biblię?", 1455),
  T("pierwszy-lot", "W którym roku bracia Wright odbyli pierwszy lot?", 1903),
  T("pierwszy-telefon", "W którym roku opatentowano telefon?", 1876),
  T("pierwsza-zarowka", "W którym roku Edison opatentował żarówkę?", 1879),
  T("powstanie-internetu", "W którym roku powstała sieć WWW?", 1989),
  T("pierwszy-iphone", "W którym roku pokazano pierwszego iPhone'a?", 2007),
  T("upadek-rzymu", "W którym roku upadło cesarstwo zachodniorzymskie?", 476),
  T("wielka-schizma", "W którym roku doszło do wielkiej schizmy wschodniej?", 1054),
  T("bitwa-hastings", "W którym roku była bitwa pod Hastings?", 1066),
  T("magna-carta", "W którym roku podpisano Magna Carta?", 1215),
  T("wojna-trzydziestoletnia", "Ile lat trwała wojna trzydziestoletnia?", 30, "lat"),
  T("wojna-secesyjna", "Ile lat trwała wojna secesyjna?", 4, "lata"),

  T("piramida-cheopsa", "Ile metrów ma dziś wysokość piramidy Cheopsa?", 138, "m"),
  T("bloki-piramidy", "Ile milionów bloków ma piramida Cheopsa?", 2, "mln"),
  T("kolumny-partenonu", "Ile kolumn ma fasada Partenonu?", 8),
  T("stopnie-koloseum", "Ilu widzów mieściło Koloseum?", 50000),
  T("dlugosc-kanalu-sueskiego", "Ile kilometrów ma Kanał Sueski?", 193, "km"),
  T("dlugosc-kanalu-panamskiego", "Ile kilometrów ma Kanał Panamski?", 82, "km"),

  T("jezyki-swiata", "Ile jest mniej więcej języków na świecie?", 7000),
  T("znaki-chinskie", "Ile znaków trzeba znać, by czytać chińską gazetę?", 3000),
  T("slowa-szekspir", "Ile sztuk napisał Szekspir?", 37),
  T("ksiegi-biblii", "Ile ksiąg ma Biblia w kanonie katolickim?", 73),
  T("wiersze-pana-tadeusza", "Ile ksiąg ma Pan Tadeusz?", 12),
  T("strony-w-lotr", "Ile tomów ma Władca Pierścieni?", 3),

  // ── łatwe: liczby i miary, które ma się w głowie ──
  L("zera-milion", "Ile zer ma milion?", 6),
  L("zera-tysiac", "Ile zer ma tysiąc?", 3),
  L("lata-wieku", "Ile lat ma wiek?", 100, "lat"),
  L("lata-tysiaclecia", "Ile lat ma tysiąclecie?", 1000, "lat"),
  L("polowa-setki", "Ile to połowa setki?", 50),
  L("cwierc-setki", "Ile to ćwierć setki?", 25),
  L("kwadrat-7", "Ile wynosi 7 do kwadratu?", 49),
  L("kwadrat-15", "Ile wynosi 15 do kwadratu?", 225),
  L("pierwiastek-144", "Ile wynosi pierwiastek kwadratowy ze 144?", 12),
  L("pierwiastek-81", "Ile wynosi pierwiastek kwadratowy z 81?", 9),
  L("kat-szesciokata", "Ile stopni ma kąt wewnętrzny sześciokąta foremnego?", 120, "°"),
  L("kat-pieciokata", "Ile stopni ma kąt wewnętrzny pięciokąta foremnego?", 108, "°"),
  L("przekatne-pieciokata", "Ile przekątnych ma pięciokąt?", 5),
  L("jaja-tuzin", "Ile jajek jest w tuzinie?", 12),
  L("talia-jokery", "Ile kart ma talia razem z dwoma jokerami?", 54),
  L("figury-koloru", "Ile figur ma jeden kolor w talii kart?", 3),
  L("czarne-pola", "Ile czarnych pól ma szachownica?", 32),
  L("pionki-chinczyk", "Ile pionków ma jeden gracz w chińczyku?", 4),
  L("linie-pieciolinii", "Ile linii ma pięciolinia?", 5),
  L("struny-ukulele", "Ile strun ma ukulele?", 4),
  L("struny-basu", "Ile strun ma klasyczna gitara basowa?", 4),
  L("pelnoletnosc", "Ile lat trzeba mieć, żeby być pełnoletnim w Polsce?", 18, "lat"),
  L("klasy-podstawowki", "Ile klas ma polska szkoła podstawowa?", 8),
  L("liceum-lata", "Ile lat trwa dziś polskie liceum?", 4, "lata"),
  L("licencjat", "Ile lat trwają studia licencjackie?", 3, "lata"),
  L("teren-zabudowany", "Ile km/h wolno jechać w terenie zabudowanym w Polsce?", 50, "km/h"),
  L("kadencja-sejmu", "Ile lat trwa kadencja Sejmu?", 4, "lata"),
  L("piwo-procenty", "Ile procent alkoholu ma typowe jasne piwo?", 5, "%"),
  L("wodka-procenty", "Ile procent alkoholu ma typowa wódka?", 40, "%"),
  L("kieliszek-wodki", "Ile mililitrów ma standardowy kieliszek wódki?", 50, "ml"),
  L("tabliczka-czekolady", "Ile gramów ma standardowa tabliczka czekolady?", 100, "g"),

  // ── średnie: wie się mniej więcej, trzeba przymierzyć ──
  S("liczby-pierwsze-20", "Ile jest liczb pierwszych mniejszych od 20?", 8),
  S("liczby-pierwsze-100", "Ile jest liczb pierwszych mniejszych od 100?", 25),
  S("silnia-5", "Ile wynosi silnia z 5?", 120),
  S("silnia-6", "Ile wynosi silnia z 6?", 720),
  S("litery-greckie", "Ile liter ma alfabet grecki?", 24),
  S("litery-rosyjskie", "Ile liter ma alfabet rosyjski?", 33),
  S("litery-hebrajskie", "Ile liter ma alfabet hebrajski?", 22),
  S("oktawa-chromatyczna", "Ile dźwięków ma oktawa chromatyczna?", 12),
  S("landy-niemiec", "Ile landów mają Niemcy?", 16),
  S("kantony-szwajcarii", "Ile kantonów ma Szwajcaria?", 26),
  S("regiony-wloch", "Ile regionów mają Włochy?", 20),
  S("wspolnoty-hiszpanii", "Ile wspólnot autonomicznych ma Hiszpania?", 17),
  S("emiraty", "Ile emiratów tworzy Zjednoczone Emiraty Arabskie?", 7),
  S("wyspy-japonii", "Ile głównych wysp ma Japonia?", 4),
  S("panstwa-am-pd", "Ile państw jest w Ameryce Południowej?", 12),
  S("panstwa-afryki", "Ile państw jest w Afryce?", 54),
  S("planety-karlowate", "Ile planet karłowatych uznaje oficjalnie IAU?", 5),
  S("nachylenie-osi", "Ile stopni ma nachylenie osi Ziemi w zaokrągleniu?", 23, "°"),
  S("biegun-szerokosc", "Ile stopni szerokości geograficznej ma biegun północny?", 90, "°"),
  S("kalorie-tluszcz", "Ile kalorii ma gram tłuszczu?", 9, "kcal"),
  S("kalorie-bialko", "Ile kalorii ma gram białka?", 4, "kcal"),
  S("kalorie-wegle", "Ile kalorii ma gram węglowodanów?", 4, "kcal"),
  S("butelka-wina", "Ile mililitrów ma standardowa butelka wina?", 750, "ml"),
  S("plyta-cd", "Ile megabajtów mieści zwykła płyta CD?", 700, "MB"),
  S("klatki-filmu", "Ile klatek na sekundę ma klasyczny film kinowy?", 24),
  S("full-hd", "Ile pikseli w poziomie ma obraz Full HD?", 1920),
  S("cztery-k", "Ile pikseli w poziomie ma obraz 4K?", 3840),
  S("klawiatura", "Ile klawiszy ma pełnowymiarowa klawiatura?", 104),
  S("punkty-karne", "Ile punktów karnych można zebrać w Polsce przed utratą prawa jazdy?", 24),
  S("autostrada", "Ile km/h wolno jechać po polskiej autostradzie?", 140, "km/h"),
  S("kwarty-nba", "Ile kwart ma mecz NBA?", 4),
  S("minuty-kwarty", "Ile minut trwa kwarta w NBA?", 12, "min"),
  S("rzut-za-trzy", "Ile punktów daje celny rzut zza łuku?", 3),
  S("gemy-seta", "Ile gemów trzeba wygrać, żeby wziąć seta w tenisie?", 6),
  S("rugby-zawodnicy", "Ilu zawodników ma drużyna rugby union na boisku?", 15),
  S("baseball-zawodnicy", "Ilu zawodników drużyny broniącej jest na boisku w baseballu?", 9),
  S("rundy-boksu", "Ile rund ma zawodowa walka bokserska o mistrzostwo świata?", 12),
  S("runda-boksu-minuty", "Ile minut trwa runda w boksie zawodowym?", 3, "min"),
  S("tercje-hokeja", "Ile tercji ma mecz hokeja?", 3),
  S("tercja-minuty", "Ile minut trwa tercja w hokeju?", 20, "min"),
  S("style-zmienny", "Ile stylów pływackich składa się na styl zmienny?", 4),
  S("rok-marsa", "Ile ziemskich dni trwa rok na Marsie?", 687, "dni"),
  S("doba-wenus", "Ile ziemskich dni trwa doba na Wenus?", 243, "dni"),
  S("rok-wenus", "Ile ziemskich dni trwa rok na Wenus?", 225, "dni"),

  // ── trudne: trzeba naprawdę strzelać ──
  T("ipv4-bity", "Ile bitów ma adres IPv4?", 32),
  T("ipv6-bity", "Ile bitów ma adres IPv6?", 128),
  T("port-http", "Na którym porcie domyślnie działa HTTP?", 80),
  T("port-https", "Na którym porcie domyślnie działa HTTPS?", 443),
  T("mac-znaki", "Ile znaków szesnastkowych ma adres MAC?", 12),
  T("kolo-podbiegunowe", "Ile stopni szerokości geograficznej ma koło podbiegunowe?", 66, "°"),
  T("dlugosc-granicy-pl", "Ile kilometrów ma cała granica Polski?", 3511, "km"),
  T("powierzchnia-pl", "Ile tysięcy kilometrów kwadratowych ma Polska?", 312, "tys. km²"),
  T("jeziora-mazur", "Ile jezior liczy Kraina Wielkich Jezior Mazurskich?", 2000),
  T("dlugosc-wybrzeza-pl", "Ile kilometrów ma polskie wybrzeże?", 770, "km"),
  T("puszcza-bialowieska", "Ile kilometrów kwadratowych ma polska część Puszczy Białowieskiej?", 620, "km²"),
  T("wieza-mariacka", "Ile metrów ma wyższa wieża kościoła Mariackiego w Krakowie?", 82, "m"),
  T("zamek-malbork", "Ile hektarów zajmuje zamek w Malborku?", 21, "ha"),
  T("kopalnia-wieliczka", "Ile kilometrów mają korytarze kopalni w Wieliczce?", 245, "km"),
  T("stopnie-schodow-eiffel-gora", "Ile schodów prowadzi na sam szczyt wieży Eiffla?", 1665),
  T("wysokosc-luku", "Ile metrów ma Łuk Triumfalny w Paryżu?", 50, "m"),
  T("wysokosc-big-ben", "Ile metrów ma wieża Big Bena?", 96, "m"),
  T("wysokosc-krzywej", "Ile metrów ma Krzywa Wieża w Pizie?", 56, "m"),
  T("dlugosc-golden-gate", "Ile metrów ma główne przęsło mostu Golden Gate?", 1280, "m"),
  T("stopnie-machu-picchu", "Ile metrów nad poziomem morza leży Machu Picchu?", 2430, "m"),
  T("glebokosc-bajkal", "Ile metrów głębokości ma jezioro Bajkał?", 1642, "m"),
  T("powierzchnia-sahary", "Ile milionów kilometrów kwadratowych ma Sahara?", 9, "mln km²"),
  T("dlugosc-andow", "Ile kilometrów mają Andy?", 7000, "km"),
  T("wysokosc-atmosfery", "Ile kilometrów nad ziemię sięga umowna granica kosmosu?", 100, "km"),
  T("cisnienie-atmosferyczne", "Ile hektopaskali wynosi normalne ciśnienie atmosferyczne?", 1013, "hPa"),
  T("predkosc-dzwieku", "Ile metrów na sekundę wynosi prędkość dźwięku w powietrzu?", 343, "m/s"),
  T("temperatura-zero", "Ile stopni Celsjusza ma zero absolutne?", -273, "°C"),
  T("gestosc-zlota", "Ile gramów na centymetr sześcienny waży złoto?", 19, "g/cm³"),
  T("czas-polowicznego-c14", "Ile lat wynosi czas połowicznego rozpadu węgla C-14?", 5730, "lat"),
  T("liczba-atomowa-zlota", "Jaką liczbę atomową ma złoto?", 79),
  T("liczba-atomowa-zelaza", "Jaką liczbę atomową ma żelazo?", 26),
  T("pierwiastki-uklad", "Ile pierwiastków ma dziś układ okresowy?", 118),
  T("kosci-rekina", "Ile zębów w ciągu życia zmienia rekin?", 30000),
  T("jaja-krolowej", "Ile jaj dziennie składa królowa pszczół?", 2000),
  T("miod-loty", "Ile kilometrów przelatuje pszczela rodzina, żeby zebrać kilogram miodu?", 150000, "km"),
  T("serce-wieloryba", "Ile kilogramów waży serce płetwala błękitnego?", 180, "kg"),
  T("jezyk-zyrafy", "Ile centymetrów ma język żyrafy?", 50, "cm"),
  T("sen-zyrafy", "Ile godzin na dobę śpi żyrafa?", 2, "h"),
  T("skok-pchly", "Ile razy własnej długości potrafi skoczyć pchła?", 100),
  T("mrowki-waga", "Ile razy więcej od siebie potrafi unieść mrówka?", 50),
];

/** Picks `count` distinct questions at random, optionally from one level. */
export function drawQuestions(count: number, level?: RfLevel): RfQuestion[] {
  const pool = level ? RF_QUESTIONS.filter((q) => q.level === level) : [...RF_QUESTIONS];
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function findQuestion(id: string): RfQuestion | undefined {
  return RF_QUESTIONS.find((q) => q.id === id);
}

export function countByLevel(level: RfLevel): number {
  return RF_QUESTIONS.filter((q) => q.level === level).length;
}
