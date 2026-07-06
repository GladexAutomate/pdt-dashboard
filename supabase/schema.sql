-- PDT Dashboard — Supabase schema
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).

-- ---------- agents ----------
create table if not exists agents (
  id       text primary key,
  name     text not null,
  team     text not null check (team in ('Domestic', 'International')),
  username text not null unique,
  password text not null
);

-- ---------- admin account (kept separate from agents so it never
--            shows up in team rosters / assignee dropdowns / stats) ----------
create table if not exists admins (
  id       text primary key default 'admin',
  username text not null unique,
  password text not null,
  name     text not null default 'Supervisor / Manager'
);

-- ---------- records: unifies tasks / premium / gladex / tariff ----------
create table if not exists records (
  id              text primary key,
  collection      text not null check (collection in ('tasks', 'premium', 'gladex', 'tariff')),
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
  assigned_by     text,
  completed_by    text,
  updated_at      timestamptz default now(),
  updated_by      text,
  created_at      timestamptz default now()
);
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

-- ---------- daily tasking ----------
create table if not exists daily_tasks (
  id           text primary key,
  agent_id     text references agents(id) on delete set null,
  title        text not null default '',
  date         text not null,
  status       text not null default 'assigned' check (status in ('assigned', 'in_progress', 'completed', 'published')),
  assigned_by  text,
  assigned_at  timestamptz default now(),
  started_at   timestamptz,
  completed_at timestamptz,
  timeline     jsonb not null default '[]'
);
create index if not exists daily_tasks_agent_idx on daily_tasks(agent_id);
create index if not exists daily_tasks_date_idx on daily_tasks(date);

-- ---------- Row Level Security ----------
-- NOTE (security tradeoff, please read):
-- This app authenticates with a custom username/password check against the
-- `agents`/`admins` tables rather than real Supabase Auth, so there is no
-- `auth.uid()` to key policies on. The policies below allow full read/write
-- to anyone holding the public anon key (which ships in the JS bundle and is
-- never actually secret). That matches the app's current, already-disclosed
-- demo-credential model (the login screen literally prints "Agents password:
-- pdt123 / Admin: admin123"), but it means anyone with the anon key can read
-- or write any row directly, bypassing the UI entirely. Fine for an internal
-- demo/prototype; if this ever holds real credentials or sensitive data,
-- switch to real Supabase Auth + policies keyed on auth.uid().
alter table agents enable row level security;
alter table admins enable row level security;
alter table records enable row level security;
alter table logs enable row level security;
alter table kpi_defs enable row level security;
alter table kpi_progress enable row level security;
alter table reports enable row level security;
alter table daily_tasks enable row level security;

create policy "anon full access" on agents for all using (true) with check (true);
create policy "anon full access" on admins for all using (true) with check (true);
create policy "anon full access" on records for all using (true) with check (true);
create policy "anon full access" on logs for all using (true) with check (true);
create policy "anon full access" on kpi_defs for all using (true) with check (true);
create policy "anon full access" on kpi_progress for all using (true) with check (true);
create policy "anon full access" on reports for all using (true) with check (true);
create policy "anon full access" on daily_tasks for all using (true) with check (true);

-- ---------- Realtime ----------
-- Lets the app live-refresh when any user changes a record or daily task
-- (see subscribeToChanges() in src/lib/api.ts). Wrapped so re-running this
-- file is safe even if a table's already in the publication.
do $$ begin
  alter publication supabase_realtime add table records;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table daily_tasks;
exception when duplicate_object then null;
end $$;
