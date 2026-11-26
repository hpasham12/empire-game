-- Append-only audit log of room activity: joins, leaves/removals, rejoins
-- (ownership moved to a new device) and game phase changes.
--
-- Apply: paste into the Supabase SQL editor (or `supabase db push`).
-- View:  Table Editor -> room_events, or
--        select * from room_events where room_code = 'ABCD' order by at;
--
-- No foreign keys on purpose: rows must survive the room/player being deleted.
-- actor = auth.uid() of the caller; null when a service-role edge function
-- made the change (distribute-words, leave-room, end-game, rejoin, reset-round).

create table if not exists public.room_events (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  room_id    text,
  room_code  text,
  player_id  text,
  nickname   text,
  event      text not null,
  detail     text,
  actor      text
);

create index if not exists room_events_room_idx on public.room_events (room_id, at);

-- RLS on with no policies: clients can't read or write it; only the dashboard,
-- SQL editor and service role can.
alter table public.room_events enable row level security;

create or replace function public.log_player_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rid  text := coalesce(new.room_id, old.room_id)::text;
  code text := (select room_code from rooms where id::text = rid);
begin
  if tg_op = 'INSERT' then
    insert into room_events (room_id, room_code, player_id, nickname, event, detail, actor)
    values (rid, code, new.id::text, new.nickname, 'joined',
            case when new.is_host then 'host' end, auth.uid()::text);
  elsif tg_op = 'DELETE' then
    insert into room_events (room_id, room_code, player_id, nickname, event, actor)
    values (rid, code, old.id::text, old.nickname, 'left', auth.uid()::text);
  elsif new.user_id is distinct from old.user_id then
    insert into room_events (room_id, room_code, player_id, nickname, event, actor)
    values (rid, code, new.id::text, new.nickname, 'rejoined', auth.uid()::text);
  elsif new.is_host and not old.is_host then
    insert into room_events (room_id, room_code, player_id, nickname, event, actor)
    values (rid, code, new.id::text, new.nickname, 'became_host', auth.uid()::text);
  end if;
  return null;
end $$;

drop trigger if exists players_log on public.players;
create trigger players_log
  after insert or delete or update of user_id, is_host on public.players
  for each row execute function public.log_player_event();

create or replace function public.log_room_phase() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into room_events (room_id, room_code, event, detail, actor)
  values (new.id::text, new.room_code, 'phase',
          coalesce(old.game_phase, '?') || ' -> ' || new.game_phase, auth.uid()::text);
  return null;
end $$;

drop trigger if exists rooms_phase_log on public.rooms;
create trigger rooms_phase_log
  after update of game_phase on public.rooms
  for each row when (old.game_phase is distinct from new.game_phase)
  execute function public.log_room_phase();
