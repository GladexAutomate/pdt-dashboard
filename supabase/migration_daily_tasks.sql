-- PDT Dashboard — OBSOLETE, do not run.
--
-- Daily Tasking no longer uses a separate `daily_tasks` table at all — it's
-- now just records with collection = 'daily' (see schema.sql). This file is
-- kept only for history. If your database still has a `daily_tasks` table
-- from before this change, run migration_unify_daily.sql instead.

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
