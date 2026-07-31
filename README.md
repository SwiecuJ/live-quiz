# Quizownia

Dwie imprezowe gry na telefony, wspólny mechanizm: prowadzący pokazuje kod QR, reszta wbija swoimi telefonami, wszystko synchronizuje się na żywo.

- **Quizownia** (`/`) — live quiz na wzór Kahoota. Host podaje temat, pytania generują się z promptu, gracze odpowiadają ABCD na czas.
- **Ryzyk Fizyk** (`/rf`) — polska wersja *Wits & Wagers*. Pytania z odpowiedzią liczbową: każdy wpisuje swój typ, typy trafiają na matę posortowane rosnąco, a potem wszyscy obstawiają, który jest najbliżej — **nie przekraczając** prawidłowej wartości. Pytania są stałą pulą w kodzie ([`lib/ryzykfizyk/questions.ts`](lib/ryzykfizyk/questions.ts)), nie generują się.
- **Mafia** (`/mafia`) — klasyczna Mafia, w której telefon zastępuje narratora. Każdy dostaje rolę na własny ekran, nocą **wszyscy** coś klikają (żeby po zachowaniu nie dało się poznać ról), a rano aplikacja opowiada, co się stało. Role, nocne wybory i sekret gracza nie mają publicznych polityk RLS — chodzą wyłącznie przez trasy serwerowe.

Stack: Next.js (App Router, TypeScript) + Tailwind CSS + Supabase (Postgres + Realtime) + Anthropic API (`claude-haiku-4-5`) do generowania pytań quizu, wdrażane na Vercel.

## 1. Zmienne środowiskowe

Skopiuj `.env.local.example` do `.env.local` i uzupełnij:

| Zmienna | Skąd wziąć |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Twój projekt → **Project Settings → API** → `Project URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → **Project Settings → API** → `anon public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → **Project Settings → API** → `service_role` key (⚠️ tajny, tylko po stronie serwera, nigdy nie commituj) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → **API Keys** → Create Key |

```bash
cp .env.local.example .env.local
```

## 2. Migracja SQL w Supabase

1. Utwórz nowy projekt na [supabase.com](https://supabase.com).
2. Otwórz **SQL Editor** w panelu Supabase.
3. Wklej całą zawartość pliku [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) i uruchom (**Run**).

   Alternatywnie, jeśli używasz Supabase CLI lokalnie:

   ```bash
   supabase link --project-ref <twoj-project-ref>
   supabase db push
   ```

4. Wklej i uruchom w ten sam sposób [`supabase/migrations/0002_device_identity.sql`](supabase/migrations/0002_device_identity.sql) — dodaje trwałą tożsamość urządzenia i widok `global_scores` pod ranking wszech czasów.

   Migracje są bezpieczne do ponownego uruchomienia. Bez `0002` aplikacja nadal w pełni działa: gracze dołączają normalnie, tylko sekcja „Ranking wszech czasów" na stronie głównej się nie pokazuje.

5. Wklej i uruchom [`supabase/migrations/0003_ryzyk_fizyk.sql`](supabase/migrations/0003_ryzyk_fizyk.sql) — tabele drugiej gry (`rf_*`). Bez niej Quizownia działa normalnie, a Ryzyk Fizyk mówi wprost, że brakuje migracji.

6. Wklej i uruchom [`supabase/migrations/0004_mafia.sql`](supabase/migrations/0004_mafia.sql) — tabele Mafii (`mf_*`). Bez niej pozostałe gry działają normalnie, a Mafia mówi wprost, że brakuje migracji.

7. Sprawdź w **Database → Replication**, że tabele `rooms`, `players`, `answers`, `rf_*` oraz `mf_rooms` / `mf_players` / `mf_votes` są dodane do publikacji `supabase_realtime` (migracje robią to automatycznie). `mf_secrets` i `mf_actions` celowo **nie** są publikowane — to one trzymają role i nocne wybory.

## 3. Uruchomienie lokalne

```bash
npm install
npm run dev
```

Aplikacja wystartuje na [http://localhost:3000](http://localhost:3000).

- Otwórz `/` na komputerze/rzutniku, aby stworzyć quiz (rola hosta).
- Zeskanuj wygenerowany kod QR telefonem albo wejdź na `/play/<KOD>`, aby dołączyć jako gracz.

## 4. Wypchnięcie na GitHub i wdrożenie na Vercel

1. Zainicjuj repozytorium i wypchnij kod:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<twoj-user>/<twoje-repo>.git
   git push -u origin main
   ```

2. Wejdź na [vercel.com/new](https://vercel.com/new) i zaimportuj repozytorium z GitHuba.
3. W ustawieniach projektu (**Settings → Environment Variables**) dodaj te same zmienne co w `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
4. Kliknij **Deploy**.
5. Po wdrożeniu host tworzy quiz na `https://<twoja-domena>.vercel.app`, a wygenerowany kod QR będzie prowadził graczy na `https://<twoja-domena>.vercel.app/play/<KOD>`.

## Jak to działa

- `app/api/generate-quiz/route.ts` — jedyne miejsce, gdzie wywoływane jest Anthropic API (po stronie serwera, kluczem `ANTHROPIC_API_KEY`, który nigdy nie trafia do przeglądarki). Generuje pytania, zapisuje `quiz` + `questions` i tworzy `room` przy pomocy klucza `SUPABASE_SERVICE_ROLE_KEY` (omija RLS).
- `app/api/rooms/[roomCode]/{start,next,end-round}/route.ts` — sterowanie przebiegiem gry (start, koniec rundy + naliczanie punktów, przejście dalej) po stronie serwera, również kluczem service role.
- `app/api/rooms/[roomCode]/question/route.ts` — host i gracz pobierają aktualne pytanie przez tę trasę (tabela `questions` nie ma publicznej polityki RLS); poprawna odpowiedź (`correct_index`) jest dołączana dopiero po zakończeniu rundy (`?reveal=1`), żeby nie wyciekała do gracza w trakcie odliczania.
- Dołączanie do pokoju (`players`) i wysyłanie odpowiedzi (`answers`) idzie bezpośrednio z przeglądarki kluczem `anon`, zgodnie z politykami RLS z migracji.
- Synchronizacja w czasie rzeczywistym (lobby, start gry, kolejne pytania, wyniki) działa przez Supabase Realtime (Postgres Changes) na tabelach `rooms`, `players`, `answers` — stan gry trzymany jest w wierszu `rooms`, więc działa też po odświeżeniu strony.
