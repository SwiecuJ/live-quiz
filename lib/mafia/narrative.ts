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
 * Two constraints on writing these:
 *   - the victim's name only ever appears in the nominative ({ofiara}),
 *     because Polish declension of an arbitrary nickname can't be guessed;
 *   - the beats must never contradict each other, so the mood carries no
 *     location and the detail carries no place or finder -- only the
 *     discovery does.
 * Verbs use the (a) form so they read for anyone.
 */

// ── śmierć: nastrój poranka ─────────────────────────────────────────────
const DEATH_MOOD = [
  "Poranek wstał jasny i zimny, taki, w jakim wszystko widać za dobrze.",
  "Mgła leżała nisko nad miastem do jedenastej i nikomu się nie chciało jej rozpędzać.",
  "Miasto obudziło się później niż zwykle. Jakby zwlekało.",
  "Nad ranem spadł deszcz i zmył wszystko, co mógł zmyć.",
  "Był piękny poranek. To najgorsze, co można o nim powiedzieć.",
  "Piekarnia otworzyła się punktualnie. To była ostatnia normalna rzecz tego dnia.",
  "Słońce wstało nad dachami i miasto przez chwilę wyglądało jak z folderu turystycznego.",
  "Nikt nie spał dobrze. Rano wszyscy wyglądali, jakby mieli coś na sumieniu.",
  "Radio nadawało prognozę pogody, kiedy zaczęły dzwonić pierwsze telefony.",
  "Wiatr przewracał doniczki na parapetach od czwartej nad ranem.",
  "Kościelny bił na szóstą, tak jak co dzień. Tego dnia nikt się nie modlił o pogodę.",
  "Był zwyczajny wtorek. Do ósmej trzydzieści.",
  "Rosa jeszcze nie zeszła z trawy, kiedy zaczęło się zbiegowisko.",
  "Miasto pachniało chlebem i mokrym asfaltem. Potem już tylko strachem.",
  "Pierwszy autobus przejechał pusty. Kierowca mówił potem, że coś czuł.",
  "Ktoś wyprowadzał psa. Pies stanął i nie chciał iść dalej.",
  "Nad ranem przeszła burza. Prąd wrócił dopiero o siódmej.",
  "Na rynku rozstawiali stragany. Do południa wszystkie były zwinięte.",
  "Śnieg spadł w nocy i rano leżał nietknięty. Prawie wszędzie.",
  "Ktoś od rana próbował się dodzwonić i nikt nie odbierał.",
  "Poranek był tak cichy, że słychać było własne kroki na drugim końcu ulicy.",
  "Dzień zaczął się od tego, że proboszcz nie otworzył kościoła o czasie.",
  "Pierwsze, co usłyszało miasto, to syrena. Drugie — plotkę.",
  "Kawiarnia na rogu miała otwarte drzwi i pusty lokal. Nikt nie wszedł na kawę.",
];

