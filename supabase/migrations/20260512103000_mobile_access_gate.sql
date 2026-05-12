alter table public.mobile_app_users
  add column if not exists access_status text not null default 'pending',
  add column if not exists activated_at timestamptz,
  add column if not exists access_request_id uuid references public.access_requests(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'mobile_app_users_access_status_check'
      and conrelid = 'public.mobile_app_users'::regclass
  ) then
    alter table public.mobile_app_users
      add constraint mobile_app_users_access_status_check
      check (access_status in ('pending', 'active', 'inactive'));
  end if;
end $$;

create or replace function public.activate_approved_mobile_user(
  p_phone text,
  p_pin_hash text,
  p_full_name text default null
)
returns public.mobile_app_users
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_phone text := regexp_replace(coalesce(p_phone, ''), '\s+', '', 'g');
  phone_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  user_id text := 'mobile-' || regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  approved_request public.access_requests;
  saved_user public.mobile_app_users;
  approved_role text;
  approved_name text;
begin
  if auth.uid() is null then
    raise exception 'SMS verification is required before mobile activation';
  end if;

  if length(phone_digits) < 10 then
    raise exception 'A valid phone number is required';
  end if;

  if length(coalesce(p_pin_hash, '')) < 32 then
    raise exception 'PIN hash is invalid';
  end if;

  select *
    into approved_request
  from public.access_requests
  where status = 'approved'
    and right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) = right(phone_digits, 10)
  order by reviewed_at desc nulls last, created_at desc
  limit 1;

  if approved_request.id is null then
    raise exception 'Access approval is required before mobile activation';
  end if;

  approved_role :=
    case lower(coalesce(approved_request.requested_role, 'engineer'))
      when 'site engineer' then 'engineer'
      when 'engineer' then 'engineer'
      when 'finance' then 'finance'
      when 'client' then 'client'
      when 'supervisor' then 'supervisor'
      when 'admin' then 'admin'
      else 'employee'
    end;

  approved_name := coalesce(nullif(approved_request.full_name, ''), nullif(p_full_name, ''), 'Telgo Mobile User');

  insert into public.mobile_app_users (
    id,
    phone,
    pin_hash,
    full_name,
    role,
    auth_user_id,
    access_status,
    activated_at,
    access_request_id
  )
  values (
    user_id,
    normalized_phone,
    p_pin_hash,
    approved_name,
    approved_role,
    auth.uid(),
    'active',
    now(),
    approved_request.id
  )
  on conflict (phone) do update set
    pin_hash = excluded.pin_hash,
    full_name = excluded.full_name,
    role = excluded.role,
    auth_user_id = coalesce(public.mobile_app_users.auth_user_id, excluded.auth_user_id),
    access_status = 'active',
    activated_at = coalesce(public.mobile_app_users.activated_at, now()),
    access_request_id = excluded.access_request_id,
    updated_at = now()
  returning * into saved_user;

  return saved_user;
end;
$$;

create or replace function public.register_mobile_user(
  p_phone text,
  p_pin_hash text,
  p_full_name text default null
)
returns public.mobile_app_users
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.activate_approved_mobile_user(p_phone, p_pin_hash, p_full_name);
end;
$$;

create or replace function public.verify_mobile_pin(
  p_phone text,
  p_pin_hash text
)
returns table (
  id text,
  phone text,
  full_name text,
  role text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select u.id, u.phone, u.full_name, u.role, u.created_at
  from public.mobile_app_users u
  where u.phone = regexp_replace(coalesce(p_phone, ''), '\s+', '', 'g')
    and u.pin_hash = p_pin_hash
    and u.access_status = 'active'
  limit 1;
$$;

grant execute on function public.activate_approved_mobile_user(text, text, text) to authenticated;
grant execute on function public.register_mobile_user(text, text, text) to authenticated;
grant execute on function public.verify_mobile_pin(text, text) to anon, authenticated;
