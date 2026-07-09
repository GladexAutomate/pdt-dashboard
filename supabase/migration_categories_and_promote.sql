-- PDT Dashboard — adds (1) an admin-managed categories table, replacing the
-- hardcoded CATEGORIES list in the code, and (2) a promote_agent_to_admin
-- RPC so an existing agent can be turned into an admin from the app.
-- Run this once in the Supabase SQL editor. Safe to run more than once.

set search_path = public, extensions;

-- ---------- categories ----------
create table if not exists categories (
  id    text primary key,
  name  text not null unique,
  color text not null default '#64708A'
);
insert into categories (id, name, color) values
  ('cat1', 'BOT', '#7C5CE0'),
  ('cat2', 'Website', '#0E9E8E'),
  ('cat3', 'Lakbayhub', '#E0663F'),
  ('cat4', 'Land arrangement', '#3C6CE0'),
  ('cat5', 'Collectives', '#D9852A')
on conflict (id) do nothing;

alter table categories enable row level security;
drop policy if exists "anon full access" on categories;
create policy "anon full access" on categories for all using (true) with check (true);

-- ---------- promote_agent_to_admin ----------
-- Moves an existing agent's login into admins, keeping their username/password/name
-- as-is (so they can log back in immediately with what they already know) and
-- removing them from agents. Same trade-off as delete_agent: their past task
-- assignments aren't deleted, but agent_id on those records goes to null
-- (shows as "Unassigned") since the agent row is gone.
create or replace function public.promote_agent_to_admin(p_id text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  a agents;
begin
  select * into a from agents where id = p_id;
  if a is null then
    raise exception 'Agent not found.';
  end if;
  insert into admins (id, username, password, name) values (a.id, a.username, a.password, a.name);
  delete from agents where id = p_id;
end;
$$;

revoke all on function public.promote_agent_to_admin(text) from public;
grant execute on function public.promote_agent_to_admin(text) to anon, authenticated;
