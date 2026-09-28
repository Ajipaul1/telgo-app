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