// ── śmierć: znalezienie ciała (tu pada imię, zawsze w mianowniku) ───────
const DEATH_FIND = [
  "Sołtys wyszedł na spacer wzdłuż rzeki. Przy trzeciej ławce zwolnił, potem stanął. Na ławce, wyprostowany(a), z rękami złożonymi na kolanach, siedział(a) {ofiara}.",
  "Listonosz wcisnął awizo w skrzynkę i zajrzał przez uchylone drzwi. W przedpokoju, twarzą do podłogi, leżał(a) {ofiara}.",
  "Sąsiadka poszła oddać pożyczoną drabinę. Drzwi były otwarte, radio grało, a przy stole — już od kilku godzin — siedział(a) {ofiara}.",
  "Dzieciaki skracały sobie drogę przez park i przestały się śmiać w pół kroku. Pod topolą leżał(a) {ofiara}.",
  "Kelnerka otwierała bar i potknęła się o coś w progu. Tym czymś był(a) {ofiara}.",
  "Ekipa z wodociągów zeszła do studzienki po awarii. Wyszli po dziesięciu sekundach. Na dole był(a) {ofiara}.",
  "Ksiądz otworzył kościół przed poranną mszą. W pierwszej ławce, z głową opartą o oparcie, klęczał(a) {ofiara}.",
  "Właściciel warsztatu podniósł roletę i cofnął się o krok. Na kanale, pod podniesionym samochodem, leżał(a) {ofiara}.",
  "Bibliotekarka weszła do czytelni z kubkiem herbaty. Kubek nie doleciał do biurka. Przy oknie siedział(a) {ofiara}.",
  "Rybak wypłynął o świcie i zaczepił siecią o coś przy pomoście. To był(a) {ofiara}.",
  "Sprzątaczka otworzyła szkolną salę gimnastyczną. Na środku parkietu, pod koszem, leżał(a) {ofiara}.",
  "Kolejarz obchodził tory przed pierwszym pociągiem. Na nasypie, kilkanaście metrów od przejazdu, leżał(a) {ofiara}.",
  "Piekarz wyniósł worki na tyły. Za kontenerem, oparty(a) o mur, siedział(a) {ofiara}.",
  "Ochroniarz przewijał nagrania z nocy. Na taśmie o 2:14 ktoś wychodzi z kadru. Rano znaleziono, że był(a) to {ofiara}.",
  "Kobieta z pierwszego piętra wystawiła śmieci i krzyknęła tak, że obudziła całą klatkę. W wiacie śmietnikowej leżał(a) {ofiara}.",
  "Traktorzysta zawrócił na skraju pola i zgasił silnik. W bruździe, przysypany(a) słomą, leżał(a) {ofiara}.",
  "Kioskarz układał gazety, kiedy zauważył, że ktoś od godziny stoi po drugiej stronie ulicy i się nie rusza. Stał(a) tam {ofiara}.",
  "Weterynarz przyjechał do chorego konia i zastał otwarte wrota stajni. W boksie, na słomie, leżał(a) {ofiara}.",
  "Turysta robił zdjęcia mostu i dopiero w domu zobaczył, co uchwycił w kadrze. Pod przęsłem był(a) {ofiara}.",
  "Nauczycielka WF-u otworzyła szatnię, żeby wyłożyć piłki. Na ławce między wieszakami leżał(a) {ofiara}.",
  "Portier w hotelu poszedł sprawdzić, czemu w 204 nie odbierają. Za drzwiami, w ubraniu, na zasłanym łóżku, leżał(a) {ofiara}.",
  "Grabarz przyszedł wcześniej niż zwykle i zastał świeżo rozkopaną ziemię tam, gdzie nikogo nie chowano. Pod nią był(a) {ofiara}.",
  "Barmanka wynosiła butelki i zobaczyła buty wystające zza kontenera. Należały do {ofiara}.",
  "Listonoszka szła skrótem przez działki. W jednej z altanek, przy nakrytym do dwóch osób stole, siedział(a) {ofiara}.",
  "Sprzedawczyni z Żabki wyszła na papierosa o szóstej rano. Pod ścianą, w kucki, oparty(a) o mur, siedział(a) {ofiara}.",
  "Ratownik sprawdzał kładkę nad zalewem i zauważył, że coś zaczepiło się o filar. To był(a) {ofiara}.",
  "Konduktor obchodził pusty skład na bocznicy. W ostatnim przedziale, przy zaciągniętej zasłonce, siedział(a) {ofiara}.",
  "Ogrodnik przyszedł podlać rabaty przed ratuszem. Między krzewami, twarzą do nieba, leżał(a) {ofiara}.",
  "Pielęgniarka szła na dyżur i skręciła w bramę, bo usłyszała kapanie. W podwórku, pod rynną, leżał(a) {ofiara}.",
  "Chłopak z pizzerii przyjechał pod wskazany adres z zamówieniem sprzed trzech godzin. Drzwi otworzyły się same. Za nimi był(a) {ofiara}.",
  "Straż pożarna wyważyła drzwi po zgłoszeniu o dymie. Dymu nie było. W kuchni, przy włączonym palniku, siedział(a) {ofiara}.",
  "Sprzątający po weselu weszli do sali o siódmej. Pod sceną, między krzesłami, leżał(a) {ofiara}.",
  "Leśniczy obchodził ambonę na skraju lasu. Na drabince, w pozycji, w której nikt nie zasypia, wisiał(a) {ofiara}.",
  "Panie z koła gospodyń otworzyły świetlicę na próbę chóru. Przy pianinie, z otwartym zeszytem nut, siedział(a) {ofiara}.",
  "Mechanik zjechał na parking pod blokiem i zauważył samochód z włączonymi światłami. Za kierownicą siedział(a) {ofiara}.",
  "Dozorca poszedł zakręcić wodę w pralni. Na posadzce, między pralkami, leżał(a) {ofiara}.",
];

