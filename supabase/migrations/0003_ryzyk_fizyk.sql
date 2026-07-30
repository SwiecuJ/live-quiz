-- Ryzyk Fizyk: numeric-answer questions, then betting on whose guess landed
-- closest without going over.
--
-- Separate tables from the quiz on purpose. The two games share nothing but
-- the join-by-QR idea, and bolting a second, mostly-empty shape onto the
-- quiz tables would make both harder to reason about.
--
-- Questions live in code (lib/ryzykfizyk/questions.ts), not here: they are a
-- fixed pool of real, checkable numbers rather than anything generated, so
-- there is nothing per-room to store beyond which ones were drawn.

create table if not exists rf_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'lobby'
    check (status in ('lobby', 'guessing', 'betting', 'reveal', 'finished')),
  current_round int not null default 0,
  -- Ids drawn from the question pool, in play order.
  question_ids jsonb not null,
  -- Sorted guesses plus their odds, frozen when betting opens so the board
  -- can't shift under someone mid-bet.
  slots jsonb,
  phase_started_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists rf_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rf_rooms(id) on delete cascade,
  nickname text not null,
  device_id text,
  balance int not null default 2000,
  created_at timestamptz not null default now()
);

create table if not exists rf_guesses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rf_rooms(id) on delete cascade,
  player_id uuid not null references rf_players(id) on delete cascade,
  round_index int not null,
  value bigint not null,
  created_at timestamptz not null default now(),
  unique (player_id, round_index)
);

create table if not exists rf_bets (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rf_rooms(id) on delete cascade,
  player_id uuid not null references rf_players(id) on delete cascade,
  round_index int not null,
  slot_key text not null,
  amount int not null check (amount > 0),
  created_at timestamptz not null default now(),
  -- One bet per slot; two slots max is enforced in the app, where the
  -- player's balance is known.
  unique (player_id, round_index, slot_key)
);

create index if not exists idx_rf_players_room on rf_players(room_id);
create index if not exists idx_rf_guesses_room_round on rf_guesses(room_id, round_index);
create index if not exists idx_rf_bets_room_round on rf_bets(room_id, round_index);
create index if not exists idx_rf_players_device on rf_players(device_id);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table rf_rooms enable row level security;
alter table rf_players enable row level security;
alter table rf_guesses enable row level security;
alter table rf_bets enable row level security;

-- Same shape as the quiz: everything is publicly readable because every
-- screen needs to see the shared board, and the writes players make for
-- themselves are public inserts. Room state transitions stay server-side
-- with the service role, so there is no public insert/update on rf_rooms.
-- Dropped first so the whole file stays safe to run twice; Postgres has no
-- "create policy if not exists".
drop policy if exists "rf rooms are publicly readable" on rf_rooms;
create policy "rf rooms are publicly readable" on rf_rooms for select using (true);

drop policy if exists "rf players are publicly readable" on rf_players;
create policy "rf players are publicly readable" on rf_players for select using (true);
drop policy if exists "anyone can join a ryzyk fizyk room" on rf_players;
create policy "anyone can join a ryzyk fizyk room" on rf_players for insert with check (true);

drop policy if exists "rf guesses are publicly readable" on rf_guesses;
create policy "rf guesses are publicly readable" on rf_guesses for select using (true);
drop policy if exists "players can submit one guess per round" on rf_guesses;
create policy "players can submit one guess per round" on rf_guesses for insert with check (true);

drop policy if exists "rf bets are publicly readable" on rf_bets;
create policy "rf bets are publicly readable" on rf_bets for select using (true);
drop policy if exists "players can place their bets" on rf_bets;
create policy "players can place their bets" on rf_bets for insert with check (true);

-- ============================================================
-- Realtime
-- ============================================================

-- Adding a table that's already published is an error, so each one is
-- checked first rather than assuming a clean database.
do $$
declare
  t text;
begin
  foreach t in array array['rf_rooms', 'rf_players', 'rf_guesses', 'rf_bets'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
