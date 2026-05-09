create extension if not exists pgcrypto;

create table if not exists public.roles (
  id text primary key,
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id text primary key,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  role_id text not null references public.roles(id),
  full_name text not null,
  phone text,
  email text unique,
  status text not null default 'active' check (status in ('active', 'inactive', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique references public.users(id) on delete cascade,
  employee_code text unique,
  title text,
  department text,
  avatar_url text,
  emergency_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key,
  code text not null unique,
  name text not null,
  client_name text,
  contract_type text not null default 'EPC',
  project_type text,
  location text not null,
  district text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('active', 'on_track', 'at_risk', 'delayed', 'completed', 'paused')),
  progress numeric(5, 2) not null default 0 check (progress >= 0 and progress <= 100),
  budget numeric(14, 2) not null default 0,
  spent numeric(14, 2) not null default 0,
  total_length_km numeric(8, 2),
  completed_length_km numeric(8, 2),
  project_manager_id text references public.users(id),
  site_in_charge_id text references public.users(id),
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id text not null references public.projects(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  role_on_project text not null,
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.geofences (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  name text not null,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  radius_m integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.users(id) on delete set null,
  project_id text references public.projects(id) on delete set null,
  check_in_at timestamptz,
  check_out_at timestamptz,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  gps_accuracy_m numeric(8, 2),
  distance_from_site_m numeric(8, 2),
  within_geofence boolean not null default false,
  status text not null default 'pending_approval' check (status in ('pending_approval', 'approved', 'rejected', 'synced')),
  approved_by text references public.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.site_logs (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  user_id text references public.users(id) on delete set null,
  work_type text not null,
  activity_details text not null,
  drilling_method text,
  depth_reached_m numeric(8, 2),
  meters_completed numeric(10, 2),
  next_target_m numeric(10, 2),
  weather text,
  temperature_c numeric(5, 2),
  remarks text,
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'approved', 'rejected')),
  log_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  site_log_id uuid references public.site_logs(id) on delete set null,
  uploaded_by text references public.users(id) on delete set null,
  storage_bucket text not null default 'site-photos',
  file_path text not null,
  caption text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  taken_at timestamptz,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  requester_id text references public.users(id) on delete set null,
  title text not null,
  description text,
  category text not null default 'general',
  amount numeric(14, 2) not null check (amount >= 0),
  expected_date date,
  status text not null default 'pending' check (status in ('draft', 'pending', 'approved', 'rejected', 'paid')),
  approver_id text references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  request_type text not null,
  request_id text not null,
  project_id text references public.projects(id) on delete set null,
  requester_id text references public.users(id) on delete set null,
  approver_id text references public.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  project_id text references public.projects(id) on delete cascade,
  title text not null,
  chat_type text not null default 'project',
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.chats(id) on delete cascade,
  project_id text references public.projects(id) on delete cascade,
  sender_id text references public.users(id) on delete set null,
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  read_by jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.users(id) on delete cascade,
  project_id text references public.projects(id) on delete cascade,
  title text not null,
  body text,
  notification_type text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.payroll (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  period_month date not null,
  base_salary numeric(14, 2) not null default 0,
  overtime_hours numeric(8, 2) not null default 0,
  overtime_amount numeric(14, 2) not null default 0,
  deductions numeric(14, 2) not null default 0,
  net_pay numeric(14, 2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'approved', 'paid')),
  created_at timestamptz not null default now(),
  unique (user_id, period_month)
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  project_id text references public.projects(id) on delete set null,
  raised_by text references public.users(id) on delete set null,
  title text not null,
  detail text,
  severity text not null default 'warning' check (severity in ('critical', 'high', 'warning', 'resolved')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  resolved_by text references public.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  project_id text references public.projects(id) on delete set null,
  name text not null,
  equipment_type text not null,
  status text not null default 'active' check (status in ('active', 'idle', 'maintenance', 'breakdown')),
  fuel_level_percent integer check (fuel_level_percent between 0 and 100),
  last_service_at date,
  created_at timestamptz not null default now()
);

create table if not exists public.client_access (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  access_level text not null default 'viewer' check (access_level in ('viewer', 'approver', 'owner')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.users(id) on delete set null,
  leave_type text not null,
  start_date date,
  end_date date,
  total_days numeric(5, 2),
  reason text,
  document_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by text references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  project_id text references public.projects(id) on delete cascade,
  actor_id text references public.users(id) on delete set null,
  entity_type text not null,
  entity_id text,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id text references public.projects(id) on delete cascade,
  uploaded_by text references public.users(id) on delete set null,
  title text not null,
  document_type text not null,
  storage_bucket text not null default 'project-documents',
  file_path text not null,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id text references public.projects(id) on delete cascade,
  assigned_to text references public.users(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.engineer_locations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  project_id text references public.projects(id) on delete set null,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  speed_kmph numeric(8, 2),
  battery_percent integer check (battery_percent between 0 and 100),
  status text not null default 'active' check (status in ('active', 'moving', 'idle', 'inactive', 'stagnant')),
  recorded_at timestamptz not null default now()
);

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  company_name text,
  gst_number text,
  company_address text,
  requested_role text,
  access_purpose text,
  document_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by text references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists users_auth_user_id_idx on public.users(auth_user_id);
create index if not exists projects_status_idx on public.projects(status);
create index if not exists project_members_user_idx on public.project_members(user_id);
create index if not exists attendance_project_created_idx on public.attendance(project_id, created_at desc);
create index if not exists site_logs_project_date_idx on public.site_logs(project_id, log_date desc);
create index if not exists expenses_project_status_idx on public.expenses(project_id, status);
create index if not exists approvals_status_idx on public.approvals(status, priority);
create index if not exists messages_chat_created_idx on public.messages(chat_id, created_at);
create index if not exists notifications_user_read_idx on public.notifications(user_id, is_read, created_at desc);
create index if not exists alerts_status_severity_idx on public.alerts(status, severity, created_at desc);
create index if not exists engineer_locations_user_recorded_idx on public.engineer_locations(user_id, recorded_at desc);

create or replace function public.current_user_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role_id from public.users where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_operations_lead()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin', 'supervisor'), false);
$$;

create or replace function public.is_project_member(project_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_role() in ('admin', 'supervisor', 'finance') or exists (
      select 1
      from public.project_members pm
      where pm.project_id = project_key
        and pm.user_id = public.current_user_id()
    ),
    false
  );
$$;

alter table public.roles enable row level security;
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.geofences enable row level security;
alter table public.attendance enable row level security;
alter table public.site_logs enable row level security;
alter table public.project_photos enable row level security;
alter table public.expenses enable row level security;
alter table public.approvals enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.payroll enable row level security;
alter table public.alerts enable row level security;
alter table public.equipment enable row level security;
alter table public.client_access enable row level security;
alter table public.leave_requests enable row level security;
alter table public.activity_logs enable row level security;
alter table public.documents enable row level security;
alter table public.tasks enable row level security;
alter table public.engineer_locations enable row level security;
alter table public.access_requests enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant insert on public.access_requests to anon;
grant usage on schema storage to anon, authenticated;
grant select, insert on storage.objects to anon;
grant select, insert, update, delete on storage.objects to authenticated;

do $$
declare
  policy record;
begin
  for policy in
    select * from (values
      ('roles', 'roles_authenticated_read', 'for select to authenticated using (true)'),
      ('users', 'users_self_or_ops_read', 'for select to authenticated using (public.is_operations_lead() or id = public.current_user_id())'),
      ('users', 'users_ops_write', 'for all to authenticated using (public.is_operations_lead()) with check (public.is_operations_lead())'),
      ('profiles', 'profiles_self_or_ops_read', 'for select to authenticated using (public.is_operations_lead() or user_id = public.current_user_id())'),
      ('profiles', 'profiles_self_update', 'for update to authenticated using (user_id = public.current_user_id()) with check (user_id = public.current_user_id())'),
      ('projects', 'projects_authenticated_read', 'for select to authenticated using (true)'),
      ('projects', 'projects_ops_write', 'for all to authenticated using (public.is_operations_lead()) with check (public.is_operations_lead())'),
      ('project_members', 'project_members_project_read', 'for select to authenticated using (public.is_project_member(project_id))'),
      ('geofences', 'geofences_project_read', 'for select to authenticated using (public.is_project_member(project_id))'),
      ('attendance', 'attendance_member_read', 'for select to authenticated using (public.is_operations_lead() or user_id = public.current_user_id() or public.is_project_member(project_id))'),
      ('attendance', 'attendance_self_insert', 'for insert to authenticated with check (user_id is null or user_id = public.current_user_id())'),
      ('attendance', 'attendance_ops_update', 'for update to authenticated using (public.is_operations_lead()) with check (public.is_operations_lead())'),
      ('site_logs', 'site_logs_project_read', 'for select to authenticated using (public.is_project_member(project_id))'),
      ('site_logs', 'site_logs_member_insert', 'for insert to authenticated with check (public.is_project_member(project_id))'),
      ('site_logs', 'site_logs_member_update', 'for update to authenticated using (public.is_project_member(project_id)) with check (public.is_project_member(project_id))'),
      ('project_photos', 'project_photos_project_read', 'for select to authenticated using (public.is_project_member(project_id))'),
      ('project_photos', 'project_photos_member_insert', 'for insert to authenticated with check (public.is_project_member(project_id))'),
      ('expenses', 'expenses_project_read', 'for select to authenticated using (public.is_project_member(project_id))'),
      ('expenses', 'expenses_member_insert', 'for insert to authenticated with check (public.is_project_member(project_id))'),
      ('expenses', 'expenses_finance_update', 'for update to authenticated using (public.current_role() in (''admin'', ''finance'', ''supervisor'')) with check (public.current_role() in (''admin'', ''finance'', ''supervisor''))'),
      ('approvals', 'approvals_project_read', 'for select to authenticated using (public.current_role() in (''admin'', ''finance'', ''supervisor'') or requester_id = public.current_user_id())'),
      ('approvals', 'approvals_approver_update', 'for update to authenticated using (public.current_role() in (''admin'', ''finance'', ''supervisor'')) with check (public.current_role() in (''admin'', ''finance'', ''supervisor''))'),
      ('chats', 'chats_project_read', 'for select to authenticated using (project_id is null or public.is_project_member(project_id))'),
      ('messages', 'messages_project_read', 'for select to authenticated using (project_id is null or public.is_project_member(project_id))'),
      ('messages', 'messages_project_insert', 'for insert to authenticated with check (project_id is null or public.is_project_member(project_id))'),
      ('notifications', 'notifications_self_read', 'for select to authenticated using (user_id = public.current_user_id())'),
      ('notifications', 'notifications_self_update', 'for update to authenticated using (user_id = public.current_user_id()) with check (user_id = public.current_user_id())'),
      ('payroll', 'payroll_self_or_finance_read', 'for select to authenticated using (public.current_role() in (''admin'', ''finance'') or user_id = public.current_user_id())'),
      ('payroll', 'payroll_finance_write', 'for all to authenticated using (public.current_role() in (''admin'', ''finance'')) with check (public.current_role() in (''admin'', ''finance''))'),
      ('alerts', 'alerts_authenticated_read', 'for select to authenticated using (true)'),
      ('alerts', 'alerts_ops_insert', 'for insert to authenticated with check (public.current_role() in (''admin'', ''supervisor'', ''engineer''))'),
      ('alerts', 'alerts_ops_update', 'for update to authenticated using (public.is_operations_lead()) with check (public.is_operations_lead())'),
      ('equipment', 'equipment_project_read', 'for select to authenticated using (project_id is null or public.is_project_member(project_id))'),
      ('equipment', 'equipment_ops_write', 'for all to authenticated using (public.is_operations_lead()) with check (public.is_operations_lead())'),
      ('client_access', 'client_access_read', 'for select to authenticated using (public.is_operations_lead() or user_id = public.current_user_id())'),
      ('leave_requests', 'leave_self_or_ops_read', 'for select to authenticated using (public.is_operations_lead() or user_id = public.current_user_id())'),
      ('leave_requests', 'leave_self_insert', 'for insert to authenticated with check (user_id is null or user_id = public.current_user_id())'),
      ('leave_requests', 'leave_ops_update', 'for update to authenticated using (public.is_operations_lead()) with check (public.is_operations_lead())'),
      ('activity_logs', 'activity_logs_authenticated_read', 'for select to authenticated using (true)'),
      ('activity_logs', 'activity_logs_authenticated_insert', 'for insert to authenticated with check (true)'),
      ('documents', 'documents_project_read', 'for select to authenticated using (project_id is null or public.is_project_member(project_id))'),
      ('documents', 'documents_member_insert', 'for insert to authenticated with check (project_id is null or public.is_project_member(project_id))'),
      ('tasks', 'tasks_project_read', 'for select to authenticated using (project_id is null or public.is_project_member(project_id))'),
      ('tasks', 'tasks_member_update', 'for update to authenticated using (assigned_to = public.current_user_id() or public.is_operations_lead()) with check (assigned_to = public.current_user_id() or public.is_operations_lead())'),
      ('engineer_locations', 'engineer_locations_project_read', 'for select to authenticated using (public.is_operations_lead() or user_id = public.current_user_id() or public.is_project_member(project_id))'),
      ('engineer_locations', 'engineer_locations_self_insert', 'for insert to authenticated with check (user_id = public.current_user_id())'),
      ('access_requests', 'access_requests_public_insert', 'for insert to anon, authenticated with check (true)'),
      ('access_requests', 'access_requests_ops_read', 'for select to authenticated using (public.is_operations_lead())'),
      ('access_requests', 'access_requests_ops_update', 'for update to authenticated using (public.is_operations_lead()) with check (public.is_operations_lead())')
    ) as p(table_name, policy_name, policy_sql)
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = policy.table_name
        and policyname = policy.policy_name
    ) then
      execute format('create policy %I on public.%I %s', policy.policy_name, policy.table_name, policy.policy_sql);
    end if;
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('site-photos', 'site-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('project-documents', 'project-documents', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('access-documents', 'access-documents', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
declare
  policy record;
begin
  for policy in
    select * from (values
      ('storage_access_docs_insert', 'for insert to anon, authenticated with check (bucket_id = ''access-documents'')'),
      ('storage_access_docs_ops_read', 'for select to authenticated using (bucket_id = ''access-documents'' and public.is_operations_lead())'),
      ('storage_site_photos_member_read', 'for select to authenticated using (bucket_id = ''site-photos'')'),
      ('storage_site_photos_member_insert', 'for insert to authenticated with check (bucket_id = ''site-photos'')'),
      ('storage_project_docs_member_read', 'for select to authenticated using (bucket_id = ''project-documents'')'),
      ('storage_project_docs_member_insert', 'for insert to authenticated with check (bucket_id = ''project-documents'')')
    ) as p(policy_name, policy_sql)
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = policy.policy_name
    ) then
      execute format('create policy %I on storage.objects %s', policy.policy_name, policy.policy_sql);
    end if;
  end loop;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object or undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object or undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.approvals;
exception when duplicate_object or undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.alerts;
exception when duplicate_object or undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.engineer_locations;
exception when duplicate_object or undefined_object then null;
end $$;

insert into public.roles (id, name, description)
values
  ('admin', 'Admin', 'Full operations access'),
  ('supervisor', 'Supervisor', 'Site monitoring and approvals'),
  ('engineer', 'Site Engineer', 'Field work and reporting'),
  ('finance', 'Finance', 'Finance approvals and payroll'),
  ('client', 'Client', 'Client transparency portal')
on conflict (id) do update set name = excluded.name, description = excluded.description;

insert into public.users (id, role_id, full_name, phone, email, status)
values
  ('arjun', 'engineer', 'Arjun Nair', '+919544365758', 'arjun@telgopower.com', 'active'),
  ('sujith', 'supervisor', 'Sujith Kumar', '+919544365759', 'sujith@telgopower.com', 'active'),
  ('vishnu', 'admin', 'Vishnu Prasad', '+919544365760', 'vishnu@telgopower.com', 'active'),
  ('anitha', 'finance', 'Anitha R.', '+919544365761', 'anitha@telgopower.com', 'active'),
  ('nikhil', 'engineer', 'Nikhil Raj', '+919544365762', 'nikhil@telgopower.com', 'active'),
  ('client-cial', 'client', 'CIAL Client Desk', '+919544365763', 'client@cial.example', 'active')
on conflict (id) do update set
  role_id = excluded.role_id,
  full_name = excluded.full_name,
  phone = excluded.phone,
  email = excluded.email,
  status = excluded.status;

insert into public.profiles (user_id, employee_code, title, department)
values
  ('arjun', 'TELGO-EMP-0214', 'Site Engineer', 'Site Operations'),
  ('sujith', 'TELGO-EMP-0088', 'Supervisor', 'Site Operations'),
  ('vishnu', 'TELGO-EMP-0003', 'Project Manager', 'Admin'),
  ('anitha', 'TELGO-EMP-0044', 'Finance Manager', 'Finance'),
  ('nikhil', 'TELGO-EMP-0182', 'Site Engineer', 'Site Operations'),
  ('client-cial', 'CIAL-PORTAL-01', 'Client Viewer', 'Client')
on conflict (user_id) do update set
  employee_code = excluded.employee_code,
  title = excluded.title,
  department = excluded.department;

insert into public.projects (
  id, code, name, client_name, contract_type, project_type, location, district,
  latitude, longitude, start_date, end_date, status, progress, budget, spent,
  total_length_km, completed_length_km, project_manager_id, site_in_charge_id, image_path
)
values
  ('cial-33kv', 'TLGO-PRJ-2025-0148', 'CIAL 33kV UG Cable Laying', 'CIAL - Calicut International Airport Ltd.', 'EPC', 'UG Cable Laying', 'Kozhikode, Kerala', 'Kozhikode', 11.2588, 75.7873, '2025-03-10', '2025-05-30', 'on_track', 72, 24500000, 16845780, 8.65, 6.23, 'vishnu', 'arjun', '/assets/cial-33kv-cable-laying.webp'),
  ('panangad-hdd', 'TLGO-PRJ-2025-0112', 'Panangad HDD Crossing', 'Kerala Water Infra', 'EPC', 'HDD Drilling', 'Ernakulam, Kerala', 'Ernakulam', 9.9312, 76.2673, '2025-04-02', '2025-05-18', 'on_track', 83, 16200000, 12560000, 4.8, 4.0, 'sujith', 'nikhil', '/assets/xcmg-hdd-machine.webp'),
  ('rdss-imperial', 'TLGO-PRJ-2025-0094', 'RDSS Imperial Commissioning', 'KSEB RDSS', 'EPC', 'Substation Work', 'Thrissur, Kerala', 'Thrissur', 10.5276, 76.2144, '2025-04-18', '2025-06-25', 'at_risk', 47, 19800000, 9632000, 11.2, 5.3, 'anitha', 'vishnu', '/assets/kseb-rdss-imperial-project.webp'),
  ('poonjar-110kv', 'TLGO-PRJ-2025-0081', 'Poonjar 110kV Line Upgradation', 'KSEB Transmission', 'EPC', 'Line Upgradation', 'Kottayam, Kerala', 'Kottayam', 9.6727, 76.7784, '2025-04-28', '2025-07-20', 'at_risk', 35, 15400000, 8750000, 18.6, 6.4, 'sujith', 'nikhil', '/assets/vembanad-backwater-crossing.webp')
on conflict (id) do update set
  status = excluded.status,
  progress = excluded.progress,
  spent = excluded.spent,
  updated_at = now();

insert into public.project_members (project_id, user_id, role_on_project)
values
  ('cial-33kv', 'arjun', 'Site Engineer'),
  ('cial-33kv', 'sujith', 'Supervisor'),
  ('cial-33kv', 'vishnu', 'Project Manager'),
  ('cial-33kv', 'anitha', 'Finance Manager'),
  ('cial-33kv', 'client-cial', 'Client Viewer'),
  ('panangad-hdd', 'nikhil', 'Site Engineer'),
  ('rdss-imperial', 'vishnu', 'Project Manager'),
  ('poonjar-110kv', 'sujith', 'Supervisor')
on conflict (project_id, user_id) do update set role_on_project = excluded.role_on_project;

insert into public.geofences (project_id, name, latitude, longitude, radius_m)
values
  ('cial-33kv', 'West Hill Site Radius', 11.2588, 75.7873, 100),
  ('panangad-hdd', 'Panangad HDD Radius', 9.9312, 76.2673, 120),
  ('rdss-imperial', 'Imperial Commissioning Radius', 10.5276, 76.2144, 150)
on conflict do nothing;

insert into public.chats (project_id, title, chat_type)
values ('cial-33kv', 'CIAL 33kV UG Cable Laying', 'project')
on conflict do nothing;

insert into public.messages (chat_id, project_id, sender_id, body, attachments)
select c.id, 'cial-33kv', 'arjun', 'Good morning team. Cable trenching completed from Palayam to West Hill.', '[{"path":"/assets/cial-33kv-cable-laying.webp"}]'::jsonb
from public.chats c
where c.project_id = 'cial-33kv'
on conflict do nothing;

insert into public.site_logs (project_id, user_id, work_type, activity_details, drilling_method, depth_reached_m, meters_completed, weather, temperature_c, status, log_date)
values
  ('cial-33kv', 'arjun', 'Cable Laying', 'Trenching and cable laying completed from Palayam to West Hill.', 'HDD', 8.5, 85, 'Sunny', 32, 'submitted', '2025-05-12'),
  ('panangad-hdd', 'nikhil', 'HDD Drilling Operation', 'Entry point setup completed. Pilot drilling in progress.', 'HDD', 7.2, 245, 'Cloudy', 31, 'submitted', '2025-05-12')
on conflict do nothing;

insert into public.expenses (project_id, requester_id, title, description, category, amount, expected_date, status, approver_id)
values
  ('cial-33kv', 'arjun', 'Diesel advance for HDD machine', 'Diesel required for HDD operations for the next 2 days.', 'fuel', 5000, '2025-05-13', 'pending', 'anitha'),
  ('panangad-hdd', 'nikhil', 'Equipment Repair - Panangad', 'Repair and service for HDD support equipment.', 'equipment', 78450, '2025-05-14', 'pending', 'anitha')
on conflict do nothing;

insert into public.approvals (request_type, request_id, project_id, requester_id, approver_id, status, priority, notes)
values
  ('attendance', 'att-1', 'cial-33kv', 'arjun', 'sujith', 'pending', 'high', 'Out of range by 320m'),
  ('finance', 'fin-1', 'cial-33kv', 'arjun', 'anitha', 'pending', 'normal', 'Travel and food bill'),
  ('leave', 'leave-1', null, 'nikhil', 'sujith', 'pending', 'normal', 'Family function')
on conflict do nothing;

insert into public.alerts (project_id, raised_by, title, detail, severity, status, latitude, longitude)
values
  ('cial-33kv', 'arjun', 'Machine Breakdown', 'Cable laying machine is not operational. Work has been stopped.', 'critical', 'open', 10.5276, 76.2144),
  ('poonjar-110kv', 'sujith', 'Safety Incident Reported', 'Worker reported a minor injury. Medical assistance provided.', 'critical', 'open', 9.6727, 76.7784),
  ('rdss-imperial', 'vishnu', 'Fuel Level Critical', 'Fuel level below 10% in generator. Refuel required immediately.', 'high', 'open', 10.5276, 76.2144)
on conflict do nothing;

insert into public.equipment (project_id, name, equipment_type, status, fuel_level_percent, last_service_at)
values
  ('cial-33kv', 'HDD-02 Cable Laying Machine', 'HDD Machine', 'breakdown', 8, '2025-05-01'),
  ('panangad-hdd', 'Ashok Leyland Diesel Tanker', 'Fuel Support', 'active', 72, '2025-05-05')
on conflict do nothing;

insert into public.leave_requests (user_id, leave_type, start_date, end_date, total_days, reason, status)
values
  ('nikhil', 'Casual Leave', '2025-05-20', '2025-05-22', 3, 'Family function. Need to be at home during this period.', 'pending'),
  ('arjun', 'Earned Leave', '2025-05-10', '2025-05-12', 3, 'Personal work', 'approved')
on conflict do nothing;

insert into public.payroll (user_id, period_month, base_salary, overtime_hours, overtime_amount, deductions, net_pay, status)
values
  ('arjun', '2025-05-01', 52000, 12, 4500, 1200, 55300, 'approved'),
  ('nikhil', '2025-05-01', 48000, 8, 3000, 900, 50100, 'draft')
on conflict (user_id, period_month) do update set
  base_salary = excluded.base_salary,
  overtime_hours = excluded.overtime_hours,
  overtime_amount = excluded.overtime_amount,
  deductions = excluded.deductions,
  net_pay = excluded.net_pay,
  status = excluded.status;

insert into public.documents (project_id, uploaded_by, title, document_type, file_path, file_size_bytes)
values
  ('cial-33kv', 'arjun', 'Site Report - May 11', 'pdf', 'reports/site-report-may-11.pdf', 2400000),
  ('cial-33kv', 'anitha', 'Material Statement', 'xlsx', 'finance/material-statement.xlsx', 48000),
  ('cial-33kv', 'anitha', 'Method Statement', 'docx', 'docs/method-statement.docx', 1100000)
on conflict do nothing;

insert into public.tasks (project_id, assigned_to, title, description, priority, status, due_at)
values
  ('cial-33kv', 'arjun', 'Review site report', 'Check measurements before submission.', 'high', 'pending', '2025-05-12 11:00:00+05:30'),
  ('panangad-hdd', 'nikhil', 'Verify material delivery', 'Confirm cable drum delivery and photos.', 'medium', 'completed', '2025-05-11 18:00:00+05:30')
on conflict do nothing;

insert into public.engineer_locations (user_id, project_id, latitude, longitude, speed_kmph, battery_percent, status)
values
  ('arjun', 'cial-33kv', 11.2588, 75.7873, 4.2, 80, 'moving'),
  ('sujith', 'poonjar-110kv', 9.6727, 76.7784, 0, 65, 'idle'),
  ('nikhil', 'panangad-hdd', 9.9312, 76.2673, 0, 48, 'stagnant')
on conflict do nothing;

insert into public.notifications (user_id, project_id, title, body, notification_type)
values
  ('arjun', 'cial-33kv', 'Finance approved', 'Fuel advance request approved by Anitha R.', 'approval'),
  ('sujith', 'poonjar-110kv', 'Safety alert', 'Safety incident requires supervisor review.', 'alert')
on conflict do nothing;

insert into public.client_access (project_id, user_id, access_level)
values ('cial-33kv', 'client-cial', 'viewer')
on conflict (project_id, user_id) do update set access_level = excluded.access_level;

insert into public.activity_logs (project_id, actor_id, entity_type, entity_id, action, metadata)
values
  ('cial-33kv', 'arjun', 'photo', 'site-photo-batch-1', 'uploaded_photos', '{"count":5}'::jsonb),
  ('cial-33kv', 'anitha', 'expense', 'FR-125', 'approved_finance_request', '{"amount":12500}'::jsonb),
  ('panangad-hdd', 'sujith', 'attendance', 'attendance-batch-1', 'marked_attendance', '{"members":8}'::jsonb)
on conflict do nothing;
