-- 0005 INVENTORY (owner, 28 Sep 2026) and the 12-hour sign-out.
-- Site storage becomes Inventory: items at a site (site_materials), and every later change to an item
-- (moved, used, fully used / closed) is a request the admin approves. Nothing about an item changes
-- until the admin says yes; each request and each decision is kept as the item's history.
-- Additive, safe to run more than once.

alter table public.site_materials add column if not exists description text;
alter table public.site_materials add column if not exists quantity_left numeric;
alter table public.site_materials add column if not exists location_lat numeric;
alter table public.site_materials add column if not exists location_lng numeric;
alter table public.site_materials add column if not exists status text not null default 'in_stock';
alter table public.site_materials add column if not exists closed_at timestamptz;
alter table public.site_materials add column if not exists last_change_at timestamptz;
alter table public.site_materials add column if not exists client_ref text;
create unique index if not exists site_materials_client_ref_idx on public.site_materials (client_ref) where client_ref is not null;
do $$ begin
  alter table public.site_materials add constraint site_materials_status_chk check (status in ('in_stock', 'closed')) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.site_materials add constraint site_materials_left_chk check (quantity_left is null or quantity_left >= 0) not valid;
exception when duplicate_object then null; end $$;

-- a new item starts with all of it left
create or replace function public.fn_material_new() returns trigger
language plpgsql as $$
begin
  if new.quantity_left is null then new.quantity_left := new.quantity; end if;
  select coalesce(u.is_test, false) into new.is_test from public.mobile_app_users u where u.id = new.created_by;
  return new;
end $$;
drop trigger if exists trg_material_new on public.site_materials;
create trigger trg_material_new before insert on public.site_materials for each row execute function public.fn_material_new();

-- the notification for a new item now says what and where
create or replace function public.fn_notify_material() returns trigger
language plpgsql as $$
declare pname text;
begin
  select name into pname from public.projects where id = new.project_id;
  perform public.telgo_notify_admins(new.created_by, new.is_test, 'Added to inventory',
    new.created_by_name || ' added ' || new.material
      || coalesce(' (' || trim(to_char(new.quantity, 'FM999999990.##')) || coalesce(' ' || new.unit, '') || ')', '')
      || ' at ' || coalesce(pname, new.project_id) || coalesce(', kept at ' || new.location, '') || '.',
    'inventory', 'inventory_item', new.id::text, '/app/inventory/item/' || new.id);
  return new;
end $$;

create table if not exists public.inventory_changes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.site_materials (id),
  kind text not null check (kind in ('moved', 'used', 'closed')),
  quantity_used numeric check (quantity_used is null or quantity_used > 0),
  new_location text,
  new_lat numeric,
  new_lng numeric,
  note text,
  photo_file_id uuid references public.app_files (id),
  requested_by uuid not null references public.mobile_app_users (id),
  requested_by_name text not null,
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid,
  decided_by_name text,
  decided_at timestamptz,
  decision_note text,
  client_ref text unique,
  is_test boolean not null default false,
  archived_at timestamptz, archived_by uuid, trashed_at timestamptz, trashed_by uuid
);
create index if not exists inventory_changes_item_idx on public.inventory_changes (item_id, requested_at desc);
create index if not exists inventory_changes_pending_idx on public.inventory_changes (requested_at) where status = 'pending';
-- one request at a time per item, so two approvals can never fight
create unique index if not exists inventory_changes_one_pending_idx on public.inventory_changes (item_id) where status = 'pending';

drop trigger if exists trg_no_delete on public.inventory_changes;
create trigger trg_no_delete before delete on public.inventory_changes for each row execute function public.fn_block_delete();
drop trigger if exists trg_audit on public.inventory_changes;
create trigger trg_audit after insert or update on public.inventory_changes for each row execute function public.fn_audit();

create or replace function public.fn_inventory_change_rules() returns trigger
language plpgsql as $$
declare it public.site_materials;
begin
  select * into it from public.site_materials where id = new.item_id;
  if not found or it.trashed_at is not null then raise exception 'That item doesn''t exist.' using errcode = 'P0002', hint = 'NOT_FOUND'; end if;
  if it.status = 'closed' then raise exception 'This item is closed (fully used).' using errcode = 'P0001', hint = 'ITEM_CLOSED'; end if;
  if new.kind = 'used' and new.quantity_used is null then raise exception 'Say how much was used.' using errcode = '22023', hint = 'QUANTITY'; end if;
  if new.kind = 'used' and it.quantity_left is not null and new.quantity_used > it.quantity_left then
    raise exception 'That is more than is left (% %).', trim(to_char(it.quantity_left, 'FM999999990.##')), coalesce(it.unit, '') using errcode = '22023', hint = 'QUANTITY';
  end if;
  if new.kind = 'moved' and coalesce(trim(new.new_location), '') = '' and new.new_lat is null then
    raise exception 'Say where it was moved to.' using errcode = '22023', hint = 'LOCATION';
  end if;
  new.is_test := it.is_test;
  return new;
