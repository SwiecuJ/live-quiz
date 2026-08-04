/**
 * The part a human narrator would improvise, written out so nobody has to.
 * These are read aloud, so they're whole little scenes rather than captions.
 *
 * Deaths and lynchings are assembled from three interchangeable beats --
 * the mood of the morning, the moment of discovery, and a detail that makes
 * it land -- instead of being picked whole from a list. A dozen fixed texts
 * start repeating within two games; a few dozen fragments multiply out into
 * thousands of scenes that nobody hears twice.
 *
 * Three rules hold the writing together. Break any of them and the seams
 * show immediately -- players read this as one voice, not as parts.
 *
 * Present tense, always. Polish past-tense verbs agree with the subject's
 * gender, and the victim is whoever the mafia picked -- so past tense forces
 * either "siedział(a)", which reads like a government form, or a guess that
 * is wrong half the time. The present tense third person is genderless:
 * leży, siedzi, stoi, patrzy. It also sounds like it's happening now, which
 * is what a narrator wants anyway. For the same reason: no participles
 * about the victim (oparty/oparta, przysypany/przysypana).
 *
 * The name only ever lands in the nominative. Polish declines names, and
 * an arbitrary nickname can't be declined by rule -- "Należały do {ofiara}"
 * produced "do Krysia" instead of "do Krysi". So every fragment is built so
 * the name is the subject or follows "to": "leży {ofiara}", "To {ofiara}".
 *
 * Only the discovery names a place or a finder. The mood is the town as a
 * whole and the detail is the scene itself, so that any three of them can
 * stand next to each other without one contradicting the next. A detail
 * that says "in this flat" lands next to a body found on a bench.
 */

// ── śmierć: nastrój poranka ─────────────────────────────────────────────
const DEATH_MOOD = [
  "Poranek jest jasny i zimny. Taki, w którym widać za dużo.",
  "Nad miastem wisi mgła i nikomu nie spieszno jej rozganiać.",
  "Miasto budzi się później niż zwykle. Jakby zwlekało.",
  "W nocy pada deszcz i zmywa wszystko, co dało się zmyć.",
  "Jest piękny poranek. To najgorsze, co można o nim powiedzieć.",
  "Piekarnia otwiera się punktualnie. To ostatnia normalna rzecz tego dnia.",
  "Słońce wychodzi zza dachów i przez chwilę wszystko wygląda jak zawsze.",
  "Nikt nie spał dobrze. Rano wszyscy wyglądają, jakby mieli coś na sumieniu.",
  "W radiu lecą prognozy pogody, kiedy zaczynają dzwonić pierwsze telefony.",
  "Od czwartej nad ranem wiatr przewraca doniczki na parapetach.",
  "Dzwon bije na szóstą, jak co dzień. Tego dnia nikt nie modli się o pogodę.",
  "Jest zwyczajny wtorek. Do wpół do dziewiątej.",
  "Rosa jeszcze nie zeszła z trawy, a pod ratuszem już stoi tłumek.",
  "Miasto pachnie chlebem i mokrym asfaltem. Potem już tylko strachem.",
  "Pierwszy autobus przejeżdża pusty. Kierowca mówi potem, że coś czuł.",
  "Ktoś wyprowadza psa. Pies staje i nie chce iść dalej.",
  "W nocy przechodzi burza. Prąd wraca dopiero o siódmej.",
  "Na rynku rozkładają stragany. Do południa wszystkie są zwinięte.",
  "Poranek jest tak cichy, że słychać własne kroki na drugim końcu ulicy.",
  "Dzień zaczyna się od tego, że proboszcz nie otwiera kościoła o czasie.",
  "Pierwsze, co słyszy miasto, to syrena. Drugie — plotkę.",
  "Kawiarnia na rogu ma otwarte drzwi i pusty lokal. Nikt nie wchodzi na kawę.",
  "Ktoś od rana próbuje się dodzwonić. Nikt nie odbiera.",
  "Mróz w nocy ściął kałuże. Rano pękają pod butami jak szkło.",
];

