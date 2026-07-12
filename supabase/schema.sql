-- PDT Dashboard — Supabase schema
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).

create extension if not exists pgcrypto;
set search_path = public, extensions;

-- ---------- agents ----------
-- password is a bcrypt hash (via pgcrypto's crypt()/gen_salt('bf')), never
-- plaintext. It's only ever written/checked inside the security-definer
-- functions below — the client never sees it (see agents_public view).
create table if not exists agents (
  id        text primary key,
  name      text not null,
  team      text not null check (team in ('Domestic', 'International')),
  username  text not null unique,
  password  text not null,
  is_admin  boolean not null default false,
  is_active boolean not null default true,
  gender    text check (gender in ('male', 'female', 'other'))
);
alter table agents add column if not exists is_admin boolean not null default false;
alter table agents add column if not exists is_active boolean not null default true;
alter table agents add column if not exists gender text check (gender in ('male', 'female', 'other'));

-- ---------- admin account (kept separate from agents for the pure back-office
--            supervisor identity that never does tasking — an agent can also
--            gain full admin login via agents.is_admin, see set_agent_admin
--            below, without losing their team/roster/task-history standing) ----------
create table if not exists admins (
  id       text primary key default 'admin',
  username text not null unique,
  password text not null,
  name     text not null default 'Supervisor / Manager'
);

-- safe subset of `agents` for the client to read directly — no password column.
-- Views run with the privileges of their owner (not the querying role), so
-- this bypasses the RLS lockdown on `agents` below while never exposing
-- password hashes.
create or replace view agents_public as
  select id, name, team, username, is_admin, is_active, gender from agents;

-- ---------- records: unifies tasks / premium / gladex / tariff / daily ----------
-- "daily" tasks are ordinary records too (same title/category/priority/status
-- shape as everything else) so they automatically count in KPI/productivity
-- math; due_date holds which day a daily task belongs to.
create table if not exists records (
  id              text primary key,
  collection      text not null check (collection in ('tasks', 'premium', 'gladex', 'tariff', 'daily')),
  agent_id        text references agents(id) on delete set null,
  title           text not null default '',
  category        text,
  department      text,
  destination     text,
  team            text,
  status          text not null default 'pending',
  priority        text default 'medium',
  progress        int default 0,
  start_date      timestamptz,
  due_date        timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  estimated_hours numeric,
  items_total     int default 0,
  items_error     int default 0,
  special         boolean default false,
  target          text,
  requirements    text,
  remarks         text,
  description     text,
  links           jsonb not null default '[]',
  proof           jsonb not null default '[]',
  proof_count     int default 0,
  comments        jsonb not null default '[]',
  activity        jsonb not null default '[]',
  collaborator_ids jsonb not null default '[]',
  assigned_by     text,
  completed_by    text,
  updated_at      timestamptz default now(),
  updated_by      text,
  created_at      timestamptz default now()
);
alter table records add column if not exists collaborator_ids jsonb not null default '[]';
create index if not exists records_collection_idx on records(collection);
create index if not exists records_agent_idx on records(agent_id);

-- ---------- activity / access logs ----------
create table if not exists logs (
  id      text primary key,
  user_id text,
  name    text,
  role    text,
  type    text,
  detail  text,
  ts      timestamptz not null default now()
);
create index if not exists logs_ts_idx on logs(ts desc);

-- ---------- KPI target definitions ----------
-- staff_id matches the KPI_STAFF slugs in src/lib/constants.ts (e.g. "angelee"),
-- not agents.id — this mirrors the app's existing (slightly redundant but
-- unchanged) mapping so no client code has to change.
create table if not exists kpi_defs (
  id       text primary key,
  staff_id text not null,
  task     text not null,
  target   int not null default 1
);

-- ---------- KPI monthly progress ----------
create table if not exists kpi_progress (
  month   text not null,
  def_id  text not null references kpi_defs(id) on delete cascade,
  current int not null default 0,
  primary key (month, def_id)
);

-- ---------- monthly report approval state ----------
create table if not exists reports (
  report_key   text primary key,
  status       text not null default 'in_progress',
  submitted_at timestamptz,
  submitted_by text,
  approved_at  timestamptz,
  approved_by  text
);

-- ---------- task categories (admin-managed, used across tasks/premium/gladex/tariff) ----------
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

