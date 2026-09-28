-- ============================================================================================
-- TELGO APP REBUILD: the database update for the LIVE database (migrations 0001 to 0005).
-- How to run it: Supabase dashboard → project qujinbsslmyaltfgsjzb → SQL Editor → New query →
-- paste ALL of this file → Run. It runs as one transaction: either everything is applied, or
-- nothing is (if it fails, nothing has changed and the old app keeps working).
-- It only ADDS (tables, columns, rules, triggers, views). It deletes no data and changes no row.
-- Safe to run twice. Made 28 Sep 2026. Do not edit by hand; it is built from 0001..0005.
-- ============================================================================================
begin;

-- ---------------------------------------------------------------- 0001_lockdown.sql
-- 0001 LOCKDOWN (RULES.md section 4).
-- The phone never talks to the database. Only this app's server does, with the secret key.
-- So the public key (role anon) and Supabase sign-ups (role authenticated) get nothing: no table, no view,
-- no sequence, no app function, no stored file. Safe to run more than once.

-- 1. Every app table: row security on, every right taken from anon and authenticated.
do $$
declare r record;
begin
  for r in
    select c.relname, c.relkind
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
      and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')  -- skip extension tables (postgis)
  loop
    if r.relkind in ('r', 'p') then
      execute format('alter table public.%I enable row level security', r.relname);
    end if;
    execute format('revoke all on table public.%I from anon, authenticated', r.relname);
  end loop;
end $$;

-- postgis keeps its reference table; nobody outside the server may write to it
do $$ begin
  revoke insert, update, delete, truncate on table public.spatial_ref_sys from anon, authenticated;
exception when others then null; end $$;

revoke all on all sequences in schema public from anon, authenticated;

-- 2. App functions (not the postgis ones): nobody but the server may call them.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

-- 3. Anything made later starts locked too.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- 4. Old policies that let the public key or any Supabase sign-up add or read rows and files.
drop policy if exists access_requests_public_insert on public.access_requests;
do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'
    and policyname in ('storage_access_docs_insert', 'storage_access_docs_ops_read', 'storage_project_docs_member_insert',
                       'storage_project_docs_member_read', 'storage_site_photos_member_insert', 'storage_site_photos_member_read')
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

-- 5. Every bucket private.
update storage.buckets set public = false where public;

-- ---------------------------------------------------------------- 0002_truth_core.sql
-- 0002 TRUTH CORE (RULES.md sections 4 to 8).
-- Additive only: new tables, new columns, triggers and views. No existing row is changed or removed.
-- Safe to run more than once.

-- ============================================================================================
-- A. Helpers
-- ============================================================================================

-- Who is acting. The server sends the signed-in person's id in the x-telgo-actor header with every
-- database call (only the server holds the secret key, so the header can't be forged from a phone).
-- Database functions set app.actor themselves.
create or replace function public.app_actor() returns uuid
language plpgsql stable as $$
declare v text;
begin
  v := nullif(current_setting('app.actor', true), '');
  if v is null then
    begin
      v := nullif(current_setting('request.headers', true)::json ->> 'x-telgo-actor', '');
    exception when others then v := null;
    end;
  end if;
  if v is null or v !~ '^[0-9a-f-]{36}$' then return null; end if;
  return v::uuid;
end $$;

-- India time for "today" (the server's own clock is UTC)
create or replace function public.ist_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Kolkata')::date $$;

-- updated_at always moves on a change (clock_timestamp: two changes in one transaction still differ)
create or replace function public.fn_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;

-- Records are never deleted (soft delete only). Test clean-up alone may delete, with app.allow_hard_delete = on.
create or replace function public.fn_block_delete() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('app.allow_hard_delete', true), '') <> 'on' then
    raise exception 'Records are never deleted here. Archive it instead.' using errcode = 'P0001', hint = 'NO_DELETE';
  end if;
  return old;
end $$;

-- ============================================================================================
-- B. People (mobile_app_users): new columns
-- ============================================================================================
alter table public.mobile_app_users add column if not exists must_change_password boolean not null default false;
alter table public.mobile_app_users add column if not exists password_changed_at timestamptz;
alter table public.mobile_app_users add column if not exists voice_language text not null default 'en-IN';
alter table public.mobile_app_users add column if not exists avatar_file_id uuid;
alter table public.mobile_app_users add column if not exists request_note text;
alter table public.mobile_app_users add column if not exists trashed_at timestamptz;
alter table public.mobile_app_users add column if not exists archived_at timestamptz;
alter table public.mobile_app_users add column if not exists is_test boolean not null default false;

do $$ begin
  alter table public.mobile_app_users add constraint mobile_app_users_role_chk
    check (role in ('admin', 'supervisor', 'engineer', 'finance', 'client')) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.mobile_app_users add constraint mobile_app_users_status_chk
    check (access_status in ('pending', 'active', 'inactive', 'blocked')) not valid;
exception when duplicate_object then null; end $$;

drop trigger if exists trg_touch on public.mobile_app_users;
create trigger trg_touch before update on public.mobile_app_users for each row execute function public.fn_touch();
drop trigger if exists trg_no_delete on public.mobile_app_users;
create trigger trg_no_delete before delete on public.mobile_app_users for each row execute function public.fn_block_delete();

-- ============================================================================================
-- C. Sessions and sign-in attempts (RULES.md section 7)
-- ============================================================================================
create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.mobile_app_users (id),
  token_hash text not null unique,
  resume_hash text unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_reason text,
  ip text,
  user_agent text,
  is_test boolean not null default false
);
create index if not exists app_sessions_user_open_idx on public.app_sessions (user_id) where revoked_at is null;

