-- Persistent per-device identity, so scores can be added up across games.
--
-- There are no accounts in this app, so "the same person" means "the same
-- browser": each device generates an id once and reuses it every time it
-- joins a room. Nicknames stay free-form and can change between games --
-- the id is what ties the rows together, the nickname is only for display.

alter table players add column if not exists device_id text;

create index if not exists idx_players_device_id on players(device_id);

-- All-time ranking. Aggregating in the database keeps the API from having
-- to pull every player row ever created just to add them up.
--
-- Rooms still sitting in the lobby are excluded: nobody played those, so
-- counting them would inflate everyone's games-played with empty entries.
-- The displayed nickname is whichever one the device used most recently.
-- device_id is grouped on but deliberately not selected: the view is
-- readable with the public anon key, and the id is what identifies someone
-- across games -- there's no reason to hand it out.
-- Dropped rather than "create or replace": replacing a view fails outright
-- if its column list ever changes, which would make re-running this file
-- error instead of being a no-op.
drop view if exists global_scores;

-- security_invoker keeps the view honouring the caller's row-level
-- security instead of the owner's. Both underlying tables are publicly
-- readable, so this changes nothing today, but it means the view can't
-- quietly become a way around a policy tightened later.
create view global_scores with (security_invoker = on) as
select
  (array_agg(p.nickname order by p.created_at desc))[1] as nickname,
  sum(p.total_score)::int as total_score,
  count(*)::int as games_played,
  max(p.created_at) as last_played_at
from players p
join rooms r on r.id = p.room_id
where p.device_id is not null
  and r.status <> 'lobby'
group by p.device_id;
