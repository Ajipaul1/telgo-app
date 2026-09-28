-- Add email authentication columns to mobile_app_users
-- Making phone nullable (was required for old PIN system)
alter table public.mobile_app_users alter column phone drop not null;
alter table public.mobile_app_users alter column pin_hash drop not null;

-- Add new columns for email+password auth (safe: only if not exists)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='mobile_app_users' and column_name='email') then
    alter table public.mobile_app_users add column email text unique;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='mobile_app_users' and column_name='password_hash') then
    alter table public.mobile_app_users add column password_hash text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='mobile_app_users' and column_name='login_id') then
    alter table public.mobile_app_users add column login_id text unique;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='mobile_app_users' and column_name='access_status') then
    alter table public.mobile_app_users add column access_status text not null default 'pending';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='mobile_app_users' and column_name='activated_at') then
    alter table public.mobile_app_users add column activated_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='mobile_app_users' and column_name='blocked_at') then
    alter table public.mobile_app_users add column blocked_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='mobile_app_users' and column_name='blocked_reason') then
    alter table public.mobile_app_users add column blocked_reason text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='mobile_app_users' and column_name='last_login_at') then
    alter table public.mobile_app_users add column last_login_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='mobile_app_users' and column_name='user_folder_path') then
    alter table public.mobile_app_users add column user_folder_path text;
  end if;
end $$;

-- Allow service role (used by our server API) to do everything
grant all on public.mobile_app_users to service_role;

-- Allow anon to read their own row by email (needed for login check)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mobile_app_users'
      and policyname = 'mobile_app_users_anon_email_read'
  ) then
    create policy mobile_app_users_anon_email_read
      on public.mobile_app_users
      for select
      to anon
      using (true);
  end if;
end $$;
