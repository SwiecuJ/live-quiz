-- A beat that was missing: before the first night everyone needs to look at
-- their own card and say they've seen it. Without it the game opened
-- straight into a night where nobody knew what they were, and the mafia had
-- no moment to work out who they were killing.

alter table mf_rooms drop constraint if exists mf_rooms_status_check;
alter table mf_rooms add constraint mf_rooms_status_check
  check (status in ('lobby', 'role_reveal', 'noc', 'dzien', 'glosowanie', 'wynik', 'koniec'));

-- Tracks who has tapped through their card. Public: knowing that someone is
-- ready says nothing about what they are.
alter table mf_players add column if not exists ready boolean not null default false;
