/**
 * The bit a human narrator would improvise. Templates rather than generated
 * text: they cost nothing, arrive instantly, and can't wander off into
 * something that contradicts what actually happened in the game.
 *
 * `{ofiara}` is the victim's nickname.
 */
const DEATHS = [
  "{ofiara} miał(a) wracać na jednego. Znaleziono tylko przewrócony kubek i otwarte drzwi.",
  "Sąsiedzi słyszeli w nocy śmiech, potem ciszę. Rano {ofiara} już nie otworzył(a).",
  "{ofiara} pisał(a) właśnie wiadomość. Urwała się w połowie słowa.",
  "Ktoś zostawił {ofiara} kwiaty pod drzwiami. Za wcześnie, żeby to był przypadek.",
  "Rano na przystanku stała nietknięta kawa {ofiara}. Właściciel(ka) się nie zjawił(a).",
  "{ofiara} znaleziono w kotłowni. Nikt nie umie wyjaśnić, co tam robił(a).",
  "Ostatni raz widziano {ofiara} przy moście. Została tylko kurtka na barierce.",
  "{ofiara} miał(a) rano pociąg. Walizka spakowana, bilet na stole, nikogo w mieszkaniu.",
  "W nocy zgasło światło na całej ulicy. Kiedy wróciło, {ofiara} już nie żył(a).",
  "{ofiara} odebrał(a) telefon o drugiej w nocy. To był ostatni raz.",
  "Pies {ofiara} wył do rana. Rano wiedzieliśmy dlaczego.",
  "{ofiara} zostawił(a) niedokończoną partię szachów. Czarne miały mata w dwóch ruchach.",
  "Ktoś przestawił wszystkie zegary w domu {ofiara}. Nikt nie wie po co.",
  "Rano drzwi {ofiara} były otwarte na oścież. Klucze wisiały od środka.",
  "{ofiara} obiecał(a), że powie coś ważnego rano. Nie zdążył(a).",
  "Na lustrze w łazience {ofiara} ktoś napisał palcem jedno słowo. Zdążyło wyparować.",
];

const SAVED = [
  "W nocy ktoś się dobijał do drzwi. Ktoś inny akurat nie spał — i tej nocy nikt nie zginął.",
  "Był krzyk, było szarpanie, było wezwane pogotowie. Nad ranem wszyscy są cali.",
  "Ktoś tej nocy miał wielkie szczęście. Albo bardzo czujnego anioła stróża.",
  "Mafia wyszła na łowy i wróciła z pustymi rękami. Tej nocy nikt nie zginął.",
  "Ktoś zdążył zamknąć drzwi w ostatniej chwili. Rano wszyscy siadają do stołu.",
];

const NO_KILL = [
  "Tej nocy w mieście było podejrzanie spokojnie.",
  "Nikt nie zginął. Nikt też nie spał dobrze.",
  "Noc minęła bez ofiar. To nie znaczy, że nic się nie działo.",
];

const LYNCH = [
  "Miasto wywlekło {ofiara} na rynek. Nie było litości.",
  "Głosowanie było krótkie. {ofiara} nie zdążył(a) się nawet wytłumaczyć.",
  "{ofiara} krzyczał(a) do końca, że to pomyłka.",
  "Tłum zdecydował. {ofiara} znika z miasta.",
  "Ktoś rzucił pierwszy kamień, reszta poszła za nim. {ofiara} przegrał(a) tę rozmowę.",
];

const NO_LYNCH = [
  "Miasto się pokłóciło i nikogo nie wskazało. Noc zapada bez wyroku.",
  "Głosy rozłożyły się po równo. Nikt dziś nie zawiśnie.",
  "Za dużo krzyku, za mało zgody. Nikogo nie osądzono.",
];

const pick = (list: string[], seed: number) => list[seed % list.length];

/**
 * `seed` keeps the text stable for a given night: the screen re-renders
 * constantly and a fresh random line each time would be unreadable.
 */
export function deathStory(victim: string, seed: number): string {
  return pick(DEATHS, seed).replaceAll("{ofiara}", victim);
}

export function savedStory(seed: number): string {
  return pick(SAVED, seed);
}

export function noKillStory(seed: number): string {
  return pick(NO_KILL, seed);
}

export function lynchStory(victim: string, seed: number): string {
  return pick(LYNCH, seed).replaceAll("{ofiara}", victim);
}

export function noLynchStory(seed: number): string {
  return pick(NO_LYNCH, seed);
}
