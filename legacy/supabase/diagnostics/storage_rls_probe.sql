begin;
set local role anon;
insert into storage.objects (bucket_id, name, metadata)
values (
  'access-documents',
  'public/rls-probe.pdf',
  '{"mimetype":"application/pdf","size":12}'::jsonb
);
rollback;
select 'storage insert probe rolled back' as result;
