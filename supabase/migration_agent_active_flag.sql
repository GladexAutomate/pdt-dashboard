-- PDT Dashboard — adds an is_active flag to agents, for handling employees
-- who resign without hard-deleting them. Unlike delete_agent (which nulls
-- out agent_id on their tasks and removes them from every roster/rollup),
-- this keeps their row, team, username, and full task history intact —
-- completedBy/assignedBy/activity logs keep crediting them by name, so
-- Monthly Report and team totals don't lose their historical work. The flag
-- only blocks login and hides them from new-assignment pickers going forward.
-- Run this once in the Supabase SQL editor. Safe to run more than once.

set search_path = public, extensions;

alter table agents add column if not exists is_active boolean not null default true;

create or replace view agents_public as
  select id, name, team, username, is_admin, is_active from agents;

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

  select jsonb_build_object('role', case when is_admin then 'admin' else 'agent' end, 'id', id, 'username', username, 'name', name, 'team', team, 'is_active', is_active)
    into result from agents
    where username = lower(p_username) and password = crypt(p_password, password)
    limit 1;
  if result is not null and (result->>'is_active')::boolean = false then
    raise exception 'This account has been deactivated. Contact your admin.';
  end if;
  return result;
end;
$$;

create or replace function public.set_agent_active(p_id text, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update agents set is_active = p_is_active where id = p_id;
end;
$$;

revoke all on function public.set_agent_active(text, boolean) from public;
grant execute on function public.set_agent_active(text, boolean) to anon, authenticated;
