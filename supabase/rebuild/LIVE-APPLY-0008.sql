-- LIVE: project work plan on the map (0008). Paste into Supabase > SQL Editor > Run. One transaction.
begin;
-- 0008 a project's work plan on the map (owner's ask, 28 Sep 2026): the whole route and its work parts by
-- type (Open trench, HDD, Cable laying, or a type the admin writes), each with the points tapped and the
-- line drawn along the roads. The server measures every length; the route column follows the plan's
-- whole route, so sign-in distances, maps and totals keep working. Additive, safe to run more than once.
alter table public.projects add column if not exists plan jsonb;
alter table public.projects drop constraint if exists projects_plan_check;
alter table public.projects add constraint projects_plan_check check (plan is null or (jsonb_typeof(plan) = 'object' and pg_column_size(plan) < 4000000));

commit;