end $$;
drop trigger if exists trg_rules on public.inventory_changes;
create trigger trg_rules before insert on public.inventory_changes for each row execute function public.fn_inventory_change_rules();

-- the admin is told what is asked, by whom and when; the asker is told the decision
create or replace function public.fn_notify_inventory_change() returns trigger
language plpgsql as $$
declare it public.site_materials; pname text; what text;
begin
  select * into it from public.site_materials where id = new.item_id;
  select name into pname from public.projects where id = it.project_id;
  what := case new.kind
    when 'moved' then 'moved ' || it.material || ' to ' || coalesce(new.new_location, 'a new place')
    when 'used' then 'used ' || trim(to_char(new.quantity_used, 'FM999999990.##')) || coalesce(' ' || it.unit, '') || ' of ' || it.material
    else 'says ' || it.material || ' is fully used (close it)' end;
  if tg_op = 'INSERT' then
    perform public.telgo_notify_admins(new.requested_by, new.is_test, 'Inventory change to approve',
      new.requested_by_name || ' ' || what || ' at ' || coalesce(pname, it.project_id) || ', '
        || to_char(new.requested_at at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI am') || '.',
      'inventory', 'inventory_item', it.id::text, '/app/inventory/item/' || it.id);
  elsif new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    perform public.telgo_notify_one(new.requested_by, new.decided_by,
      case when new.status = 'approved' then 'Inventory change approved' else 'Inventory change not approved' end,
      coalesce(new.decided_by_name, 'The admin') || case when new.status = 'approved' then ' approved: ' else ' did not approve: ' end
        || what || coalesce('. ' || new.decision_note, '') || '.',
      'inventory', 'inventory_item', it.id::text, '/app/inventory/item/' || it.id);
  end if;
  return new;
end $$;
drop trigger if exists trg_notify on public.inventory_changes;
create trigger trg_notify after insert or update of status on public.inventory_changes for each row execute function public.fn_notify_inventory_change();

-- the admin's decision, applied to the item in the same moment (or not at all)
create or replace function public.telgo_inventory_decide(p_change uuid, p_actor uuid, p_decision text, p_note text)
returns jsonb language plpgsql as $$
declare c public.inventory_changes; it public.site_materials; a public.mobile_app_users;
begin
  perform set_config('app.actor', p_actor::text, true);
  if p_decision not in ('approve', 'reject') then raise exception 'Unknown decision.' using errcode = '22023', hint = 'ACTION'; end if;
  select * into a from public.mobile_app_users where id = p_actor;
  select * into c from public.inventory_changes where id = p_change for update;
  if not found then raise exception 'That request doesn''t exist.' using errcode = 'P0002', hint = 'NOT_FOUND'; end if;
  if c.status <> 'pending' then raise exception 'This request was already decided.' using errcode = 'P0001', hint = 'NO_CHANGE'; end if;
  select * into it from public.site_materials where id = c.item_id for update;
  if p_decision = 'reject' and length(coalesce(trim(p_note), '')) < 2 then
    raise exception 'Say why it is not approved.' using errcode = '22023', hint = 'REASON';
  end if;
  if p_decision = 'approve' then
    if it.status = 'closed' then raise exception 'This item is already closed.' using errcode = 'P0001', hint = 'ITEM_CLOSED'; end if;
    if c.kind = 'moved' then
      update public.site_materials set location = coalesce(nullif(trim(c.new_location), ''), location),
        location_lat = coalesce(c.new_lat, location_lat), location_lng = coalesce(c.new_lng, location_lng), last_change_at = now()
        where id = it.id;
    elsif c.kind = 'used' then
      if it.quantity_left is not null and c.quantity_used > it.quantity_left then
        raise exception 'That is more than is left now.' using errcode = '22023', hint = 'QUANTITY';
      end if;
      update public.site_materials set quantity_left = case when quantity_left is null then null else quantity_left - c.quantity_used end,
        status = case when quantity_left is not null and quantity_left - c.quantity_used <= 0 then 'closed' else status end,
        closed_at = case when quantity_left is not null and quantity_left - c.quantity_used <= 0 then now() else closed_at end,
        last_change_at = now()
        where id = it.id;
    else
      update public.site_materials set status = 'closed', closed_at = now(), quantity_left = case when quantity_left is null then null else 0 end, last_change_at = now()
        where id = it.id;
    end if;
  end if;
  update public.inventory_changes set status = case when p_decision = 'approve' then 'approved' else 'rejected' end,
    decided_by = p_actor, decided_by_name = coalesce(a.full_name, 'Admin'), decided_at = now(), decision_note = nullif(trim(p_note), '')
    where id = c.id returning * into c;
  select * into it from public.site_materials where id = c.item_id;
  return jsonb_build_object('change', to_jsonb(c), 'item', to_jsonb(it));
end $$;

-- ---------------------------------------------------------------------------------------------
-- The 12-hour sign-out (owner): a shift left open for 12 hours is closed at the 12-hour mark;
-- the person and the admins are told. Run on every attendance and home request (for that person,
-- or everyone when the admin looks), so what the screen shows is always already closed.
-- ---------------------------------------------------------------------------------------------
create or replace function public.telgo_close_stale_shifts(p_user uuid default null) returns int
language plpgsql as $$
declare n int := 0; r record;
begin
  for r in select * from public.mobile_attendance
    where status = 'signed_in' and check_out_at is null and check_in_at < now() - interval '12 hours'
      and (p_user is null or mobile_user_id = p_user::text)
    for update skip locked
  loop
    update public.mobile_attendance set status = 'signed_out', check_out_at = r.check_in_at + interval '12 hours', closed_how = 'auto_12h' where id = r.id;
    if r.mobile_user_id ~ '^[0-9a-f-]{36}$' then
      perform public.telgo_notify_one(r.mobile_user_id::uuid, null, 'Signed out after 12 hours',
        'You didn''t sign out of ' || r.project_name || ', so the app closed your shift 12 hours after you signed in.', 'attendance', 'attendance', r.id::text, '/app/attendance/history');
    end if;
    perform public.telgo_notify_admins(null, r.is_test, 'Missed sign-out',
      r.user_name || ' didn''t sign out of ' || r.project_name || '; the app closed the shift after 12 hours.', 'attendance', 'attendance', r.id::text, '/app/team/attendance');
    n := n + 1;
  end loop;
  return n;
end $$;

-- sign in: a shift still open after 12 hours is closed first; a second open shift is refused
create or replace function public.telgo_sign_in(p_actor uuid, p_project text, p_lat numeric, p_lng numeric, p_acc numeric,
  p_dist numeric, p_within boolean, p_ref text)
returns jsonb language plpgsql as $$
declare u public.mobile_app_users; p public.projects; r public.mobile_attendance;
begin
  perform set_config('app.actor', p_actor::text, true);
  select * into u from public.mobile_app_users where id = p_actor;
  select * into p from public.projects where id = p_project and trashed_at is null;
  if not found then raise exception 'That project doesn''t exist.' using errcode = 'P0002', hint = 'NOT_FOUND'; end if;
  if p_ref is not null then
    select * into r from public.mobile_attendance where client_ref = p_ref;
    if found then return to_jsonb(r) || jsonb_build_object('repeat', true); end if;
  end if;
  perform public.telgo_close_stale_shifts(p_actor);
  if exists (select 1 from public.mobile_attendance where mobile_user_id = p_actor::text and status = 'signed_in' and check_out_at is null) then
    raise exception 'You are already signed in.' using errcode = 'P0001', hint = 'ALREADY_IN';
  end if;
  insert into public.mobile_attendance (mobile_user_id, user_name, user_login_id, user_role, project_id, project_name,
    latitude, longitude, gps_accuracy_m, distance_from_site_m, within_geofence, status, source, client_ref)
  values (p_actor::text, coalesce(u.full_name, ''), coalesce(u.login_id, ''), coalesce(u.role, ''), p.id, p.name,
    p_lat, p_lng, p_acc, p_dist, coalesce(p_within, false), 'signed_in', 'app_v2', p_ref)
  returning * into r;
  insert into public.mobile_live_locations (mobile_user_id, attendance_id, user_name, user_login_id, user_role, project_id,
    project_name, latitude, longitude, gps_accuracy_m, distance_from_site_m, within_geofence, source, is_test)
  values (p_actor::text, r.id, r.user_name, r.user_login_id, r.user_role, r.project_id, r.project_name,
    p_lat, p_lng, p_acc, p_dist, coalesce(p_within, false), 'sign_in', r.is_test);
  return to_jsonb(r);
end $$;

-- the File manager knows inventory requests too
create or replace function public.telgo_fm_kind_table(p_kind text) returns text
language sql immutable as $$
  select case p_kind
    when 'reports' then 'pending_daily_reports' when 'attendance' then 'mobile_attendance' when 'storage' then 'site_materials'
    when 'inventory' then 'site_materials' when 'changes' then 'inventory_changes' when 'files' then 'app_files'
    when 'chats' then 'chat_threads' when 'messages' then 'chat_messages' when 'projects' then 'projects' when 'people' then 'mobile_app_users'
    else null end
$$;

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
  for r in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
  loop
    execute format('alter table public.%I enable row level security', r.relname);
    execute format('revoke all on table public.%I from anon, authenticated', r.relname);
  end loop;
end $$;
grant all on all tables in schema public to service_role;

-- the 90-day clean-up now also removes an item's change requests (and their photos) with the item
create or replace function public.telgo_purge_files_due() returns table (id uuid, bucket text, path text)
language sql stable as $$
  select f.id, f.bucket, f.path from public.app_files f
  where (f.trashed_at is not null and f.trashed_at < now() - interval '90 days')
     or exists (select 1 from public.site_materials m where m.photo_file_id = f.id and m.trashed_at < now() - interval '90 days')
     or exists (select 1 from public.inventory_changes c join public.site_materials m on m.id = c.item_id
                where c.photo_file_id = f.id and (c.trashed_at < now() - interval '90 days' or m.trashed_at < now() - interval '90 days'))
     or exists (select 1 from public.chat_messages c where c.file_id = f.id and c.trashed_at < now() - interval '90 days')
     or exists (select 1 from public.pending_daily_reports r where r.trashed_at < now() - interval '90 days'
                and r.details is not null and r.details::text like '%' || f.id::text || '%')
$$;

create or replace function public.telgo_purge_trash(p_file_ids uuid[] default '{}')
returns jsonb language plpgsql as $$
declare cutoff timestamptz := now() - interval '90 days'; c jsonb := '{}'::jsonb; n int;
begin
  perform set_config('app.allow_hard_delete', 'on', true);
  delete from public.report_clarification_messages m using public.pending_daily_reports r where m.report_id = r.id and r.trashed_at < cutoff;
  delete from public.pending_daily_reports where trashed_at < cutoff; get diagnostics n = row_count; c := c || jsonb_build_object('reports', n);
  delete from public.mobile_live_locations l using public.mobile_attendance a where l.attendance_id = a.id and a.trashed_at < cutoff;
  delete from public.mobile_attendance where trashed_at < cutoff; get diagnostics n = row_count; c := c || jsonb_build_object('attendance', n);
  delete from public.chat_messages where trashed_at < cutoff or thread_id in (select id from public.chat_threads where trashed_at < cutoff);
  get diagnostics n = row_count; c := c || jsonb_build_object('messages', n);
  delete from public.chat_members where thread_id in (select id from public.chat_threads where trashed_at < cutoff);
  delete from public.chat_threads where trashed_at < cutoff; get diagnostics n = row_count; c := c || jsonb_build_object('chats', n);
  delete from public.inventory_changes where trashed_at < cutoff or item_id in (select id from public.site_materials where trashed_at < cutoff);
  get diagnostics n = row_count; c := c || jsonb_build_object('inventory_changes', n);
  delete from public.site_materials where trashed_at < cutoff; get diagnostics n = row_count; c := c || jsonb_build_object('inventory', n);
  delete from public.projects where trashed_at < cutoff; get diagnostics n = row_count; c := c || jsonb_build_object('projects', n);
  if array_length(p_file_ids, 1) > 0 then
    update public.site_materials set photo_file_id = null where photo_file_id = any(p_file_ids);
    update public.inventory_changes set photo_file_id = null where photo_file_id = any(p_file_ids);
    update public.mobile_app_users set avatar_file_id = null where avatar_file_id = any(p_file_ids);
    update public.chat_messages set file_id = null where file_id = any(p_file_ids);
    delete from public.app_files where id = any(p_file_ids); get diagnostics n = row_count; c := c || jsonb_build_object('files', n);
  end if;
  delete from public.mobile_notifications where cleared_at < cutoff; get diagnostics n = row_count; c := c || jsonb_build_object('notifications', n);
  delete from public.rate_events where at < now() - interval '1 day';
  return c;
end $$;
revoke all on function public.telgo_purge_files_due() from public, anon, authenticated;
revoke all on function public.telgo_purge_trash(uuid[]) from public, anon, authenticated;
grant execute on function public.telgo_purge_files_due() to service_role;
grant execute on function public.telgo_purge_trash(uuid[]) to service_role;
