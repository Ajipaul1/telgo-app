-- LIVE: passwords the admin can see (0007). Paste into Supabase > SQL Editor > Run. One transaction.
begin;
-- 0007 the admin can see and change passwords (owner's decision, 28 Sep 2026, knowing it is weaker security).
-- The login still checks the scrypt hash; next to it is a locked copy (AES-256-GCM; the key lives only in
-- the server's settings, never in the database) that only the admin's screen opens. Every look is written
-- in the change log. Additive, safe to run more than once.

alter table public.mobile_app_users add column if not exists password_view text;
alter table public.mobile_app_users add column if not exists password_view_at timestamptz;

-- the change log never copies the locked copy either (only that it changed)
create or replace function public.fn_audit() returns trigger
language plpgsql as $$
declare
  o jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else '{}'::jsonb end;
  n jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else '{}'::jsonb end;
  secret text[] := array['password_hash', 'temp_password_hash', 'pin_hash', 'login_pin', 'token_hash', 'resume_hash', 'password_view'];
  skip text[] := array['updated_at', 'last_seen_at', 'last_login_at', 'last_message_at', 'password_view_at'];
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

commit;
