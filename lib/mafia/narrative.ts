/**
 * The part a human narrator would improvise, written out so nobody has to.
 * These are meant to be read aloud, so they're whole little scenes rather
 * than captions -- a table needs something to react to, not a status line.
 *
 * Templates rather than generated text: they cost nothing, appear instantly,
 * and can't wander off into a version of events that contradicts what
 * actually happened in the game.
 *
 * `{ofiara}` is the victim's nickname.
 */

const OPENING = [
  "Miasteczko wygląda jak z pocztówki. Rynek, fontanna, dwa bary i jedna apteka. Wszyscy się znają, wszyscy się pozdrawiają.\n\nOd trzech tygodni ktoś znika. Policja rozkłada ręce. Ludzie przestali zostawiać otwarte okna.\n\nDziś wieczorem gaśnie ostatnie światło. Ktoś przy tym stole wie dokładnie, co się dzieje.",
  "Wszystko zaczęło się od plotki, że w mieście ktoś jest. Nie przyjechał — po prostu jest. Ktoś, kto zna wasze rozkłady dnia lepiej niż wy sami.\n\nNikt w to nie wierzył. Do wczoraj.\n\nDziś w nocy przekonacie się, że plotka miała twarz. Prawdopodobnie znajomą.",
  "Autobus do miasta jeździ dwa razy dziennie. Ostatni odjechał o osiemnastej i nikt nim nie odjechał.\n\nCo znaczy, że kto tu jest — zostaje. Łącznie z tym, kto zaczął to wszystko.\n\nDobranoc. Śpijcie dobrze, jeśli potraficie.",
  "Na zebraniu sołtys powiedział, żeby nie panikować. Godzinę później sam zamknął sklep na cztery spusty.\n\nDziś nikt nie będzie spał spokojnie. Jedni ze strachu, inni dlatego, że mają robotę do wykonania.",
];

const NIGHTFALL = [
  "Gasną latarnie. Miasto zamyka oczy — jedno po drugim, aż zostaje tylko szum lodówki i czyjeś kroki na klatce.",
  "Zegar na wieży wybija dwunastą. Ostatnie okno gaśnie. W ciemności ktoś właśnie otwiera oczy.",
  "Miasto idzie spać. Ktoś udaje, że też.",
  "Ostatni pies przestaje szczekać. Zapada cisza, w której słychać każdy krok na żwirze.",
];

const MAFIA_WAKES = [
  "Mafia otwiera oczy. Rozpoznajecie się bez słowa — to znaczy, że tej nocy działacie razem.",
  "Cisza. Trzy piętra niżej ktoś otwiera drzwi bez skrzypnięcia. Wiecie, po co.",
  "Wasza kolej. Spójrzcie po sobie i zdecydujcie, kto rano się nie obudzi.",
];

const DEATHS = [
  "Rano na klatce leżała gazeta, której nikt nie odebrał.\n\n{ofiara} miał(a) wracać na jednego. Zamiast tego został(a) przewrócony kubek, otwarte drzwi i kurtka na oparciu krzesła.\n\nNikt nic nie słyszał. Wszyscy mówią, że nic nie słyszeli.",
  "Sąsiadka z dołu mówi, że w nocy słyszała śmiech. Potem coś ciężkiego. Potem nic.\n\nRano {ofiara} nie otworzył(a) drzwi. Nie otworzy już nigdy.\n\nNa stole stygła herbata, nalana dla dwóch osób.",
  "{ofiara} pisał(a) właśnie wiadomość. Urwała się w połowie słowa — telefon leżał ekranem do góry, jeszcze ciepły.\n\nDo kogo pisał(a)? Nikt nie ma odwagi sprawdzić.",
  "Na przystanku stała nietknięta kawa. Wystygła, z odciskiem szminki na brzegu.\n\n{ofiara} nigdy nie spóźniał(a) się na autobus. Dziś autobus odjechał pusty.",
  "Znaleziono {ofiara} w kotłowni, do której klucz miały trzy osoby w tym mieście.\n\nJedna z nich zgłosiła znalezisko. Dwie pozostałe siedzą teraz przy tym stole.",
  "Ostatni raz widziano {ofiara} przy moście. Została kurtka, przewieszona przez barierkę, i papieros dopalony do filtra.\n\nKtoś stał tam z nim(nią) wystarczająco długo, żeby wypalić całego.",
  "W nocy zgasło światło na całej ulicy — awaria, powiedzieli z zakładu.\n\nKiedy wróciło, drzwi {ofiara} były otwarte na oścież, a klucze wisiały od środka.",
  "Pies {ofiara} wył od trzeciej do rana. Sąsiedzi przeklinali przez sen.\n\nO siódmej wszyscy już wiedzieli, dlaczego wył.",
  "{ofiara} zostawił(a) niedokończoną partię szachów. Czarne miały mata w dwóch ruchach.\n\nDrugie krzesło było jeszcze ciepłe.",
  "{ofiara} obiecał(a) wczoraj, że rano powie coś ważnego. Że wie coś, czego nie powinien(nna) wiedzieć.\n\nRano nie było już komu mówić.",
  "Na lustrze w łazience ktoś napisał palcem jedno słowo. Zanim przyszła policja, para wyparowała i słowo zniknęło.\n\n{ofiara} leżał(a) pod prysznicem, w ubraniu.",
  "Wszystkie zegary w mieszkaniu {ofiara} pokazywały inną godzinę. Ktoś je poprzestawiał, po kolei, spokojnie.\n\nTo nie był pośpiech. To był rytuał.",
];

