-- PDT Dashboard — incremental migration: Daily Tasking feature
--
-- SKIP THIS FILE if schema.sql already includes a "daily_tasks" table (it
-- does as of this writing) and you ran schema.sql fresh — you already have
-- everything this file adds. This is only for a database that was set up
-- from an OLDER schema.sql that predates Daily Tasking, so you can add just
-- the new table + policy + realtime without re-running everything else
-- (which would error on "policy already exists").

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

alter table daily_tasks enable row level security;

-- same "anon full access" trade-off as every other table — see schema.sql's note.
-- drop-then-create makes this file safe to run more than once.
drop policy if exists "anon full access" on daily_tasks;
create policy "anon full access" on daily_tasks for all using (true) with check (true);

-- realtime: lets the app live-refresh on changes (see subscribeToChanges() in src/lib/api.ts).
-- wrapped so re-running this file is safe even if a table's already in the publication.
do $$ begin
  alter publication supabase_realtime add table daily_tasks;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table records;
exception when duplicate_object then null;
end $$;
