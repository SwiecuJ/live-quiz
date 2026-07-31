-- Mafia: the phone replaces the narrator.
--
-- The privacy rule shapes this whole schema. In the other two games every
-- row can be public, because knowing what someone answered doesn't break
-- anything. Here, seeing another player's role IS the game -- so roles,
-- night actions and the per-player secret never get a public policy at all.
-- They're reachable only through the service role, behind a secret the
-- player receives once when joining. Day votes are public, because voting
-- in Mafia happens in the open anyway.

create table if not exists mf_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'lobby'
    check (status in ('lobby', 'noc', 'dzien', 'glosowanie', 'wynik', 'koniec')),
  day_number int not null default 0,
  -- Filled by the night resolution so every phone tells the same story.
  last_event jsonb,
  winner text check (winner in ('mafia', 'miasto')),
  phase_started_at timestamptz,
  created_at timestamptz not null default now()
);

-- Public: nickname and whether they're still in. Never the role.
create table if not exists mf_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references mf_rooms(id) on delete cascade,
  nickname text not null,
  device_id text,
  alive boolean not null default true,
  -- Revealed on death, so the table can see what they were.
  revealed_role text,
  created_at timestamptz not null default now()
);

-- Private. No policies -> unreachable with the anon key, by design.
create table if not exists mf_secrets (
  player_id uuid primary key references mf_players(id) on delete cascade,
  room_id uuid not null references mf_rooms(id) on delete cascade,
  role text,
  secret text not null
);

-- Private: who the mafia picked is the whole mystery.
create table if not exists mf_actions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references mf_rooms(id) on delete cascade,
  player_id uuid not null references mf_players(id) on delete cascade,
  day_number int not null,
  target_id uuid references mf_players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (player_id, day_number)
);

-- Public: lynch votes are cast out loud.
create table if not exists mf_votes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references mf_rooms(id) on delete cascade,
  player_id uuid not null references mf_players(id) on delete cascade,
  day_number int not null,
  target_id uuid references mf_players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (player_id, day_number)
);

create index if not exists idx_mf_players_room on mf_players(room_id);
create index if not exists idx_mf_actions_room_day on mf_actions(room_id, day_number);
create index if not exists idx_mf_votes_room_day on mf_votes(room_id, day_number);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table mf_rooms enable row level security;
alter table mf_players enable row level security;
alter table mf_secrets enable row level security;
alter table mf_actions enable row level security;
alter table mf_votes enable row level security;

drop policy if exists "mf rooms readable" on mf_rooms;
create policy "mf rooms readable" on mf_rooms for select using (true);

drop policy if exists "mf players readable" on mf_players;
create policy "mf players readable" on mf_players for select using (true);

drop policy if exists "mf votes readable" on mf_votes;
create policy "mf votes readable" on mf_votes for select using (true);

-- mf_secrets and mf_actions get no policies on purpose. Joining, learning
-- your own role, and acting at night all go through server routes that
-- check the player's secret first -- otherwise anyone could read anyone
-- else's card straight out of the database.

-- ============================================================
-- Realtime
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array['mf_rooms', 'mf_players', 'mf_votes'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