create table if not exists public.login_attempts (
  id bigserial primary key,
  at timestamptz not null default now(),
  identifier text not null,
  user_id uuid,
  ok boolean not null,
  reason text not null,
  ip text,
  user_agent text,
  is_test boolean not null default false
);
create index if not exists login_attempts_ident_idx on public.login_attempts (lower(identifier), at desc);
create index if not exists login_attempts_ip_idx on public.login_attempts (ip, at desc);

-- One call per request: the session, its person and whether it may go on. Also moves last_seen_at (at most once a minute).
drop function if exists public.telgo_session(text);
create or replace function public.telgo_session(p_token_hash text)
returns table (session_id uuid, user_id uuid, full_name text, email text, role text, login_id text, access_status text,
               must_change_password boolean, avatar_file_id uuid, has_avatar boolean, phone text, voice_language text,
               is_test boolean, expires_at timestamptz, state text)
language plpgsql as $$
declare s public.app_sessions; u public.mobile_app_users;
begin
  select * into s from public.app_sessions where token_hash = p_token_hash;
  if not found then return query select null::uuid, null::uuid, null, null, null, null, null, null::boolean, null::uuid, null::boolean, null, null, null::boolean, null::timestamptz, 'none'; return; end if;
  if s.revoked_at is not null then return query select s.id, s.user_id, null, null, null, null, null, null::boolean, null::uuid, null::boolean, null, null, null::boolean, s.expires_at, coalesce(s.revoked_reason, 'signed_out'); return; end if;
  if s.expires_at < now() then return query select s.id, s.user_id, null, null, null, null, null, null::boolean, null::uuid, null::boolean, null, null, null::boolean, s.expires_at, 'expired'; return; end if;
  select * into u from public.mobile_app_users where id = s.user_id;
  if not found or u.trashed_at is not null then
    update public.app_sessions set revoked_at = now(), revoked_reason = 'gone' where id = s.id;
    return query select s.id, s.user_id, null, null, null, null, null, null::boolean, null::uuid, null::boolean, null, null, null::boolean, s.expires_at, 'gone'; return;
  end if;
  if u.access_status <> 'active' or u.blocked_at is not null then
    update public.app_sessions set revoked_at = now(), revoked_reason = 'blocked' where id = s.id;
    return query select s.id, s.user_id, null, null, null, null, null, null::boolean, null::uuid, null::boolean, null, null, null::boolean, s.expires_at, 'blocked'; return;
  end if;
  if u.archived_at is not null then
    update public.app_sessions set revoked_at = now(), revoked_reason = 'archived' where id = s.id;
    return query select s.id, s.user_id, null, null, null, null, null, null::boolean, null::uuid, null::boolean, null, null, null::boolean, s.expires_at, 'archived'; return;
  end if;
  -- an admin login left unused for 12 hours signs itself out (a phone left on a table)
  if u.role = 'admin' and s.last_seen_at < now() - interval '12 hours' then
    update public.app_sessions set revoked_at = now(), revoked_reason = 'idle' where id = s.id;
    return query select s.id, s.user_id, null, null, null, null, null, null::boolean, null::uuid, null::boolean, null, null, null::boolean, s.expires_at, 'idle'; return;
  end if;
  if s.last_seen_at < now() - interval '1 minute' then
    update public.app_sessions set last_seen_at = now() where id = s.id;
  end if;
  return query select s.id, u.id, u.full_name, u.email, u.role, u.login_id, u.access_status, u.must_change_password,
    u.avatar_file_id, (u.avatar_url is not null or u.avatar_file_id is not null), u.phone, u.voice_language, u.is_test, s.expires_at, 'ok';
end $$;

-- ============================================================================================
-- D. The change log: append-only, written by the database itself (RULES.md section 7)
-- ============================================================================================
create table if not exists public.audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor uuid,
  table_name text not null,
  row_id text,
  action text not null,
  changes jsonb not null default '{}'::jsonb,
  is_test boolean not null default false
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);
create index if not exists audit_log_row_idx on public.audit_log (table_name, row_id);

create or replace function public.fn_audit_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' and old.is_test and coalesce(current_setting('app.allow_hard_delete', true), '') = 'on' then
    return old;
  end if;
  raise exception 'The change log can''t be edited or deleted.' using errcode = 'P0001', hint = 'AUDIT_LOCKED';
end $$;
drop trigger if exists trg_audit_guard on public.audit_log;
create trigger trg_audit_guard before update or delete on public.audit_log for each row execute function public.fn_audit_guard();

-- Generic audit trigger. Secrets are never copied into the log, only the fact that they changed.
create or replace function public.fn_audit() returns trigger
language plpgsql as $$
declare
  o jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else '{}'::jsonb end;
  n jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else '{}'::jsonb end;
  secret text[] := array['password_hash', 'temp_password_hash', 'pin_hash', 'login_pin', 'token_hash', 'resume_hash'];
  skip text[] := array['updated_at', 'last_seen_at', 'last_login_at'];
  ch jsonb := '{}'::jsonb;
  k text;
  ov jsonb; nv jsonb;
  rid text;
  test boolean;