// ── śmierć: znalezienie (jedyne miejsce, gdzie pada imię i nazwa miejsca) ─
const DEATH_FIND = [
  "Sołtys idzie brzegiem rzeki. Przy trzeciej ławce zwalnia, potem staje. Na ławce, prosto, z rękami na kolanach, siedzi {ofiara}.",
  "Listonosz wciska awizo w skrzynkę i zagląda przez uchylone drzwi. W przedpokoju, twarzą do podłogi, leży {ofiara}.",
  "Sąsiadka przychodzi oddać pożyczoną drabinę. Drzwi otwarte, radio gra, a przy stole — już od kilku godzin — siedzi {ofiara}.",
  "Dzieciaki skracają sobie drogę przez park i milkną w pół kroku. Pod topolą leży {ofiara}.",
  "Barmanka otwiera lokal i potyka się o coś w progu. W progu leży {ofiara}.",
  "Ekipa z wodociągów schodzi do studzienki po awarii. Wychodzi po dziesięciu sekundach. Na dole jest {ofiara}.",
  "Proboszcz otwiera kościół przed poranną mszą. W pierwszej ławce, z głową opartą o oparcie, klęczy {ofiara}.",
  "Właściciel warsztatu podnosi roletę i cofa się o krok. Na kanale, pod podniesionym autem, leży {ofiara}.",
  "Bibliotekarka wchodzi do czytelni z kubkiem herbaty. Kubek nie dolatuje do biurka. Przy oknie siedzi {ofiara}.",
  "Rybak zarzuca sieć przy pomoście i wyciąga ją z oporem. Przy filarze jest {ofiara}.",
  "Sprzątaczka otwiera szkolną salę gimnastyczną. Na środku parkietu, pod koszem, leży {ofiara}.",
  "Piekarz wynosi worki na tyły. Za kontenerem, plecami do muru, siedzi {ofiara}.",
  "Kobieta z pierwszego piętra wystawia śmieci i krzyczy tak, że budzi całą klatkę. W wiacie śmietnikowej leży {ofiara}.",
  "Kioskarz układa gazety i zauważa, że ktoś od godziny stoi po drugiej stronie ulicy i nie rusza się. To {ofiara}.",
  "Nauczyciel WF-u otwiera szatnię, żeby wyłożyć piłki. Na ławce między wieszakami leży {ofiara}.",
  "Dozorca idzie zakręcić wodę w pralni. Na posadzce, między pralkami, leży {ofiara}.",
  "Ogrodnik przychodzi podlać rabaty przed ratuszem. Między krzewami, twarzą do nieba, leży {ofiara}.",
  "Pielęgniarka idzie na dyżur i skręca w bramę, bo słyszy kapanie. W podwórku, pod rynną, leży {ofiara}.",
  "Chłopak z pizzerii przyjeżdża pod adres z zamówieniem sprzed trzech godzin. Drzwi otwierają się same. Za nimi leży {ofiara}.",
  "Straż pożarna wyważa drzwi po zgłoszeniu o dymie. Dymu nie ma. W kuchni, przy włączonym palniku, siedzi {ofiara}.",
  "Panie ze świetlicy przychodzą na próbę chóru. Przy pianinie, z otwartym zeszytem nut, siedzi {ofiara}.",
  "Mechanik wjeżdża na parking pod blokiem i widzi auto z włączonymi światłami. Za kierownicą siedzi {ofiara}.",
  "Leśniczy obchodzi ambonę na skraju lasu. Na drabince, w pozycji, w której nikt nie zasypia, jest {ofiara}.",
  "Sprzątający po weselu wchodzą do sali o siódmej. Pod sceną, między krzesłami, leży {ofiara}.",
  "Listonoszka idzie skrótem przez działki. W altance, przy stole nakrytym do dwóch osób, siedzi {ofiara}.",
  "Ekspedientka wychodzi na papierosa o szóstej rano. Pod ścianą, w kucki, siedzi {ofiara}.",
  "Ratownik sprawdza kładkę nad zalewem i widzi, że coś zaczepiło się o filar. To {ofiara}.",
  "Grabarz przychodzi wcześniej niż zwykle i zastaje świeżo rozkopaną ziemię tam, gdzie nikogo nie chowano. Pod nią jest {ofiara}.",
  "Kelner wynosi butelki i widzi buty wystające zza kontenera. To {ofiara}.",
  "Ochroniarz przewija nagranie z nocy. O 2:14 ktoś wychodzi z kadru i już nie wraca. To {ofiara}.",
  "Weterynarz przyjeżdża do chorego konia i zastaje otwarte wrota stajni. W boksie, na słomie, leży {ofiara}.",
  "Turysta robi zdjęcia mostu i dopiero w domu widzi, co złapał w kadr. Pod przęsłem jest {ofiara}.",
  "Portier idzie sprawdzić, czemu z dwieście czwórki nie odbierają. Za drzwiami, w ubraniu, na zasłanym łóżku, leży {ofiara}.",
  "Kolejarz obchodzi tory przed pierwszym pociągiem. Na nasypie, kilkanaście metrów od przejazdu, leży {ofiara}.",
  "Traktorzysta zawraca na skraju pola i gasi silnik. W bruździe, pod naciągniętą słomą, leży {ofiara}.",
  "Dwie sąsiadki idą na targ i zatrzymują się przy przystanku. Na ławce, z torbą na kolanach, siedzi {ofiara}.",
];

