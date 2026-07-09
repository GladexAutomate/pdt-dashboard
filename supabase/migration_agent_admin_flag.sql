-- PDT Dashboard — replaces the old "promote agent to admin" (which moved
-- their row into `admins`, dropping them from the roster) with an is_admin
-- flag directly on `agents`. They keep their team, task history, and
-- eligibility for new assignments either way — the flag only changes what
-- role login() hands back for their username. Also adds the missing
-- "revoke admin" side, which the old move-based approach couldn't do at all.
-- Run this once in the Supabase SQL editor. Safe to run more than once.

set search_path = public, extensions;

alter table agents add column if not exists is_admin boolean not null default false;

create or replace view agents_public as
  select id, name, team, username, is_admin from agents;

create or replace function public.login(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  result jsonb;
begin
  select jsonb_build_object('role', 'admin', 'id', id, 'username', username, 'name', name)
    into result from admins
    where username = lower(p_username) and password = crypt(p_password, password)
    limit 1;
  if result is not null then return result; end if;

  select jsonb_build_object('role', case when is_admin then 'admin' else 'agent' end, 'id', id, 'username', username, 'name', name, 'team', team)
    into result from agents
    where username = lower(p_username) and password = crypt(p_password, password)
    limit 1;
  return result;
end;
$$;

drop function if exists public.promote_agent_to_admin(text);

create or replace function public.set_agent_admin(p_id text, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update agents set is_admin = p_is_admin where id = p_id;
end;
$$;

revoke all on function public.set_agent_admin(text, boolean) from public;
grant execute on function public.set_agent_admin(text, boolean) to anon, authenticated;
