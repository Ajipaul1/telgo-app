grant usage on schema public to service_role;
grant select, insert, update on table public.chats to service_role;
grant select, insert, update on table public.messages to service_role;

grant usage on schema storage to service_role;
grant select, insert, update on table storage.objects to service_role;
