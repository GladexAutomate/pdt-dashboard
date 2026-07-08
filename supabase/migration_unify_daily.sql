-- PDT Dashboard — incremental migration: unify Daily Tasking into records
--
-- Run this if your database still has a separate `daily_tasks` table (i.e.
-- you ran schema.sql before this migration existed). Skip it if you're
-- setting up fresh — the current schema.sql already has "daily" as a
-- records.collection value and no daily_tasks table at all.
--
-- Daily tasks are now just records with collection = 'daily' — same
-- title/category/priority/status shape as tasks/premium/gladex/tariff, so
-- they automatically count in KPI/productivity math and open in the same
-- TaskDetail drawer. `due_date` holds which day a daily task belongs to.

-- 1. allow "daily" as a records.collection value
alter table records drop constraint if exists records_collection_check;
alter table records add constraint records_collection_check check (collection in ('tasks', 'premium', 'gladex', 'tariff', 'daily'));

-- 2. migrate any existing daily_tasks rows into records (best effort: the old
--    "assigned" status maps to "pending", and each day's timeline entries
--    become activity entries).
insert into records (id, collection, agent_id, title, status, priority, start_date, due_date, assigned_by, started_at, completed_at, progress, activity)
select
  dt.id,
  'daily',
  dt.agent_id,
  dt.title,
  case dt.status when 'assigned' then 'pending' else dt.status end,
  'medium',
  to_timestamp(dt.date, 'YYYY-MM-DD'),
  to_timestamp(dt.date, 'YYYY-MM-DD'),
  dt.assigned_by,
  dt.started_at,
  dt.completed_at,
  case dt.status when 'completed' then 100 when 'published' then 100 when 'in_progress' then 50 else 0 end,
  coalesce(
    (select jsonb_agg(jsonb_build_object(
       'id', 'ac' || gen_random_uuid(),
       'type', 'status',
       'text', tl ->> 'label',
       'by', coalesce(dt.assigned_by, '—'),
       'role', 'admin',
       'ts', (tl ->> 'ts')::bigint,
       'status', case tl ->> 'action' when 'assigned' then 'pending' else tl ->> 'action' end
     ))
     from jsonb_array_elements(dt.timeline) as tl),
    '[]'::jsonb
  )
from daily_tasks dt
on conflict (id) do nothing;

-- 3. the old table is fully superseded now
drop table if exists daily_tasks;