-- ---------- "8 hours logged today" congrats popup — one row per agent per
-- day claims that day's celebration, so it only ever fires once regardless
-- of how many browsers/devices that agent is signed in on. ----------
create table if not exists congrats_log (
  agent_id text not null,
  date     text not null,
  shown_at timestamptz not null default now(),
  primary key (agent_id, date)
);

-- ---------- auth functions ----------
-- All credential reads/writes go through these security-definer functions,
-- which run with the privileges of the function owner and so bypass RLS —
-- that's how they can check/hash passwords even though anon has zero direct
-- access to `agents`/`admins`. The client never sees a password or a hash.

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

-- signatures below gained p_gender — drop the old arities first so they
-- don't linger as ambiguous overloads alongside the new ones.
drop function if exists public.create_agent(text, text, text, text, text);
drop function if exists public.update_agent(text, text, text, text, text);

create or replace function public.create_agent(p_id text, p_name text, p_team text, p_username text, p_password text, p_gender text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if exists (select 1 from agents where username = lower(p_username))
     or exists (select 1 from admins where username = lower(p_username)) then
    raise exception 'That username is already taken.';
  end if;
  insert into agents (id, name, team, username, password, gender)
  values (p_id, p_name, p_team, lower(p_username), crypt(p_password, gen_salt('bf')), p_gender);
end;
$$;

-- any param left null keeps its current value; p_password null/empty keeps the current password.
create or replace function public.update_agent(p_id text, p_name text default null, p_team text default null, p_username text default null, p_password text default null, p_gender text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_username text;
begin
  v_username := lower(coalesce(p_username, (select username from agents where id = p_id)));
  if exists (select 1 from agents where username = v_username and id <> p_id)
     or exists (select 1 from admins where username = v_username) then
    raise exception 'That username is already taken.';
  end if;
  update agents set
    name = coalesce(p_name, name),
    team = coalesce(p_team, team),
    username = v_username,
    password = case when p_password is not null and length(p_password) > 0 then crypt(p_password, gen_salt('bf')) else password end,
    gender = coalesce(p_gender, gender)
  where id = p_id;
end;
$$;

create or replace function public.delete_agent(p_id text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  delete from agents where id = p_id;
end;
$$;

-- Changing the admin's own account requires the current password, unlike
-- update_agent — this is the one credential that gates everything else, so
-- it gets one extra check even though the app's overall RLS model (see the
-- note below) otherwise trusts the anon key for everything.
create or replace function public.update_admin(p_id text, p_current_password text, p_name text default null, p_username text default null, p_new_password text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_username text;
begin
  if not exists (select 1 from admins where id = p_id and password = crypt(p_current_password, password)) then
    raise exception 'Current password is incorrect.';
  end if;
  v_username := lower(coalesce(p_username, (select username from admins where id = p_id)));
  if exists (select 1 from admins where username = v_username and id <> p_id)
     or exists (select 1 from agents where username = v_username) then
    raise exception 'That username is already taken.';
  end if;
  update admins set
    name = coalesce(p_name, name),
    username = v_username,
    password = case when p_new_password is not null and length(p_new_password) > 0 then crypt(p_new_password, gen_salt('bf')) else password end
  where id = p_id;
end;
$$;

-- Grants or revokes admin login for an existing agent, in place — they keep
-- their team, task history, and eligibility for new assignments either way;
-- the flag only changes what role login() hands back for their username.
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

-- "Resigned" is a soft delete: the agent row, team, username, and every task
-- they ever touched stay exactly as they are (completedBy/assignedBy/activity
-- keep crediting them by name, so Monthly Report and team rollups don't lose
-- their history) — this flag only blocks login and hides them from
-- new-assignment pickers going forward.
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

-- ---------- atomic append-only writes (comments / activity / proof / links) ----------
-- Now that a task can have collaborators editing it at the same time (see
-- collaborator_ids above), two people saving a comment/proof/link at the
-- same instant could otherwise both read the same stale array client-side
-- and each write back a whole-array replace, silently dropping one entry.
-- These append server-side in one statement instead, so both land.
-- Removals stay as plain client-side patches (rarer, lower-stakes race).
create or replace function public.append_comment(p_record_id text, p_comment jsonb, p_updated_by text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update records set comments = comments || jsonb_build_array(p_comment), updated_at = now(), updated_by = p_updated_by
  where id = p_record_id;
$$;

create or replace function public.append_activity(p_record_id text, p_entry jsonb, p_updated_by text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update records set activity = activity || jsonb_build_array(p_entry), updated_at = now(), updated_by = p_updated_by
  where id = p_record_id;
$$;

create or replace function public.append_proof(p_record_id text, p_item jsonb, p_updated_by text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update records set proof = proof || jsonb_build_array(p_item), proof_count = jsonb_array_length(proof) + 1, updated_at = now(), updated_by = p_updated_by
  where id = p_record_id;
$$;

create or replace function public.append_link(p_record_id text, p_link jsonb, p_updated_by text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update records set links = links || jsonb_build_array(p_link), updated_at = now(), updated_by = p_updated_by
  where id = p_record_id;
$$;

revoke all on function public.login(text, text) from public;
revoke all on function public.create_agent(text, text, text, text, text, text) from public;
revoke all on function public.update_agent(text, text, text, text, text, text) from public;
revoke all on function public.delete_agent(text) from public;
revoke all on function public.update_admin(text, text, text, text, text) from public;
revoke all on function public.set_agent_admin(text, boolean) from public;
revoke all on function public.set_agent_active(text, boolean) from public;
revoke all on function public.append_comment(text, jsonb, text) from public;
revoke all on function public.append_activity(text, jsonb, text) from public;
revoke all on function public.append_proof(text, jsonb, text) from public;
revoke all on function public.append_link(text, jsonb, text) from public;
grant execute on function public.login(text, text) to anon, authenticated;
grant execute on function public.create_agent(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.update_agent(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.delete_agent(text) to anon, authenticated;
grant execute on function public.update_admin(text, text, text, text, text) to anon, authenticated;
grant execute on function public.set_agent_admin(text, boolean) to anon, authenticated;
grant execute on function public.set_agent_active(text, boolean) to anon, authenticated;
grant execute on function public.append_comment(text, jsonb, text) to anon, authenticated;
grant execute on function public.append_activity(text, jsonb, text) to anon, authenticated;
grant execute on function public.append_proof(text, jsonb, text) to anon, authenticated;
grant execute on function public.append_link(text, jsonb, text) to anon, authenticated;

-- ---------- Row Level Security ----------
-- NOTE (security tradeoff, please read):
-- This app authenticates with a custom username/password check rather than
-- real Supabase Auth, so there is no `auth.uid()` to key policies on. Every
-- table below except `agents`/`admins` allows full read/write to anyone
-- holding the public anon key (which ships in the JS bundle and is never
-- actually secret) — fine for an internal tool with no real per-user access
-- control, but worth knowing. `agents`/`admins` are the exception: they hold
-- password hashes, so anon gets NO direct policy on them at all (deny by
-- default) — all access goes through the security-definer functions above,
-- plus the password-free `agents_public` view for reading the roster.
alter table agents enable row level security;
alter table admins enable row level security;
alter table records enable row level security;
alter table logs enable row level security;
alter table kpi_defs enable row level security;
alter table kpi_progress enable row level security;
alter table reports enable row level security;
alter table categories enable row level security;
alter table congrats_log enable row level security;

-- drop-then-create makes this file safe to run more than once.
drop policy if exists "anon full access" on records;
drop policy if exists "anon full access" on logs;
drop policy if exists "anon full access" on kpi_defs;
drop policy if exists "anon full access" on kpi_progress;
drop policy if exists "anon full access" on reports;
drop policy if exists "anon full access" on categories;
drop policy if exists "anon full access" on congrats_log;
create policy "anon full access" on records for all using (true) with check (true);
create policy "anon full access" on logs for all using (true) with check (true);
create policy "anon full access" on kpi_defs for all using (true) with check (true);
create policy "anon full access" on kpi_progress for all using (true) with check (true);
create policy "anon full access" on reports for all using (true) with check (true);
create policy "anon full access" on categories for all using (true) with check (true);
create policy "anon full access" on congrats_log for all using (true) with check (true);
grant select on agents_public to anon, authenticated;

-- ---------- Realtime ----------
-- Lets the app live-refresh when any user changes any record, daily tasks
-- included (see subscribeToChanges() in src/lib/api.ts). Wrapped so
-- re-running this file is safe even if the table's already in the publication.
do $$ begin
  alter publication supabase_realtime add table records;
exception when duplicate_object then null;
end $$;
