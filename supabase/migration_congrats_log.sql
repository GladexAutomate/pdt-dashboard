-- PDT Dashboard — adds congrats_log, so the "you logged 8 hours today"
-- celebration popup only ever fires once per agent per day, no matter how
-- many browsers/devices they're signed in on (a row here "claims" that
-- day's celebration; a second attempt just hits the primary key and loses).
-- Run this once in the Supabase SQL editor. Safe to run more than once.

create table if not exists congrats_log (
  agent_id text not null,
  date     text not null,
  shown_at timestamptz not null default now(),
  primary key (agent_id, date)
);

alter table congrats_log enable row level security;
drop policy if exists "anon full access" on congrats_log;
create policy "anon full access" on congrats_log for all using (true) with check (true);