// ── śmierć: szczegół, od którego robi się zimno ─────────────────────────
const DEATH_DETAIL = [
  "Nic nie zginęło. Portfel leżał obok, otwarty, jakby ktoś chciał, żeby było widać, że go nie ruszył.",
  "Ubranie było starannie zapięte pod samą szyję. Za starannie. Jakby ktoś poprawiał je już potem.",
  "W dłoni został skrawek papieru. Zanim przyjechała policja, ktoś zdążył go zabrać.",
  "Zegarek stanął o 2:47. Wszystkie inne zegary w mieście chodziły normalnie.",
  "Obok stały dwa kubki. Z jednego ktoś pił do końca.",
  "Buty były czyste. Zupełnie czyste, mimo że wszędzie dookoła było błoto.",
  "Telefon leżał ekranem do góry, z rozpoczętą wiadomością. Adresat: nikt. Treść: jedno imię, skasowane.",
  "Ktoś zamknął mu(jej) oczy. Ludzie, którzy umierają sami, nie mają zamkniętych oczu.",
  "Na ziemi obok był drugi ślad buta. Numer czterdzieści trzy. W tym mieście mało kto nosi taki numer.",
  "Pies nie chciał podejść bliżej. Warczał w stronę, z której nikt nie nadchodził.",
  "Wszystko wyglądało na wypadek. Zbyt wyraźnie na wypadek.",
  "Ktoś ustawił obok równiutko trzy kamienie. Jeden na drugim.",
  "Nie było śladów szarpaniny. To znaczy, że {ofiara} znał(a) tę osobę.",
  "Kurtka była przewieszona przez oparcie, choć noc była zimna. Ktoś ją tam odłożył.",
  "W kieszeni znaleziono klucz, który nie pasował do żadnych drzwi w tym mieszkaniu.",
  "Sąsiedzi zgodnie twierdzą, że nic nie słyszeli. Wszyscy. Co do jednego. To już samo w sobie coś mówi.",
  "Papieros dopalił się do filtra, przyciśnięty do ziemi obcasem. Ktoś stał tam i czekał.",
  "Drzwi były zamknięte od środka. Klucz wisiał na haczyku.",
  "Na stole leżała lista zakupów. Na odwrocie ktoś napisał trzy litery i przekreślił.",
  "Ślady prowadziły w stronę rynku i urywały się w połowie drogi, jakby ktoś wsiadł do samochodu.",
  "Radio grało cały czas. Ta sama stacja, którą włącza pół miasta.",
  "Nikt nie zauważył niczego dziwnego. A przecież ktoś przy tym stole wie dokładnie, jak było.",
  "Policja zapisała: przyczyny ustala się. Wszyscy wiedzą, że nic nie ustali.",
  "Na palcach nie było obrączki, którą {ofiara} nosił(a) od lat.",
  "Latarnia nad tym miejscem nie świeciła. Rano technik stwierdził, że ktoś wykręcił żarówkę.",
  "Ślady opon urywały się w poprzek chodnika. Ktoś podjechał tu i zawrócił.",
  "Wszystkie okna dookoła były zasłonięte. O tej porze roku nikt nie zasłania okien.",
  "Ktoś zabrał tylko jedną rzecz: klucze. Sto złotych zostało w kieszeni.",
  "Kamera z bloku obok akurat tej nocy była odwrócona w stronę ściany.",
  "Na rękawie został ślad mąki. W tym mieście z mąką pracują trzy osoby.",
  "Ktoś podłożył pod głowę zwiniętą kurtkę. Zabójcy tego nie robią. Znajomi tak.",
  "Kwiaty pod drzwiami pojawiły się jeszcze przed policją.",
];

// ── lincz ───────────────────────────────────────────────────────────────
const LYNCH_MOOD = [
  "Kłótnia zaczęła się przy fontannie i skończyła pod ratuszem.",
  "Najpierw padały argumenty. Potem już tylko nazwiska.",
  "Nikt nie pamięta, kto pierwszy powiedział to na głos.",
  "Głosowanie trwało krócej niż wybór piwa w sklepie.",
  "Ludzie stali w półkolu i unikali swojego wzroku.",
  "Ktoś przyniósł krzesło, żeby lepiej widzieć. Nikt na nim nie usiadł.",
  "Rozmowa trwała dwie godziny i nie przekonała nikogo, kto już miał zdanie.",
  "Sołtys próbował to zatrzymać. Przestał próbować po dziesięciu minutach.",
  "Tłum jest szybszy od sumienia. Zawsze był.",
  "Padły trzy nazwiska. Zostało jedno.",
];