// ── śmierć: szczegół, od którego robi się zimno (bez miejsca, bez imienia) ─
const DEATH_DETAIL = [
  "Nic nie zginęło. Portfel leży obok, otwarty, jakby ktoś chciał pokazać, że go nie ruszał.",
  "Ubranie jest zapięte pod samą szyję. Za starannie. Ktoś poprawiał je już potem.",
  "W dłoni został skrawek papieru. Zanim przyjeżdża policja, ktoś zdąża go zabrać.",
  "Zegarek stanął o 2:47. Wszystkie inne zegary w mieście chodzą normalnie.",
  "Obok stoją dwa kubki. Z jednego ktoś wypił do końca.",
  "Buty są czyste. Zupełnie czyste, choć dookoła samo błoto.",
  "Telefon leży ekranem do góry, z zaczętą wiadomością. Adresat: nikt. Treść: jedno imię, skasowane.",
  "Oczy są zamknięte. Ludzie, którzy odchodzą sami, mają je otwarte.",
  "Obok jest drugi ślad buta. Numer czterdzieści trzy. W tym mieście mało kto nosi taki numer.",
  "Pies nie chce podejść bliżej. Warczy w stronę, z której nikt nie nadchodzi.",
  "Wszystko wygląda na wypadek. Zbyt wyraźnie na wypadek.",
  "Ktoś ustawił obok trzy kamienie. Równiutko, jeden na drugim.",
  "Nie ma śladów szarpaniny. Czyli to był ktoś znajomy.",
  "Kurtka leży złożona obok, choć noc jest zimna. Ktoś ją tam położył.",
  "W kieszeni jest klucz, który nie pasuje do żadnych drzwi w tym mieście.",
  "Sąsiedzi zgodnie twierdzą, że nic nie słyszeli. Wszyscy. Co do jednego.",
  "Papieros dopalił się do filtra, wgnieciony obcasem w ziemię. Ktoś tu stał i czekał.",
  "Na kartce w kieszeni są trzy litery. Przekreślone.",
  "Ślady urywają się w pół drogi, jakby ktoś wsiadł do samochodu.",
  "Gdzieś gra radio. Ta sama stacja, którą włącza pół miasta.",
  "Nikt nie zauważył niczego dziwnego. A ktoś przy tym stole wie dokładnie, jak było.",
  "Policja zapisuje: przyczyny ustala się. Wszyscy wiedzą, że nic nie ustali.",
  "Obrączka zniknęła. Reszta złota została na miejscu.",
  "Najbliższa latarnia nie świeci. Rano technik stwierdza, że ktoś wykręcił żarówkę.",
  "Ślady opon urywają się w poprzek chodnika. Ktoś podjechał i zawrócił.",
  "Okna dookoła są pozasłaniane. O tej porze roku nikt nie zasłania okien.",
  "Ktoś zabrał tylko jedną rzecz: klucze. Pieniądze zostały.",
  "Kamera, która mogła to widzieć, akurat tej nocy patrzy w ścianę.",
  "Na rękawie jest ślad mąki. W tym mieście z mąką pracują trzy osoby.",
  "Pod głowę ktoś podłożył zwiniętą kurtkę. Zabójcy tego nie robią. Znajomi tak.",
  "Kwiaty pojawiają się jeszcze przed policją. Nikt nie widzi, kto je przynosi.",
  "W telefonie jest jedno nieodebrane połączenie. Z trzeciej w nocy.",
];

