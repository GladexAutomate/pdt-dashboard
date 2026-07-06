-- PDT Dashboard — Daily Tasking migration
-- Run once in the Supabase SQL editor, AFTER your existing schema.sql.

-- ---------- daily_tasks ----------
create table if not exists daily_tasks (
  id           text primary key,
  agent_id     text references agents(id) on delete cascade,
  title        text not null,
  date         text not null,                 -- 'YYYY-MM-DD' (matches the app's day key)
  status       text not null default 'assigned'
               check (status in ('assigned', 'in_progress', 'completed', 'published')),
  assigned_by  text,
  assigned_at  timestamptz,
  started_at   timestamptz,
  completed_at timestamptz,
  timeline     jsonb not null default '[]',   -- [{ ts:number(ms), action, label }]
  created_at   timestamptz not null default now()
);
create index if not exists daily_tasks_date_idx  on daily_tasks(date);
create index if not exists daily_tasks_agent_idx on daily_tasks(agent_id);

-- ---------- RLS (mirrors the app's existing permissive anon model) ----------
alter table daily_tasks enable row level security;
create policy "anon full access" on daily_tasks for all using (true) with check (true);

-- ---------- Realtime ----------
-- Lets an already-open employee session see a task the supervisor just assigned,
-- without a manual refresh (fixes request #7). Adds the tables to the realtime
-- publication. Wrapped so re-running is safe if a table is already a member.
do $$
begin
  begin execute 'alter publication supabase_realtime add table daily_tasks'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table records';     exception when duplicate_object then null; end;
end $$;

-- ---------- OPTIONAL demo seed (delete this block if you don't want sample data) ----------
-- A few daily tasks for today so the module isn't empty on first open.
insert into daily_tasks (id, agent_id, title, date, status, assigned_by, assigned_at, started_at, completed_at, timeline) values
('d1','a1','Vietnam Itinerary', to_char(now(),'YYYY-MM-DD'),'published','Supervisor',
  now() - interval '6 hours', now() - interval '5 hours 45 minutes', now() - interval '4 hours 30 minutes',
  jsonb_build_array(
    jsonb_build_object('ts',(extract(epoch from now() - interval '6 hours')*1000)::bigint,'action','assigned','label','Assigned Vietnam Itinerary'),
    jsonb_build_object('ts',(extract(epoch from now() - interval '5 hours 45 minutes')*1000)::bigint,'action','in_progress','label','Started Vietnam Itinerary'),
    jsonb_build_object('ts',(extract(epoch from now() - interval '4 hours 30 minutes')*1000)::bigint,'action','completed','label','Completed Vietnam Itinerary'),
    jsonb_build_object('ts',(extract(epoch from now() - interval '4 hours 15 minutes')*1000)::bigint,'action','published','label','Published Vietnam Itinerary'))),
('d2','a1','Japan Tariff Update', to_char(now(),'YYYY-MM-DD'),'completed','Supervisor',
  now() - interval '4 hours', now() - interval '3 hours 50 minutes', now() - interval '1 hour 45 minutes',
  jsonb_build_array(
    jsonb_build_object('ts',(extract(epoch from now() - interval '4 hours')*1000)::bigint,'action','assigned','label','Assigned Japan Tariff Update'),
    jsonb_build_object('ts',(extract(epoch from now() - interval '3 hours 50 minutes')*1000)::bigint,'action','in_progress','label','Started Japan Tariff Update'),
    jsonb_build_object('ts',(extract(epoch from now() - interval '1 hour 45 minutes')*1000)::bigint,'action','completed','label','Completed Japan Tariff Update'))),
('d3','a1','Hong Kong Package', to_char(now(),'YYYY-MM-DD'),'assigned','Supervisor',
  now() - interval '30 minutes', null, null,
  jsonb_build_array(
    jsonb_build_object('ts',(extract(epoch from now() - interval '30 minutes')*1000)::bigint,'action','assigned','label','Assigned Hong Kong Package'))),
('d4','a4','Danang Copy Text', to_char(now(),'YYYY-MM-DD'),'completed','Supervisor',
  now() - interval '5 hours', now() - interval '4 hours 50 minutes', now() - interval '3 hours 30 minutes',
  jsonb_build_array(
    jsonb_build_object('ts',(extract(epoch from now() - interval '5 hours')*1000)::bigint,'action','assigned','label','Assigned Danang Copy Text'),
    jsonb_build_object('ts',(extract(epoch from now() - interval '4 hours 50 minutes')*1000)::bigint,'action','in_progress','label','Started Danang Copy Text'),
    jsonb_build_object('ts',(extract(epoch from now() - interval '3 hours 30 minutes')*1000)::bigint,'action','completed','label','Completed Danang Copy Text'))),
('d5','a4','Boracay Package', to_char(now(),'YYYY-MM-DD'),'in_progress','Supervisor',
  now() - interval '3 hours', now() - interval '2 hours 40 minutes', null,
  jsonb_build_array(
    jsonb_build_object('ts',(extract(epoch from now() - interval '3 hours')*1000)::bigint,'action','assigned','label','Assigned Boracay Package'),
    jsonb_build_object('ts',(extract(epoch from now() - interval '2 hours 40 minutes')*1000)::bigint,'action','in_progress','label','Started Boracay Package')))
on conflict (id) do nothing;