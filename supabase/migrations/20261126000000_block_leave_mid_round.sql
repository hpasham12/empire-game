-- Players can't leave (or be removed by a client) while a round is in
-- progress: deleting a player mid-round drops their secret word from the game.
-- Only client requests (anon/authenticated) are blocked; service-role edge
-- functions (end-game, leave-room) and the SQL editor are unaffected.
--
-- Apply: paste into the Supabase SQL editor.

create or replace function public.block_leave_mid_round() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() in ('anon', 'authenticated')
     and exists (select 1 from rooms where id = old.room_id and game_phase <> 'lobby') then
    raise exception 'cannot leave the room during a round' using errcode = 'P0001';
  end if;
  return old;
end $$;

drop trigger if exists players_block_leave_mid_round on public.players;
create trigger players_block_leave_mid_round
  before delete on public.players
  for each row execute function public.block_leave_mid_round();