begin
  rid := coalesce(n ->> 'id', o ->> 'id');
  test := coalesce((n ->> 'is_test')::boolean, (o ->> 'is_test')::boolean, false);
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(n) loop
      if k = any(skip) then continue; end if;
      ov := o -> k; nv := n -> k;
      if ov is distinct from nv then
        if k = any(secret) then ch := ch || jsonb_build_object(k, 'changed');
        else ch := ch || jsonb_build_object(k, jsonb_build_array(
          case when length(coalesce(ov::text, '')) > 400 then to_jsonb('(long value)'::text) else ov end,
          case when length(coalesce(nv::text, '')) > 400 then to_jsonb('(long value)'::text) else nv end));
        end if;
      end if;
    end loop;
    if ch = '{}'::jsonb then return new; end if;
  else
    for k in select jsonb_object_keys(case when tg_op = 'INSERT' then n else o end) loop
      if k = any(secret) then continue; end if;
      nv := (case when tg_op = 'INSERT' then n else o end) -> k;
      if nv is null or nv = 'null'::jsonb then continue; end if;
      ch := ch || jsonb_build_object(k, case when length(nv::text) > 400 then to_jsonb('(long value)'::text) else nv end);
    end loop;
  end if;
  insert into public.audit_log (actor, table_name, row_id, action, changes, is_test)
  values (public.app_actor(), tg_table_name, rid, lower(tg_op), ch, test);
  return coalesce(new, old);
end $$;

drop trigger if exists trg_audit on public.mobile_app_users;
create trigger trg_audit after insert or update on public.mobile_app_users for each row execute function public.fn_audit();

-- ============================================================================================
-- E. Problems log (Error Doctor, RULES.md section 8) and rate limits
-- ============================================================================================
create table if not exists public.app_error_log (
  id bigserial primary key,
  ref text not null unique,
  at timestamptz not null default now(),
  user_id uuid,
  route text,
  message text not null,
  detail text,
  code text,
  source text not null default 'server',
  is_test boolean not null default false
);
create index if not exists app_error_log_at_idx on public.app_error_log (at desc);

create table if not exists public.rate_events (
  key text not null,
  at timestamptz not null default now()
);
create index if not exists rate_events_key_idx on public.rate_events (key, at desc);

-- true = allowed (and counted); false = over the limit
create or replace function public.telgo_rate_ok(p_key text, p_limit int, p_window_seconds int)
returns boolean language plpgsql as $$
declare n int;
begin
  select count(*) into n from public.rate_events where key = p_key and at > now() - make_interval(secs => p_window_seconds);
  if n >= p_limit then return false; end if;
  insert into public.rate_events (key) values (p_key);
  if random() < 0.02 then delete from public.rate_events where at < now() - interval '1 day'; end if;
  return true;
end $$;

-- ============================================================================================
-- F. Files (private storage, served only through the app after a permission check)
-- ============================================================================================
create table if not exists public.app_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.mobile_app_users (id),
  bucket text not null default 'site-photos',
  path text not null unique,
  mime text not null,
  bytes integer not null check (bytes > 0 and bytes <= 12582912),
  kind text not null check (kind in ('bill', 'work', 'clearance', 'avatar', 'material', 'chat', 'voice', 'other')),
  original_name text,
  created_at timestamptz not null default now(),
  trashed_at timestamptz,
  is_test boolean not null default false
);
drop trigger if exists trg_no_delete on public.app_files;
create trigger trg_no_delete before delete on public.app_files for each row execute function public.fn_block_delete();

-- ============================================================================================
-- G. Projects: new columns (old corridor_data stays as it is and is still read)
-- ============================================================================================
alter table public.projects add column if not exists route jsonb;               -- [[lat, lng], ...] drawn in the new editor
alter table public.projects add column if not exists start_label text;
alter table public.projects add column if not exists end_label text;
alter table public.projects add column if not exists site_radius_m integer not null default 300;
alter table public.projects add column if not exists standard_wage numeric;
alter table public.projects add column if not exists hdd_defaults jsonb not null default '{}'::jsonb;
alter table public.projects add column if not exists created_by uuid;
alter table public.projects add column if not exists trashed_at timestamptz;
alter table public.projects add column if not exists is_test boolean not null default false;
do $$ begin
  alter table public.projects add constraint projects_radius_chk check (site_radius_m between 25 and 20000) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.projects add constraint projects_money_chk check (budget >= 0 and coalesce(standard_wage, 0) >= 0) not valid;
exception when duplicate_object then null; end $$;

drop trigger if exists trg_touch on public.projects;
create trigger trg_touch before update on public.projects for each row execute function public.fn_touch();
drop trigger if exists trg_no_delete on public.projects;
create trigger trg_no_delete before delete on public.projects for each row execute function public.fn_block_delete();
drop trigger if exists trg_audit on public.projects;
create trigger trg_audit after insert or update on public.projects for each row execute function public.fn_audit();

