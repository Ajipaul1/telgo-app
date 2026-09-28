-- 0004 per-project totals, chat helpers. Additive, safe to run more than once.

-- everything done and spent on each project, straight from approved reports (never typed)
create or replace view public.v_project_totals as
select project_id, is_test,
  sum(reports)::int as reports,
  min(report_date) as first_day,
  max(report_date) as last_day,
  count(*)::int as days,
  sum(workers)::int as worker_days,
  sum(ot_hours)::numeric as ot_hours,
  sum(wages)::numeric as wages,
  sum(fuel)::numeric as fuel,
  sum(travel)::numeric as travel,
  sum(room_rent)::numeric as room_rent,
  sum(tool_rent)::numeric as tool_rent,
  sum(other)::numeric as other,
  sum(trenching_m)::numeric as trenching_m,
  sum(hdd_m)::numeric as hdd_m,
  sum(cable_laying_m)::numeric as cable_laying_m,
  sum(cable_mounting_m)::numeric as cable_mounting_m,
  sum(joints)::int as joints,
  sum(rmu_foundations)::int as rmu_foundations,
  sum(terminations)::int as terminations
from public.v_ledger_daily
group by project_id, is_test;

-- unread chat messages for one person (messages from before they joined a chat don't count)
create or replace function public.telgo_chat_unread(p_user uuid) returns int
language sql stable as $$
  select count(*)::int
  from public.chat_messages m
  join public.chat_members cm on cm.thread_id = m.thread_id and cm.user_id = p_user and cm.left_at is null
  join public.chat_threads t on t.id = m.thread_id and t.trashed_at is null and t.archived_at is null
  where m.sender_id <> p_user and m.removed_at is null and m.trashed_at is null
    and m.created_at > coalesce(cm.last_read_at, cm.joined_at)
$$;

-- the direct chat between two people (made the first time either opens it)
create or replace function public.telgo_chat_direct(p_a uuid, p_b uuid) returns public.chat_threads
language plpgsql as $$
declare k text := least(p_a::text, p_b::text) || ':' || greatest(p_a::text, p_b::text); t public.chat_threads; test boolean;
begin
  select * into t from public.chat_threads where direct_key = k;
  if not found then
    select coalesce(is_test, false) into test from public.mobile_app_users where id = p_a;
    insert into public.chat_threads (kind, direct_key, created_by, is_test) values ('direct', k, p_a, test)
      on conflict (direct_key) do nothing;
    select * into t from public.chat_threads where direct_key = k;
  end if;
  insert into public.chat_members (thread_id, user_id) values (t.id, p_a), (t.id, p_b) on conflict do nothing;
  return t;
end $$;

-- the team chat of this person's world (everyone except clients); joins them if they aren't in it yet
create or replace function public.telgo_chat_team(p_user uuid) returns public.chat_threads
language plpgsql as $$
declare u public.mobile_app_users; k text; t public.chat_threads;
begin
  select * into u from public.mobile_app_users where id = p_user;
  k := case when u.is_test then 'team:test' else 'team' end;
  select * into t from public.chat_threads where direct_key = k;
  if not found then
    insert into public.chat_threads (kind, title, direct_key, created_by, is_test) values ('team', 'Team chat', k, p_user, coalesce(u.is_test, false))
      on conflict (direct_key) do nothing;
    select * into t from public.chat_threads where direct_key = k;
  end if;
  if u.role <> 'client' then
    insert into public.chat_members (thread_id, user_id) values (t.id, p_user) on conflict do nothing;
  end if;
  return t;
end $$;

-- lock what this file made
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;
revoke all on public.v_project_totals from anon, authenticated;
grant select on public.v_project_totals to service_role;