const LYNCH_FIND = [
  "Wskazano {ofiara}. Bez apelacji, bez namysłu, bez drugiego głosowania.",
  "{ofiara} próbował(a) się tłumaczyć. Zdanie urwało się w połowie, bo nikt już nie słuchał.",
  "{ofiara} powtarzał(a) w kółko jedno nazwisko. To nie było jego(jej) własne.",
  "{ofiara} nie powiedział(a) nic. To akurat wszystkim wystarczyło za przyznanie.",
  "{ofiara} śmiał(a) się jeszcze przy pierwszych głosach. Przy ostatnich już nie.",
  "{ofiara} spojrzał(a) po twarzach i zrozumiał(a), że to już postanowione.",
  "{ofiara} wyciągnął(-ęła) rękę do kogoś ze znajomych. Nikt jej nie uścisnął.",
  "Wyprowadzono {ofiara} za rynek. Cała reszta poszła za nimi w milczeniu.",
  "{ofiara} prosił(a), żeby dać mu(jej) jeszcze jedną noc. Miasto nie chciało czekać.",
  "{ofiara} do końca powtarzał(a), że to pomyłka. Może nawet mówił(a) prawdę.",
];

const LYNCH_DETAIL = [
  "Wieczorem nikt nie miał ochoty na kolację.",
  "Przez resztę dnia nikt nie wypowiedział tego imienia na głos.",
  "Kilka osób od razu wróciło do domów. Reszta została na rynku i milczała.",
  "Ktoś zapalił świeczkę pod fontanną. Ktoś inny ją zdmuchnął.",
  "Sąsiedzi, którzy pili razem w zeszłym tygodniu, dziś patrzyli w bruk.",
  "Zapadła cisza, w której było słychać, jak ktoś oddycha za szybko.",
  "Dopiero teraz ludzie zaczęli liczyć, ilu ich jeszcze zostało.",
  "Nikt nie miał odwagi zapytać, co jeśli się pomylili.",
];

// ── pozostałe beaty ──────────────────────────────────────────────────────
const OPENING = [
  "Miasteczko wygląda jak z pocztówki. Rynek, fontanna, dwa bary i jedna apteka. Wszyscy się znają, wszyscy się pozdrawiają.\n\nOd trzech tygodni ktoś znika. Policja rozkłada ręce. Ludzie przestali zostawiać otwarte okna.\n\nDziś wieczorem gaśnie ostatnie światło. Ktoś przy tym stole wie dokładnie, co się dzieje.",
  "Wszystko zaczęło się od plotki, że w mieście ktoś jest. Nie przyjechał — po prostu jest. Ktoś, kto zna wasze rozkłady dnia lepiej niż wy sami.\n\nNikt w to nie wierzył. Do wczoraj.\n\nDziś w nocy przekonacie się, że plotka miała twarz. Prawdopodobnie znajomą.",
  "Autobus do miasta jeździ dwa razy dziennie. Ostatni odjechał o osiemnastej i nikt nim nie odjechał.\n\nCo znaczy, że kto tu jest — zostaje. Łącznie z tym, kto zaczął to wszystko.\n\nDobranoc. Śpijcie dobrze, jeśli potraficie.",
  "Na zebraniu sołtys powiedział, żeby nie panikować. Godzinę później sam zamknął sklep na cztery spusty.\n\nDziś nikt nie będzie spał spokojnie. Jedni ze strachu, inni dlatego, że mają robotę do wykonania.",
  "Znacie się od podstawówki. Chodziliście na te same wesela, pożyczaliście sobie kosiarkę, kłóciliście się o miedzę.\n\nDlatego to takie trudne. Bo ten, kto to robi, siedzi teraz obok was i pyta, czy podać sól.",
];