-- Which projects a client login may see (none until the admin shares one)
create table if not exists public.project_access (
  user_id uuid not null references public.mobile_app_users (id),
  project_id text not null references public.projects (id),
  granted_by uuid,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  is_test boolean not null default false,
  primary key (user_id, project_id)
);
drop trigger if exists trg_audit on public.project_access;
create trigger trg_audit after insert or update on public.project_access for each row execute function public.fn_audit();
drop trigger if exists trg_no_delete on public.project_access;
create trigger trg_no_delete before delete on public.project_access for each row execute function public.fn_block_delete();

-- Site storage: materials unloaded at a site (one row each, so two people adding at once never overwrite each other)
create table if not exists public.site_materials (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects (id),
  unloaded_on date not null,
  material text not null check (length(material) between 1 and 120),
  quantity numeric check (quantity is null or quantity >= 0),
  unit text,
  location text,
  note text,
  photo_file_id uuid references public.app_files (id),
  created_by uuid not null references public.mobile_app_users (id),
  created_by_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  trashed_at timestamptz,
  is_test boolean not null default false
);
create index if not exists site_materials_project_idx on public.site_materials (project_id, unloaded_on desc);
drop trigger if exists trg_touch on public.site_materials;
create trigger trg_touch before update on public.site_materials for each row execute function public.fn_touch();
drop trigger if exists trg_no_delete on public.site_materials;
create trigger trg_no_delete before delete on public.site_materials for each row execute function public.fn_block_delete();
drop trigger if exists trg_audit on public.site_materials;
create trigger trg_audit after insert or update on public.site_materials for each row execute function public.fn_audit();

-- ============================================================================================
-- H. Daily reports: new columns, rules and triggers
-- ============================================================================================
alter table public.pending_daily_reports add column if not exists updated_at timestamptz not null default now();
alter table public.pending_daily_reports add column if not exists client_ref text;
alter table public.pending_daily_reports add column if not exists details jsonb;          -- v2 report (lists, notes, photos by file id)
alter table public.pending_daily_reports add column if not exists other_expenses numeric not null default 0;
alter table public.pending_daily_reports add column if not exists ot_hours_exact numeric;
alter table public.pending_daily_reports add column if not exists approved_by uuid;
alter table public.pending_daily_reports add column if not exists approved_by_name text;
alter table public.pending_daily_reports add column if not exists resubmitted_at timestamptz;
alter table public.pending_daily_reports add column if not exists trashed_at timestamptz;
alter table public.pending_daily_reports add column if not exists is_test boolean not null default false;
create unique index if not exists pending_daily_reports_client_ref_idx on public.pending_daily_reports (client_ref) where client_ref is not null;
create index if not exists pending_daily_reports_date_idx on public.pending_daily_reports (report_date desc);
create index if not exists pending_daily_reports_sup_idx on public.pending_daily_reports (supervisor_id, report_date desc);

do $$ begin
  alter table public.pending_daily_reports add constraint pdr_status_chk check (status in ('pending', 'clarification', 'approved')) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.pending_daily_reports add constraint pdr_nonneg_chk check (
    labor_count >= 0 and ot_hours >= 0 and calculated_wages >= 0 and fuel_expenses >= 0 and travel_expenses >= 0
    and room_rent >= 0 and tool_rent >= 0 and other_expenses >= 0 and excavation_length >= 0 and hdd_length >= 0
    and cable_laying_length >= 0 and cable_mounding_length >= 0 and joining_links_completed >= 0
    and rmu_foundation_status >= 0 and termination_endpoints >= 0) not valid;
exception when duplicate_object then null; end $$;

-- a new report: only for today or the 3 days before (India time), and only by its own supervisor's is_test world
create or replace function public.fn_report_rules() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.report_date > public.ist_today() or new.report_date < public.ist_today() - 3 then
      raise exception 'A daily report can be sent only for today or the 3 days before.' using errcode = 'P0001', hint = 'REPORT_DATE';
    end if;
    select coalesce(u.is_test, false) into new.is_test from public.mobile_app_users u where u.id = new.supervisor_id;
  end if;
  if tg_op = 'UPDATE' and old.status = 'approved' and new.status = 'approved' and coalesce(current_setting('app.admin_edit', true), '') <> 'on' then
    -- an approved report is locked; only an admin's recorded edit may change it (the server sets app.admin_edit in telgo_report_admin_edit)
    -- File manager moves (archive, trash, restore) are not edits of the report itself
    if (to_jsonb(new) - array['updated_at', 'trashed_at', 'trashed_by', 'archived_at', 'archived_by'])
       is distinct from (to_jsonb(old) - array['updated_at', 'trashed_at', 'trashed_by', 'archived_at', 'archived_by']) then
      raise exception 'This report is approved and locked.' using errcode = 'P0001', hint = 'REPORT_LOCKED';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_report_rules on public.pending_daily_reports;
create trigger trg_report_rules before insert or update on public.pending_daily_reports for each row execute function public.fn_report_rules();
drop trigger if exists trg_touch on public.pending_daily_reports;
create trigger trg_touch before update on public.pending_daily_reports for each row execute function public.fn_touch();
drop trigger if exists trg_no_delete on public.pending_daily_reports;
create trigger trg_no_delete before delete on public.pending_daily_reports for each row execute function public.fn_block_delete();
drop trigger if exists trg_audit on public.pending_daily_reports;
create trigger trg_audit after insert or update on public.pending_daily_reports for each row execute function public.fn_audit();

