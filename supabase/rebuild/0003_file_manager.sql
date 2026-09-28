-- 0003 FILE MANAGER (RULES.md section 9): Active -> Archived -> Trash (90 days) -> deleted for good.
-- Archive takes a record out of everyday lists without losing it (archived reports still count in totals:
-- the work happened). Trash keeps it 90 days so it can be restored; then telgo_purge_trash() deletes it
-- for good, with its files. Nothing is ever deleted any other way. Safe to run more than once.

do $$
declare t text;
begin
  foreach t in array array['mobile_app_users', 'projects', 'pending_daily_reports', 'mobile_attendance', 'site_materials',
                           'app_files', 'chat_threads', 'chat_messages', 'mobile_live_locations', 'report_clarification_messages']
  loop
    execute format('alter table public.%I add column if not exists archived_at timestamptz', t);
    execute format('alter table public.%I add column if not exists archived_by uuid', t);
    execute format('alter table public.%I add column if not exists trashed_at timestamptz', t);
    execute format('alter table public.%I add column if not exists trashed_by uuid', t);
  end loop;
end $$;

-- a trashed or archived chat message leaves the chat at once (removed_at kept for the sender's own removal)
-- file manager lists
create index if not exists pdr_trash_idx on public.pending_daily_reports (trashed_at) where trashed_at is not null;
create index if not exists att_trash_idx on public.mobile_attendance (trashed_at) where trashed_at is not null;
create index if not exists files_trash_idx on public.app_files (trashed_at) where trashed_at is not null;

-- Move one record between Active, Archived and Trash. p_action: archive | unarchive | trash | restore.
-- Restore from Trash brings it back where it was (archived stays archived).
create or replace function public.telgo_fm_move(p_kind text, p_id text, p_action text, p_actor uuid)
returns jsonb language plpgsql as $$
declare
  tbl text;
  idcol text := 'id';
  cur record;
  res jsonb;
  refs int;
begin
  perform set_config('app.actor', p_actor::text, true);
  tbl := case p_kind
    when 'reports' then 'pending_daily_reports'
    when 'attendance' then 'mobile_attendance'
    when 'storage' then 'site_materials'
    when 'inventory' then 'site_materials'
    when 'changes' then 'inventory_changes'
    when 'files' then 'app_files'
    when 'chats' then 'chat_threads'
    when 'messages' then 'chat_messages'
    when 'projects' then 'projects'
    when 'people' then 'mobile_app_users'
    else null end;
  if tbl is null then raise exception 'Unknown section.' using errcode = '22023', hint = 'KIND'; end if;
  if p_action not in ('archive', 'unarchive', 'trash', 'restore') then raise exception 'Unknown action.' using errcode = '22023', hint = 'ACTION'; end if;
  if p_kind = 'people' and p_action in ('trash') then
    raise exception 'People are never put in the Trash: their reports and attendance must keep their name. Archive or block them instead.' using errcode = 'P0001', hint = 'PEOPLE_NO_TRASH';
  end if;
  if p_kind = 'people' and p_actor::text = p_id then
    raise exception 'You can''t archive your own login.' using errcode = 'P0001', hint = 'SELF';
  end if;
  -- (a record whose fields are all null counts as null in plpgsql, so the row's presence is its own column)
  execute format('select 1 as here, archived_at, trashed_at from public.%I where %I::text = $1 for update', tbl, idcol) into cur using p_id;
  if cur.here is null then raise exception 'That record doesn''t exist.' using errcode = 'P0002', hint = 'NOT_FOUND'; end if;

  if p_kind = 'projects' and p_action = 'trash' then
    select (select count(*) from public.pending_daily_reports r where r.project_id = p_id and r.trashed_at is null)
         + (select count(*) from public.mobile_attendance a where a.project_id = p_id and a.trashed_at is null)
         + (select count(*) from public.site_materials m where m.project_id = p_id and m.trashed_at is null)
      into refs;
    if refs > 0 then
      raise exception 'This project still has % reports, attendance or storage records. Archive the project instead, or move those to the Trash first.', refs
        using errcode = 'P0001', hint = 'PROJECT_IN_USE';
    end if;
  end if;

  if p_action = 'archive' then
    if cur.trashed_at is not null then raise exception 'It is in the Trash. Restore it first.' using errcode = 'P0001', hint = 'IN_TRASH'; end if;
    execute format('update public.%I set archived_at = now(), archived_by = $2 where %I::text = $1 and archived_at is null returning to_jsonb(%I.*)', tbl, idcol, tbl) into res using p_id, p_actor;
  elsif p_action = 'unarchive' then
    execute format('update public.%I set archived_at = null, archived_by = null where %I::text = $1 and archived_at is not null and trashed_at is null returning to_jsonb(%I.*)', tbl, idcol, tbl) into res using p_id;
  elsif p_action = 'trash' then
    execute format('update public.%I set trashed_at = now(), trashed_by = $2 where %I::text = $1 and trashed_at is null returning to_jsonb(%I.*)', tbl, idcol, tbl) into res using p_id, p_actor;
  else
    execute format('update public.%I set trashed_at = null, trashed_by = null where %I::text = $1 and trashed_at is not null returning to_jsonb(%I.*)', tbl, idcol, tbl) into res using p_id;
  end if;
  if res is null then raise exception 'Nothing changed: it was already %.', case p_action when 'archive' then 'archived' when 'unarchive' then 'active' when 'trash' then 'in the Trash' else 'restored' end using errcode = 'P0001', hint = 'NO_CHANGE'; end if;

  -- a person archived is also signed out everywhere
  if p_kind = 'people' and p_action = 'archive' then
    update public.app_sessions set revoked_at = now(), revoked_reason = 'archived' where user_id = p_id::uuid and revoked_at is null;
    update public.push_subscriptions set disabled_at = now() where user_id = p_id::uuid and disabled_at is null;
  end if;
  return res;
end $$;

-- Files whose record has been in the Trash for 90 days, or which are themselves 90 days in the Trash.
-- The server deletes these objects from storage, then calls telgo_purge_trash() for the rows.
create or replace function public.telgo_purge_files_due() returns table (id uuid, bucket text, path text)
language sql stable as $$
  select f.id, f.bucket, f.path from public.app_files f
  where (f.trashed_at is not null and f.trashed_at < now() - interval '90 days')
     or exists (select 1 from public.site_materials m where m.photo_file_id = f.id and m.trashed_at < now() - interval '90 days')
     or exists (select 1 from public.chat_messages c where c.file_id = f.id and c.trashed_at < now() - interval '90 days')
     or exists (select 1 from public.pending_daily_reports r where r.trashed_at < now() - interval '90 days'
                and r.details is not null and r.details::text like '%' || f.id::text || '%')
$$;

-- Deletes for good everything 90 days in the Trash (and what belongs to it). Returns what it removed.
create or replace function public.telgo_purge_trash(p_file_ids uuid[] default '{}')
returns jsonb language plpgsql as $$
declare cutoff timestamptz := now() - interval '90 days'; c jsonb := '{}'::jsonb; n int;
begin
  perform set_config('app.allow_hard_delete', 'on', true);

  delete from public.report_clarification_messages m using public.pending_daily_reports r
    where m.report_id = r.id and r.trashed_at < cutoff;
  delete from public.pending_daily_reports where trashed_at < cutoff; get diagnostics n = row_count; c := c || jsonb_build_object('reports', n);

  delete from public.mobile_live_locations l using public.mobile_attendance a where l.attendance_id = a.id and a.trashed_at < cutoff;
  delete from public.mobile_attendance where trashed_at < cutoff; get diagnostics n = row_count; c := c || jsonb_build_object('attendance', n);

  delete from public.chat_messages where trashed_at < cutoff
     or thread_id in (select id from public.chat_threads where trashed_at < cutoff);
  get diagnostics n = row_count; c := c || jsonb_build_object('messages', n);
  delete from public.chat_members where thread_id in (select id from public.chat_threads where trashed_at < cutoff);
  delete from public.chat_threads where trashed_at < cutoff; get diagnostics n = row_count; c := c || jsonb_build_object('chats', n);

  -- the photo reference goes first, then the material row
  delete from public.site_materials where trashed_at < cutoff; get diagnostics n = row_count; c := c || jsonb_build_object('storage', n);
  delete from public.projects where trashed_at < cutoff; get diagnostics n = row_count; c := c || jsonb_build_object('projects', n);

  -- file rows whose objects the server has already removed from storage
  if array_length(p_file_ids, 1) > 0 then
    update public.site_materials set photo_file_id = null where photo_file_id = any(p_file_ids);
    update public.mobile_app_users set avatar_file_id = null where avatar_file_id = any(p_file_ids);
    update public.chat_messages set file_id = null where file_id = any(p_file_ids);
    delete from public.app_files where id = any(p_file_ids); get diagnostics n = row_count; c := c || jsonb_build_object('files', n);
  end if;

  -- notifications cleared more than 90 days ago
  delete from public.mobile_notifications where cleared_at < cutoff; get diagnostics n = row_count; c := c || jsonb_build_object('notifications', n);
  delete from public.rate_events where at < now() - interval '1 day';
  return c;
end $$;

-- the ledger leaves out the Trash (archived reports still count: the work happened)
create or replace view public.v_ledger_daily as
select project_id, report_date, is_test,
  count(*)::int as reports,
  sum(labor_count)::int as workers,
  sum(coalesce(ot_hours_exact, ot_hours))::numeric as ot_hours,
  sum(calculated_wages)::numeric as wages,
  sum(fuel_expenses)::numeric as fuel,
  sum(travel_expenses)::numeric as travel,
  sum(room_rent)::numeric as room_rent,
  sum(tool_rent)::numeric as tool_rent,
  sum(other_expenses)::numeric as other,
  sum(excavation_length)::numeric as trenching_m,
  sum(hdd_length)::numeric as hdd_m,
  sum(cable_laying_length)::numeric as cable_laying_m,
  sum(cable_mounding_length)::numeric as cable_mounting_m,
  sum(joining_links_completed)::int as joints,
  sum(rmu_foundation_status)::int as rmu_foundations,
  sum(termination_endpoints)::int as terminations
from public.pending_daily_reports
where status = 'approved' and trashed_at is null
group by project_id, report_date, is_test;

-- lock what this file made (0001's rule)
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
  for r in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v')
      and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
  loop
    execute format('revoke all on table public.%I from anon, authenticated', r.relname);
  end loop;
end $$;
grant all on all tables in schema public to service_role;