// ── lincz ───────────────────────────────────────────────────────────────
const LYNCH_MOOD = [
  "Kłótnia zaczyna się przy fontannie, a kończy pod ratuszem.",
  "Najpierw padają argumenty. Potem już tylko nazwiska.",
  "Nikt potem nie pamięta, kto pierwszy powiedział to na głos.",
  "Głosowanie trwa krócej niż wybór piwa w sklepie.",
  "Ludzie stoją w półkolu i unikają swojego wzroku.",
  "Ktoś przynosi krzesło, żeby lepiej widzieć. Nikt na nim nie siada.",
  "Rozmowa trwa dwie godziny i nie przekonuje nikogo, kto już ma zdanie.",
  "Sołtys próbuje to zatrzymać. Przestaje próbować po dziesięciu minutach.",
  "Tłum jest szybszy od sumienia. Zawsze był.",
  "Padają trzy nazwiska. Zostaje jedno.",
];

const LYNCH_FIND = [
  "Miasto wskazuje: {ofiara}. Bez apelacji, bez namysłu, bez drugiego głosowania.",
  "{ofiara} próbuje się tłumaczyć. Zdanie urywa się w połowie, bo nikt już nie słucha.",
  "{ofiara} powtarza w kółko jedno nazwisko. Nie swoje.",
  "{ofiara} nie mówi nic. Wszystkim to wystarcza za przyznanie się.",
  "{ofiara} śmieje się jeszcze przy pierwszych głosach. Przy ostatnich już nie.",
  "{ofiara} patrzy po twarzach i rozumie, że to już postanowione.",
  "{ofiara} wyciąga rękę do kogoś ze znajomych. Nikt jej nie ściska.",
  "Za rynek idzie cały tłum, a przodem — {ofiara}.",
  "{ofiara} prosi o jeszcze jedną noc. Miasto nie chce czekać.",
  "{ofiara} do końca powtarza, że to pomyłka. Może nawet mówi prawdę.",
];

const LYNCH_DETAIL = [
  "Wieczorem nikt nie ma ochoty na kolację.",
  "Do końca dnia nikt nie wypowiada tego imienia na głos.",
  "Kilka osób od razu wraca do domów. Reszta zostaje na rynku i milczy.",
  "Ktoś zapala świeczkę pod fontanną. Ktoś inny ją gasi.",
  "Sąsiedzi, którzy w zeszłym tygodniu pili razem, dziś patrzą w bruk.",
  "Zapada cisza, w której słychać, jak ktoś oddycha za szybko.",
  "Dopiero teraz ludzie zaczynają liczyć, ilu ich jeszcze zostało.",
  "Nikt nie ma odwagi zapytać, co jeśli się pomylili.",
];