const SAVED = [
  "W nocy ktoś dobijał się do drzwi. Ktoś inny akurat nie spał i zdążył — drzwi wytrzymały, kroki oddaliły się po schodach.\n\nRano wszyscy siadają do stołu. Wszyscy, co do jednego.\n\nKtoś przy tym stole jest wściekły i musi to ukryć.",
  "Był krzyk. Było szarpanie. Było wezwane pogotowie o czwartej nad ranem.\n\nI jest — nad podziw — komplet przy śniadaniu. Ktoś tej nocy pracował szybciej od mafii.",
  "Mafia wyszła na łowy i wróciła z pustymi rękami. Ktoś ich uprzedził, choć sam nie wie, jak blisko był(a).\n\nTej nocy nikt nie zginął. Następnej może nie być tak łatwo.",
];

const NO_KILL = [
  "Noc minęła bez ofiar. Nikt nie zginął — i nikt nie spał.\n\nTo gorsze niż trup. Trup przynajmniej coś mówi.",
  "Rano wszyscy są na miejscu. Policzcie się dwa razy, bo nikt w to nie wierzy.\n\nCzyli albo mafia odpuściła, albo coś planuje.",
];

const LYNCH = [
  "Miasto nie chciało już czekać. {ofiara} wywleczono na rynek, pod fontannę, przy której latem tańczono na dożynkach.\n\nKrzyczał(a) do samego końca, że to pomyłka.",
  "Głosowanie trwało krócej niż rozmowa o pogodzie. {ofiara} nie zdążył(a) nawet dokończyć zdania.\n\nKtoś rzucił pierwszy kamień. Reszta poszła za nim, jak zawsze.",
  "Sąsiedzi, z którymi {ofiara} pił(a) w zeszłym tygodniu, dziś odwrócili wzrok.\n\nWyrok wykonano przed południem. Nikt nie protestował głośno.",
  "{ofiara} powtarzał(a) w kółko to samo nazwisko. Nikt nie słuchał.\n\nMiasto podjęło decyzję i miasto ją wykonało.",
];

const NO_LYNCH = [
  "Kłótnia trwała do zmierzchu. Padły trzy nazwiska, dwa oskarżenia i jedno wyzwisko, którego nikt nie powtórzy.\n\nGłosy rozłożyły się po równo. Nikt dziś nie zawiśnie — a noc zapada tak samo szybko.",
  "Miasto nie umiało się dogadać. Za dużo krzyku, za mało dowodów.\n\nWszyscy wracają do domów. Ktoś wraca zadowolony.",
];

const MAFIA_WINS = [
  "Zostało was tylu, co ich. Od tej chwili każde głosowanie kończy się tak, jak oni zechcą.\n\nMiasto formalnie istnieje. Praktycznie należy do kogoś innego.",
  "Nie ma już kogo przegłosować. Mafia siedzi przy stole, nalewa sobie i nikomu się nie tłumaczy.\n\nMiasto przegrało tydzień temu. Dopiero dziś to zauważyło.",
];

const TOWN_WINS = [
  "Ostatni z nich wyszedł w kajdankach, a miasto stało w milczeniu i patrzyło.\n\nWieczorem ktoś wreszcie zostawił otwarte okno.",
  "Wyłapaliście wszystkich. Co do jednego.\n\nJutro znowu pojedzie autobus, a w barze będzie o czym gadać przez najbliższe dziesięć lat.",
];

const pick = (list: string[], seed: number) => list[seed % list.length];

/**
 * `seed` keeps the wording stable for a given beat: the screen re-renders
 * constantly and a fresh random scene each time would be unreadable.
 */
export const openingScene = (seed: number) => pick(OPENING, seed);
export const nightfallScene = (seed: number) => pick(NIGHTFALL, seed);
export const mafiaWakesScene = (seed: number) => pick(MAFIA_WAKES, seed);
export const savedStory = (seed: number) => pick(SAVED, seed);
export const noKillStory = (seed: number) => pick(NO_KILL, seed);
export const noLynchStory = (seed: number) => pick(NO_LYNCH, seed);
export const mafiaWinsScene = (seed: number) => pick(MAFIA_WINS, seed);
export const townWinsScene = (seed: number) => pick(TOWN_WINS, seed);

export const deathStory = (victim: string, seed: number) =>
  pick(DEATHS, seed).replaceAll("{ofiara}", victim);

export const lynchStory = (victim: string, seed: number) =>
  pick(LYNCH, seed).replaceAll("{ofiara}", victim);
