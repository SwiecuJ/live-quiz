-- Live Quiz schema
-- Fully anonymous app (no Supabase Auth). RLS policies are intentionally
-- permissive for player-facing tables (rooms/players/answers) since there is
-- no session/user to scope access to. Quiz content (quizzes/questions) is
-- only ever written by server-side route handlers using the service role
-- key, which bypasses RLS entirely -- so no public write policies exist for
-- those two tables.

create extension if not exists "pgcrypto";

-- ============================================================
-- Tables
-- ============================================================

create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  created_at timestamptz not null default now()
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  question_text text not null,
  options jsonb not null,
  correct_index int not null check (correct_index between 0 and 3),
  order_index int not null
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  status text not null default 'lobby'
    check (status in ('lobby', 'in_progress', 'round_result', 'finished')),
  current_question_index int not null default -1,
  question_start_at timestamptz,
  round_time_seconds int not null default 20,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  nickname text not null,
  total_score int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  selected_index int not null check (selected_index between 0 and 3),
  answered_at timestamptz not null default now(),
  points_awarded int not null default 0,
  unique (player_id, question_id)
);

create index if not exists idx_questions_quiz_id on questions(quiz_id);
create index if not exists idx_players_room_id on players(room_id);
create index if not exists idx_answers_room_id on answers(room_id);
create index if not exists idx_answers_question_id on answers(question_id);
create index if not exists idx_rooms_code on rooms(code);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table quizzes enable row level security;
alter table questions enable row level security;
alter table rooms enable row level security;
alter table players enable row level security;
alter table answers enable row level security;

-- quizzes / questions: no public policies at all. All reads/writes for
-- these two tables go through server-side route handlers using the
-- SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS. Host and player screens
-- fetch question data through server routes / server components too, not
-- directly with the anon key, so no SELECT policy is needed here.

-- rooms: anyone can read room state (needed for realtime sync on both the
-- host screen and every player's phone). Room status/round transitions are
-- written by server-side route handlers with the service role key, so no
-- public INSERT/UPDATE policy is needed.
create policy "rooms are publicly readable"
  on rooms for select
  using (true);

-- players: anyone can read the player list (leaderboard, lobby list).
-- Joining a room is a public, anonymous action, so INSERT is public too.
create policy "players are publicly readable"
  on players for select
  using (true);

create policy "anyone can join a room as a player"
  on players for insert
  with check (true);

-- answers: anyone can read answers (needed to render round results).
-- Submitting an answer is a public, anonymous action; the unique
-- (player_id, question_id) constraint prevents a player from answering the
-- same question twice. Updates (scoring) happen server-side with the
-- service role key, so no public UPDATE policy is needed.
create policy "answers are publicly readable"
  on answers for select
  using (true);

create policy "players can submit their own answer once"
  on answers for insert
  with check (true);

-- ============================================================
-- Realtime
-- ============================================================

alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table answers;