// ── pozostałe beaty ──────────────────────────────────────────────────────
const OPENING = [
  "Miasteczko jak z pocztówki. Rynek, fontanna, dwa bary i jedna apteka. Wszyscy się znają, wszyscy się pozdrawiają.\n\nOd trzech tygodni ktoś znika. Policja rozkłada ręce, ludzie przestali zostawiać otwarte okna.\n\nDziś wieczorem gaśnie ostatnie światło. Ktoś przy tym stole wie dokładnie, co się dzieje.",
  "Zaczyna się od plotki, że w mieście ktoś jest. Nie przyjechał — po prostu jest. Ktoś, kto zna wasze rozkłady dnia lepiej niż wy sami.\n\nNikt w to nie wierzył. Do wczoraj.\n\nDziś w nocy przekonacie się, że plotka ma twarz. Prawdopodobnie znajomą.",
  "Autobus do miasta jeździ dwa razy dziennie. Ostatni odjechał o osiemnastej i nikt nim nie odjechał.\n\nCzyli kto tu jest, ten zostaje. Łącznie z tym, kto to wszystko zaczął.\n\nDobranoc. Śpijcie dobrze, jeśli potraficie.",
  "Na zebraniu sołtys mówi, żeby nie panikować. Godzinę później sam zamyka sklep na cztery spusty.\n\nDziś nikt nie zaśnie spokojnie. Jedni ze strachu, inni dlatego, że mają robotę do wykonania.",
  "Znacie się od podstawówki. Chodziliście na te same wesela, pożyczaliście sobie kosiarkę, kłóciliście się o miedzę.\n\nDlatego to takie trudne. Bo ten, kto to robi, siedzi teraz obok was i pyta, czy podać sól.",
];

const NIGHTFALL = [
  "Gasną latarnie. Miasto zamyka oczy — jedno po drugim, aż zostaje szum lodówki i czyjeś kroki na klatce.",
  "Zegar na wieży wybija dwunastą. Ostatnie okno gaśnie. W ciemności ktoś właśnie otwiera oczy.",
  "Miasto idzie spać. Ktoś udaje, że też.",
  "Ostatni pies przestaje szczekać. Zapada cisza, w której słychać każdy krok na żwirze.",
  "Rolety opadają jedna po drugiej. Za którąś z nich ktoś nie zasypia.",
  "Ulica pustoszeje w dziesięć minut. Nikt nie chce być ostatni na dworze.",
];

const MAFIA_WAKES = [
  "Mafia otwiera oczy. Rozpoznajecie się bez słowa — tej nocy działacie razem.",
  "Cisza. Trzy piętra niżej ktoś otwiera drzwi bez skrzypnięcia. Wiecie, po co.",
  "Wasza kolej. Spójrzcie po sobie i zdecydujcie, kto rano się nie obudzi.",
  "Nikt nie patrzy, nikt nie słyszy. Macie kilka minut i jedno nazwisko do uzgodnienia.",
];

const SAVED = [
  "W nocy ktoś dobija się do drzwi. Ktoś inny akurat nie śpi i zdąża — drzwi wytrzymują, kroki oddalają się po schodach.\n\nRano wszyscy siadają do stołu. Wszyscy, co do jednego.\n\nKtoś przy tym stole jest wściekły i musi to ukryć.",
  "Jest krzyk. Jest szarpanina. O czwartej nad ranem ktoś wzywa pogotowie.\n\nI jest — nad podziw — komplet przy śniadaniu. Tej nocy ktoś pracował szybciej od mafii.",
  "Mafia wychodzi na łowy i wraca z pustymi rękami. Ktoś ją uprzedził, choć sam nie wie, jak blisko było.\n\nTej nocy nikt nie ginie. Następnej może nie być tak łatwo.",
  "Na klatce zostają rano ślady butów i wyłamana klamka. I nikt w środku nie ucierpiał.\n\nKtoś tu ma bardzo dobre wyczucie. Albo bardzo dużo szczęścia.",
];

const NO_KILL = [
  "Noc mija bez ofiar. Nikt nie ginie — i nikt nie śpi.\n\nTo gorsze niż trup. Trup przynajmniej coś mówi.",
  "Rano wszyscy są na miejscu. Policzcie się dwa razy, bo nikt w to nie wierzy.\n\nCzyli albo mafia odpuściła, albo coś planuje.",
  "Cisza przez całą noc. Żadnego krzyku, żadnych kroków, żadnego trupa.\n\nNajgorsze jest to, że nic z tego nie wynika.",
];