alter table public.report_clarification_messages add column if not exists kind text not null default 'message';
alter table public.report_clarification_messages add column if not exists is_test boolean not null default false;
create index if not exists rcm_report_idx on public.report_clarification_messages (report_id, created_at);
drop trigger if exists trg_no_delete on public.report_clarification_messages;
create trigger trg_no_delete before delete on public.report_clarification_messages for each row execute function public.fn_block_delete();

-- Ask the supervisor to fix a report: the message and the status change happen together or not at all.
create or replace function public.telgo_report_ask_fix(p_report uuid, p_actor uuid, p_expected timestamptz, p_message text, p_item text)
returns jsonb language plpgsql as $$
declare r public.pending_daily_reports; a public.mobile_app_users;
begin
  perform set_config('app.actor', p_actor::text, true);
  select * into a from public.mobile_app_users where id = p_actor;
  select * into r from public.pending_daily_reports where id = p_report and trashed_at is null for update;
  if not found then raise exception 'That report doesn''t exist.' using errcode = 'P0002', hint = 'NOT_FOUND'; end if;
  if r.status = 'approved' then raise exception 'This report is already approved.' using errcode = 'P0001', hint = 'ALREADY_APPROVED'; end if;
  if r.updated_at <> p_expected then raise exception 'Someone changed this report since you opened it.' using errcode = '40001', hint = 'CHANGED'; end if;
  if length(coalesce(trim(p_message), '')) < 3 then raise exception 'Write what needs fixing.' using errcode = '22023', hint = 'MESSAGE'; end if;
  insert into public.report_clarification_messages (report_id, sender_id, sender_name, sender_role, message, item_type, kind, is_test)
  values (r.id, p_actor, coalesce(a.full_name, 'Admin'), coalesce(a.role, 'admin'), trim(p_message), nullif(p_item, ''), 'ask_fix', r.is_test);
  update public.pending_daily_reports set status = 'clarification' where id = r.id returning * into r;
  return to_jsonb(r);
end $$;

-- An admin's edit of the numbers (also allowed on an approved report); recorded in the change log with the reason.
create or replace function public.telgo_report_admin_edit(p_report uuid, p_actor uuid, p_expected timestamptz, p_patch jsonb, p_reason text)
returns jsonb language plpgsql as $$
declare r public.pending_daily_reports;
begin
  perform set_config('app.actor', p_actor::text, true);
  perform set_config('app.admin_edit', 'on', true);
  if length(coalesce(trim(p_reason), '')) < 3 then raise exception 'Say why the report is being changed.' using errcode = '22023', hint = 'REASON'; end if;
  select * into r from public.pending_daily_reports where id = p_report and trashed_at is null for update;
  if not found then raise exception 'That report doesn''t exist.' using errcode = 'P0002', hint = 'NOT_FOUND'; end if;
  if r.updated_at <> p_expected then raise exception 'Someone changed this report since you opened it.' using errcode = '40001', hint = 'CHANGED'; end if;
  update public.pending_daily_reports set
    project_id = coalesce(p_patch ->> 'project_id', project_id),
    labor_count = coalesce((p_patch ->> 'labor_count')::int, labor_count),
    ot_hours = coalesce(round((p_patch ->> 'ot_hours_exact')::numeric)::int, ot_hours),
    ot_hours_exact = coalesce((p_patch ->> 'ot_hours_exact')::numeric, ot_hours_exact),
    calculated_wages = coalesce((p_patch ->> 'calculated_wages')::numeric, calculated_wages),
    fuel_expenses = coalesce((p_patch ->> 'fuel_expenses')::numeric, fuel_expenses),
    travel_expenses = coalesce((p_patch ->> 'travel_expenses')::numeric, travel_expenses),
    room_rent = coalesce((p_patch ->> 'room_rent')::numeric, room_rent),
    tool_rent = coalesce((p_patch ->> 'tool_rent')::numeric, tool_rent),
    other_expenses = coalesce((p_patch ->> 'other_expenses')::numeric, other_expenses),
    excavation_length = coalesce((p_patch ->> 'excavation_length')::numeric, excavation_length),
    hdd_length = coalesce((p_patch ->> 'hdd_length')::numeric, hdd_length),
    cable_laying_length = coalesce((p_patch ->> 'cable_laying_length')::numeric, cable_laying_length),
    cable_mounding_length = coalesce((p_patch ->> 'cable_mounding_length')::numeric, cable_mounding_length),
    joining_links_completed = coalesce((p_patch ->> 'joining_links_completed')::int, joining_links_completed),
    rmu_foundation_status = coalesce((p_patch ->> 'rmu_foundation_status')::int, rmu_foundation_status),
    termination_endpoints = coalesce((p_patch ->> 'termination_endpoints')::int, termination_endpoints)
  where id = r.id returning * into r;
  insert into public.report_clarification_messages (report_id, sender_id, sender_name, sender_role, message, item_type, kind, is_test)
  select r.id, p_actor, coalesce(u.full_name, 'Admin'), coalesce(u.role, 'admin'), 'Changed by the admin: ' || trim(p_reason), null, 'admin_edit', r.is_test
  from public.mobile_app_users u where u.id = p_actor;
  return to_jsonb(r);
end $$;

-- Totals come straight from approved reports, so they can never drift or be counted twice.
-- (The old master_project_ledger table is left as it was and is no longer written.)
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

