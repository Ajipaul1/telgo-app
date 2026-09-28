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
