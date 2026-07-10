-- PDT Dashboard — adds collaborator_ids to records, so a task can have
-- additional people with full edit access besides its primary assignee.
-- Lets two (or more) agents genuinely work the same ticket at the same
-- time, each seeing it in their own "My work" list. Whoever actually
-- completes/publishes it still gets the completion credit, same rule as
-- always (see set_recstatus's completedBy logic in App.tsx).
-- Run this once in the Supabase SQL editor. Safe to run more than once.

alter table records add column if not exists collaborator_ids jsonb not null default '[]';