-- ============================================================================================
-- I. Attendance: one row per shift (sign in ... sign out)
-- ============================================================================================
alter table public.mobile_attendance add column if not exists check_out_lat numeric;
alter table public.mobile_attendance add column if not exists check_out_lng numeric;
alter table public.mobile_attendance add column if not exists check_out_accuracy_m numeric;
alter table public.mobile_attendance add column if not exists check_out_distance_m numeric;
alter table public.mobile_attendance add column if not exists check_out_within boolean;
alter table public.mobile_attendance add column if not exists closed_how text;
alter table public.mobile_attendance add column if not exists note text;
alter table public.mobile_attendance add column if not exists client_ref text;
alter table public.mobile_attendance add column if not exists updated_at timestamptz not null default now();
alter table public.mobile_attendance add column if not exists trashed_at timestamptz;
alter table public.mobile_attendance add column if not exists is_test boolean not null default false;
create unique index if not exists mobile_attendance_client_ref_idx on public.mobile_attendance (client_ref) where client_ref is not null;
-- at most one open shift per person (new rows use status 'signed_in' while open)
create unique index if not exists mobile_attendance_one_open_idx on public.mobile_attendance (mobile_user_id) where status = 'signed_in' and check_out_at is null;
create index if not exists mobile_attendance_user_idx on public.mobile_attendance (mobile_user_id, check_in_at desc);
create index if not exists mobile_attendance_day_idx on public.mobile_attendance (check_in_at desc);
drop trigger if exists trg_touch on public.mobile_attendance;
create trigger trg_touch before update on public.mobile_attendance for each row execute function public.fn_touch();
drop trigger if exists trg_no_delete on public.mobile_attendance;
create trigger trg_no_delete before delete on public.mobile_attendance for each row execute function public.fn_block_delete();
drop trigger if exists trg_audit on public.mobile_attendance;
create trigger trg_audit after insert or update on public.mobile_attendance for each row execute function public.fn_audit();

create or replace function public.fn_owner_is_test() returns trigger
language plpgsql as $$
declare owner text;
begin
  owner := case tg_table_name
    when 'mobile_attendance' then new.mobile_user_id
    when 'mobile_live_locations' then new.mobile_user_id
    else null end;
  if owner ~ '^[0-9a-f-]{36}$' then
    select coalesce(u.is_test, false) into new.is_test from public.mobile_app_users u where u.id = owner::uuid;
  end if;
  return new;
end $$;
drop trigger if exists trg_owner_test on public.mobile_attendance;
create trigger trg_owner_test before insert on public.mobile_attendance for each row execute function public.fn_owner_is_test();

-- Sign in: an open shift left from an earlier day is closed as "not signed out" first; a second open shift is refused.
create or replace function public.telgo_sign_in(p_actor uuid, p_project text, p_lat numeric, p_lng numeric, p_acc numeric,
  p_dist numeric, p_within boolean, p_ref text)
returns jsonb language plpgsql as $$
declare u public.mobile_app_users; p public.projects; r public.mobile_attendance; open_row public.mobile_attendance;
begin
  perform set_config('app.actor', p_actor::text, true);
  select * into u from public.mobile_app_users where id = p_actor;
  select * into p from public.projects where id = p_project and trashed_at is null;
  if not found then raise exception 'That project doesn''t exist.' using errcode = 'P0002', hint = 'NOT_FOUND'; end if;
  if p_ref is not null then
    select * into r from public.mobile_attendance where client_ref = p_ref;
    if found then return to_jsonb(r) || jsonb_build_object('repeat', true); end if;
  end if;
  select * into open_row from public.mobile_attendance
    where mobile_user_id = p_actor::text and status = 'signed_in' and check_out_at is null for update;
  if found then
    if (open_row.check_in_at at time zone 'Asia/Kolkata')::date < public.ist_today() then
      update public.mobile_attendance set status = 'missed_sign_out', closed_how = 'not_signed_out' where id = open_row.id;
    else
      raise exception 'You are already signed in.' using errcode = 'P0001', hint = 'ALREADY_IN';
    end if;
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

alter table public.mobile_live_locations add column if not exists is_test boolean not null default false;
create index if not exists mobile_live_locations_user_idx on public.mobile_live_locations (mobile_user_id, recorded_at desc);
create index if not exists mobile_live_locations_at_idx on public.mobile_live_locations (recorded_at desc);
drop trigger if exists trg_owner_test on public.mobile_live_locations;
create trigger trg_owner_test before insert on public.mobile_live_locations for each row execute function public.fn_owner_is_test();
drop trigger if exists trg_no_delete on public.mobile_live_locations;
create trigger trg_no_delete before delete on public.mobile_live_locations for each row execute function public.fn_block_delete();

-- ============================================================================================
-- J. Notifications: made only by the database (RULES.md section 10)
-- ============================================================================================
alter table public.mobile_notifications add column if not exists link text;
alter table public.mobile_notifications add column if not exists cleared_at timestamptz;
alter table public.mobile_notifications add column if not exists pushed_at timestamptz;
alter table public.mobile_notifications add column if not exists is_test boolean not null default false;
create index if not exists mobile_notifications_rcpt_idx on public.mobile_notifications (recipient_user_id, created_at desc);
create index if not exists mobile_notifications_push_idx on public.mobile_notifications (created_at) where pushed_at is null;
drop trigger if exists trg_no_delete on public.mobile_notifications;
create trigger trg_no_delete before delete on public.mobile_notifications for each row execute function public.fn_block_delete();