const NO_LYNCH = [
  "Kłótnia trwa do zmierzchu. Padają trzy nazwiska, dwa oskarżenia i jedno wyzwisko, którego nikt nie powtórzy.\n\nGłosy rozkładają się po równo. Dziś nikt nie wylatuje — a noc zapada tak samo szybko.",
  "Miasto nie umie się dogadać. Za dużo krzyku, za mało dowodów.\n\nWszyscy wracają do domów. Ktoś wraca zadowolony.",
  "Brakuje jednego głosu. Dosłownie jednego.\n\nJutro ktoś będzie tego żałował — pytanie tylko kto.",
];

const MAFIA_WINS = [
  "Zostało was tylu, co ich. Od tej chwili każde głosowanie kończy się tak, jak oni zechcą.\n\nMiasto formalnie istnieje. Praktycznie należy do kogoś innego.",
  "Nie ma już kogo przegłosować. Mafia siedzi przy stole, nalewa sobie i nikomu się nie tłumaczy.\n\nMiasto przegrało tydzień temu. Dopiero dziś to zauważyło.",
  "Ostatni uczciwi ludzie w tym mieście patrzą po sobie i już wiedzą.\n\nJutro rano autobus odjedzie pusty. Jak co dzień.",
];

const TOWN_WINS = [
  "Ostatni z nich wychodzi w kajdankach, a miasto stoi w milczeniu i patrzy.\n\nWieczorem ktoś wreszcie zostawia otwarte okno.",
  "Wyłapaliście wszystkich. Co do jednego.\n\nJutro znowu pojedzie autobus, a w barze będzie o czym gadać przez najbliższe dziesięć lat.",
  "Kiedy pada ostatnie nazwisko, nikt nie krzyczy. Ludzie po prostu oddychają.\n\nRynek wraca do bycia rynkiem, a ławka — ławką.",
];

const pick = (list: string[], seed: number) => list[Math.abs(seed) % list.length];

/**
 * Scrambles the seed so each slot gets an independent index. Deriving them
 * by dividing the seed instead (seed/7, seed/149) made the slots move at
 * wildly different rates -- neighbouring seeds produced scenes differing
 * only in the opening line, which is exactly the repetitiveness this is
 * meant to avoid.
 */
function mix(seed: number, salt: number): number {
  let x = (Math.abs(seed) + salt * 0x9e3779b1) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

function compose(mood: string[], find: string[], detail: string[], seed: number, victim: string) {
  const text = [
    pick(mood, mix(seed, 1)),
    pick(find, mix(seed, 2)),
    pick(detail, mix(seed, 3)),
  ].join("\n\n");
  return text.replaceAll("{ofiara}", victim);
}

export const deathStory = (victim: string, seed: number) =>
  compose(DEATH_MOOD, DEATH_FIND, DEATH_DETAIL, seed, victim);

export const lynchStory = (victim: string, seed: number) =>
  compose(LYNCH_MOOD, LYNCH_FIND, LYNCH_DETAIL, seed, victim);

export const openingScene = (seed: number) => pick(OPENING, seed);
export const nightfallScene = (seed: number) => pick(NIGHTFALL, seed);
export const mafiaWakesScene = (seed: number) => pick(MAFIA_WAKES, seed);
export const savedStory = (seed: number) => pick(SAVED, seed);
export const noKillStory = (seed: number) => pick(NO_KILL, seed);
export const noLynchStory = (seed: number) => pick(NO_LYNCH, seed);
export const mafiaWinsScene = (seed: number) => pick(MAFIA_WINS, seed);
export const townWinsScene = (seed: number) => pick(TOWN_WINS, seed);

/** How many distinct scenes the beats can produce -- used by the tests. */
export const VARIETY = {
  death: DEATH_MOOD.length * DEATH_FIND.length * DEATH_DETAIL.length,
  lynch: LYNCH_MOOD.length * LYNCH_FIND.length * LYNCH_DETAIL.length,
};