const NIGHTFALL = [
  "Gasną latarnie. Miasto zamyka oczy — jedno po drugim, aż zostaje tylko szum lodówki i czyjeś kroki na klatce.",
  "Zegar na wieży wybija dwunastą. Ostatnie okno gaśnie. W ciemności ktoś właśnie otwiera oczy.",
  "Miasto idzie spać. Ktoś udaje, że też.",
  "Ostatni pies przestaje szczekać. Zapada cisza, w której słychać każdy krok na żwirze.",
  "Rolety opadają jedna po drugiej. Za którąś z nich ktoś nie zasypia.",
  "Ulica pustoszeje w dziesięć minut. Nikt nie chce być ostatni na dworze.",
];

const MAFIA_WAKES = [
  "Mafia otwiera oczy. Rozpoznajecie się bez słowa — to znaczy, że tej nocy działacie razem.",
  "Cisza. Trzy piętra niżej ktoś otwiera drzwi bez skrzypnięcia. Wiecie, po co.",
  "Wasza kolej. Spójrzcie po sobie i zdecydujcie, kto rano się nie obudzi.",
  "Nikt nie patrzy. Nikt nie słyszy. Macie kilka minut i jedno nazwisko do uzgodnienia.",
];

const SAVED = [
  "W nocy ktoś dobijał się do drzwi. Ktoś inny akurat nie spał i zdążył — drzwi wytrzymały, kroki oddaliły się po schodach.\n\nRano wszyscy siadają do stołu. Wszyscy, co do jednego.\n\nKtoś przy tym stole jest wściekły i musi to ukryć.",
  "Był krzyk. Było szarpanie. Było wezwane pogotowie o czwartej nad ranem.\n\nI jest — nad podziw — komplet przy śniadaniu. Ktoś tej nocy pracował szybciej od mafii.",
  "Mafia wyszła na łowy i wróciła z pustymi rękami. Ktoś ich uprzedził, choć sam nie wie, jak blisko był(a).\n\nTej nocy nikt nie zginął. Następnej może nie być tak łatwo.",
  "Na klatce znaleziono rano ślady butów i wyłamaną klamkę. I nikogo w środku, kto by ucierpiał.\n\nKtoś tu ma bardzo dobre wyczucie. Albo bardzo dużo szczęścia.",
];

const NO_KILL = [
  "Noc minęła bez ofiar. Nikt nie zginął — i nikt nie spał.\n\nTo gorsze niż trup. Trup przynajmniej coś mówi.",
  "Rano wszyscy są na miejscu. Policzcie się dwa razy, bo nikt w to nie wierzy.\n\nCzyli albo mafia odpuściła, albo coś planuje.",
  "Cisza przez całą noc. Żadnego krzyku, żadnych kroków, żadnego trupa.\n\nNajgorsze jest to, że nic z tego nie wynika.",
];

const NO_LYNCH = [
  "Kłótnia trwała do zmierzchu. Padły trzy nazwiska, dwa oskarżenia i jedno wyzwisko, którego nikt nie powtórzy.\n\nGłosy rozłożyły się po równo. Nikt dziś nie zawiśnie — a noc zapada tak samo szybko.",
  "Miasto nie umiało się dogadać. Za dużo krzyku, za mało dowodów.\n\nWszyscy wracają do domów. Ktoś wraca zadowolony.",
  "Zabrakło jednego głosu. Dosłownie jednego.\n\nJutro ktoś będzie tego żałował — pytanie tylko kto.",
];

const MAFIA_WINS = [
  "Zostało was tylu, co ich. Od tej chwili każde głosowanie kończy się tak, jak oni zechcą.\n\nMiasto formalnie istnieje. Praktycznie należy do kogoś innego.",
  "Nie ma już kogo przegłosować. Mafia siedzi przy stole, nalewa sobie i nikomu się nie tłumaczy.\n\nMiasto przegrało tydzień temu. Dopiero dziś to zauważyło.",
  "Ostatni uczciwi ludzie w tym mieście patrzą po sobie i już wiedzą.\n\nJutro rano autobus odjedzie pusty. Jak co dzień.",
];

const TOWN_WINS = [
  "Ostatni z nich wyszedł w kajdankach, a miasto stało w milczeniu i patrzyło.\n\nWieczorem ktoś wreszcie zostawił otwarte okno.",
  "Wyłapaliście wszystkich. Co do jednego.\n\nJutro znowu pojedzie autobus, a w barze będzie o czym gadać przez najbliższe dziesięć lat.",
  "Kiedy padło ostatnie nazwisko, nikt nie krzyczał. Ludzie po prostu odetchnęli.\n\nRynek wrócił do bycia rynkiem, a ławka — ławką.",
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