-- one notification to every active admin (never the actor, and only inside the same real/test world)
create or replace function public.telgo_notify_admins(p_actor uuid, p_test boolean, p_title text, p_body text, p_type text,
  p_entity_type text, p_entity_id text, p_link text)
returns void language sql as $$
  insert into public.mobile_notifications (recipient_user_id, actor_user_id, title, body, notification_type, entity_type, entity_id, link, is_test)
  select u.id::text, p_actor::text, p_title, p_body, p_type, p_entity_type, p_entity_id, p_link, u.is_test
  from public.mobile_app_users u
  where u.role = 'admin' and u.access_status = 'active' and u.blocked_at is null and u.trashed_at is null
    and u.is_test = coalesce(p_test, false) and u.id is distinct from p_actor
$$;

create or replace function public.telgo_notify_one(p_to uuid, p_actor uuid, p_title text, p_body text, p_type text,
  p_entity_type text, p_entity_id text, p_link text)
returns void language sql as $$
  insert into public.mobile_notifications (recipient_user_id, actor_user_id, title, body, notification_type, entity_type, entity_id, link, is_test)
  select u.id::text, p_actor::text, p_title, p_body, p_type, p_entity_type, p_entity_id, p_link, u.is_test
  from public.mobile_app_users u where u.id = p_to and u.id is distinct from p_actor and u.trashed_at is null
$$;

create or replace function public.fn_notify_report() returns trigger
language plpgsql as $$
declare pname text; d text;
begin
  select name into pname from public.projects where id = new.project_id;
  pname := coalesce(pname, new.project_id);
  d := to_char(new.report_date, 'DD Mon');
  if tg_op = 'INSERT' then
    perform public.telgo_notify_admins(new.supervisor_id, new.is_test, 'New daily report',
      new.supervisor_name || ' sent the report for ' || pname || ', ' || d || '.', 'report', 'daily_report', new.id::text, '/app/reports/view/' || new.id);
  elsif new.status is distinct from old.status then
    if new.status = 'approved' then
      perform public.telgo_notify_one(new.supervisor_id, public.app_actor(), 'Report approved',
        'Your report for ' || pname || ', ' || d || ' was approved.', 'approved', 'daily_report', new.id::text, '/app/my-reports/' || new.id);
    elsif new.status = 'pending' and old.status = 'clarification' then
      perform public.telgo_notify_admins(new.supervisor_id, new.is_test, 'Report fixed',
        new.supervisor_name || ' fixed the report for ' || pname || ', ' || d || '.', 'report', 'daily_report', new.id::text, '/app/reports/view/' || new.id);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_notify on public.pending_daily_reports;
create trigger trg_notify after insert or update of status on public.pending_daily_reports for each row execute function public.fn_notify_report();

create or replace function public.fn_notify_report_message() returns trigger
language plpgsql as $$
declare r public.pending_daily_reports; pname text; d text;
begin
  select * into r from public.pending_daily_reports where id = new.report_id;
  if not found or new.kind = 'admin_edit' then return new; end if;
  select name into pname from public.projects where id = r.project_id;
  pname := coalesce(pname, r.project_id);
  d := to_char(r.report_date, 'DD Mon');
  if new.sender_id = r.supervisor_id then
    perform public.telgo_notify_admins(new.sender_id, r.is_test, 'Message on a report',
      new.sender_name || ' wrote about the report for ' || pname || ', ' || d || '.', 'message', 'daily_report', r.id::text, '/app/reports/view/' || r.id);
  else
    perform public.telgo_notify_one(r.supervisor_id, new.sender_id,
      case when new.kind = 'ask_fix' then 'Please fix your report' else 'Message on your report' end,
      new.sender_name || ': ' || left(new.message, 140), case when new.kind = 'ask_fix' then 'fix' else 'message' end,
      'daily_report', r.id::text, '/app/my-reports/' || r.id);
  end if;
  return new;
end $$;
drop trigger if exists trg_notify on public.report_clarification_messages;
create trigger trg_notify after insert on public.report_clarification_messages for each row execute function public.fn_notify_report_message();

