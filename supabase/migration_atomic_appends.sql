-- PDT Dashboard — adds atomic append-only RPCs for comments/activity/proof/links.
-- Now that tasks can have collaborators editing them at the same time, two
-- people saving a comment/proof/link at the same instant could otherwise
-- both read the same stale array client-side and each write back a
-- whole-array replace, silently dropping one entry. These append
-- server-side in a single statement instead, so both land.
-- Removals are unaffected (rarer, lower-stakes race) and still work as before.
-- Run this once in the Supabase SQL editor. Safe to run more than once.

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

revoke all on function public.append_comment(text, jsonb, text) from public;
revoke all on function public.append_activity(text, jsonb, text) from public;
revoke all on function public.append_proof(text, jsonb, text) from public;
revoke all on function public.append_link(text, jsonb, text) from public;
grant execute on function public.append_comment(text, jsonb, text) to anon, authenticated;
grant execute on function public.append_activity(text, jsonb, text) to anon, authenticated;
grant execute on function public.append_proof(text, jsonb, text) to anon, authenticated;
grant execute on function public.append_link(text, jsonb, text) to anon, authenticated;
