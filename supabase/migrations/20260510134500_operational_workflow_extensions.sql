alter table public.access_requests
  add column if not exists site text,
  add column if not exists assigned_project_id text references public.projects(id) on delete set null,
  add column if not exists generated_login_id text,
  add column if not exists generated_password_hint text;

alter table public.expenses
  add column if not exists urgency text not null default 'normal' check (urgency in ('normal', 'urgent')),
  add column if not exists attachment_path text;

create table if not exists public.shift_reports (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.users(id) on delete set null,
  project_id text references public.projects(id) on delete cascade,
  meters_drilled numeric(10, 2) not null default 0,
  fuel_used_l numeric(10, 2) not null default 0,
  notes text not null,
  safety_issue text not null default 'No safety issue',
  photo_path text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.shift_reports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'shift_reports'
      and policyname = 'shift_reports_project_read'
  ) then
    create policy shift_reports_project_read
      on public.shift_reports
      for select
      to authenticated
      using (public.is_operations_lead() or user_id = public.current_user_id() or public.is_project_member(project_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'shift_reports'
      and policyname = 'shift_reports_self_insert'
  ) then
    create policy shift_reports_self_insert
      on public.shift_reports
      for insert
      to authenticated
      with check (user_id is null or user_id = public.current_user_id());
  end if;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.access_requests;
exception when duplicate_object or undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.shift_reports;
exception when duplicate_object or undefined_object then null;
end $$;