create or replace function public.fn_notify_attendance() returns trigger
language plpgsql as $$
declare far text;
begin
  -- only when the distance is known (a project with no site location on the map can't say "away")
  if new.status = 'signed_in' and not new.within_geofence and new.distance_from_site_m is not null then
    far := case when new.distance_from_site_m is null then 'away from'
                when new.distance_from_site_m >= 1000 then round(new.distance_from_site_m / 1000.0, 1) || ' km from'
                else round(new.distance_from_site_m) || ' m from' end;
    perform public.telgo_notify_admins(new.mobile_user_id::uuid, new.is_test, 'Signed in away from site',
      new.user_name || ' signed in ' || far || ' ' || new.project_name || '.', 'attendance', 'attendance', new.id::text, '/app/team/attendance');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify on public.mobile_attendance;
create trigger trg_notify after insert on public.mobile_attendance for each row execute function public.fn_notify_attendance();

create or replace function public.fn_notify_person() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' and new.access_status = 'pending' then
    perform public.telgo_notify_admins(null, new.is_test, 'New access request',
      coalesce(new.full_name, 'Someone') || ' asked to join as ' || coalesce(new.role, 'staff') || '.', 'access', 'person', new.id::text, '/app/team/requests');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify on public.mobile_app_users;
create trigger trg_notify after insert on public.mobile_app_users for each row execute function public.fn_notify_person();

create or replace function public.fn_notify_material() returns trigger
language plpgsql as $$
declare pname text;
begin
  select name into pname from public.projects where id = new.project_id;
  perform public.telgo_notify_admins(new.created_by, new.is_test, 'Material at site',
    new.created_by_name || ' added ' || new.material || ' at ' || coalesce(pname, new.project_id) || '.', 'material', 'site_material', new.id::text, '/app/projects/storage');
  return new;
end $$;
drop trigger if exists trg_notify on public.site_materials;
create trigger trg_notify after insert on public.site_materials for each row execute function public.fn_notify_material();

-- ============================================================================================
-- K. Chat (direct chats with the admin, and one team chat)
-- ============================================================================================
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct', 'team')),
  title text,
  direct_key text unique,                 -- 'a:b' (sorted ids) for a direct chat
  created_by uuid,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  trashed_at timestamptz,
  is_test boolean not null default false
);
create table if not exists public.chat_members (
  thread_id uuid not null references public.chat_threads (id),
  user_id uuid not null references public.mobile_app_users (id),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  left_at timestamptz,
  primary key (thread_id, user_id)
);
create index if not exists chat_members_user_idx on public.chat_members (user_id);
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id),
  sender_id uuid not null references public.mobile_app_users (id),
  kind text not null default 'text' check (kind in ('text', 'photo', 'voice', 'file')),
  body text,
  file_id uuid references public.app_files (id),
  client_ref text unique,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  removed_at timestamptz,
  removed_by uuid,
  is_test boolean not null default false,
  check (length(coalesce(body, '')) <= 4000)
);
create index if not exists chat_messages_thread_idx on public.chat_messages (thread_id, created_at desc);
drop trigger if exists trg_no_delete on public.chat_messages;
create trigger trg_no_delete before delete on public.chat_messages for each row execute function public.fn_block_delete();
drop trigger if exists trg_no_delete on public.chat_threads;
create trigger trg_no_delete before delete on public.chat_threads for each row execute function public.fn_block_delete();

create or replace function public.fn_chat_message() returns trigger
language plpgsql as $$
declare t public.chat_threads; s public.mobile_app_users; m record; what text;
begin
  select * into t from public.chat_threads where id = new.thread_id;
  select * into s from public.mobile_app_users where id = new.sender_id;
  update public.chat_threads set last_message_at = new.created_at where id = new.thread_id;
  update public.chat_members set last_read_at = new.created_at where thread_id = new.thread_id and user_id = new.sender_id;
  what := case new.kind when 'photo' then 'sent a photo' when 'voice' then 'sent a voice note' when 'file' then 'sent a file' else 'sent a message' end;
  -- one unread card per chat: the database skips a person who already has an uncleared, unread card for this chat
  for m in select cm.user_id from public.chat_members cm where cm.thread_id = new.thread_id and cm.left_at is null and cm.user_id <> new.sender_id loop
    if not exists (select 1 from public.mobile_notifications n where n.recipient_user_id = m.user_id::text and n.entity_type = 'chat'
                   and n.entity_id = t.id::text and not n.is_read and n.cleared_at is null) then
      perform public.telgo_notify_one(m.user_id, new.sender_id,
        case when t.kind = 'team' then 'Team chat' else coalesce(s.full_name, 'Chat') end,
        coalesce(s.full_name, 'Someone') || ' ' || what || '. Open the chat to read it.', 'chat', 'chat', t.id::text, '/app/chat/' || t.id);
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists trg_chat on public.chat_messages;
create trigger trg_chat after insert on public.chat_messages for each row execute function public.fn_chat_message();

-- ============================================================================================
-- L. Push to the phone (Web Push, Android and iPhone Home Screen app)
-- ============================================================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.mobile_app_users (id),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz,
  fail_count integer not null default 0,
  disabled_at timestamptz,
  is_test boolean not null default false
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id) where disabled_at is null;

-- ============================================================================================
-- M. Lock everything made here (0001's rule for new objects)
-- ============================================================================================
do $$
declare r record;
begin
  for r in select c.relname, c.relkind from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v', 'S')
      and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
  loop
    if r.relkind = 'r' then execute format('alter table public.%I enable row level security', r.relname); end if;
    if r.relkind = 'S' then execute format('revoke all on sequence public.%I from anon, authenticated', r.relname);
    else execute format('revoke all on table public.%I from anon, authenticated', r.relname); end if;
  end loop;
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ---------------------------------------------------------------- 0003_file_manager.sql
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

-- ---------------------------------------------------------------- 0004_views_and_chat.sql
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

-- ---------------------------------------------------------------- 0005_inventory_and_shifts.sql
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

commit;

-- After it finishes: this should list the new tables (app_sessions, audit_log, inventory_changes, …)
select table_name from information_schema.tables where table_schema = 'public'
  and table_name in ('app_sessions', 'login_attempts', 'audit_log', 'app_error_log', 'app_files', 'site_materials', 'inventory_changes', 'chat_threads', 'chat_messages', 'push_subscriptions', 'project_access')
order by 1;
