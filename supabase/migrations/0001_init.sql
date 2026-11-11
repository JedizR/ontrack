-- Ontrack: one generic records table, the photo analysis quota, and the private thumbnail bucket.
-- docs/TECH-SPEC.md section 6. Changes from the spec text are listed in docs/DECISIONS.md.

create table public.records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  collection text        not null check (collection in
               ('profile','plan','weight','meal','saved','program','slog','checkin','day')),
  id         text        not null check (char_length(id) between 1 and 80),
  data       jsonb       not null check (octet_length(data::text) <= 65536),
  updated_at bigint      not null,
  deleted    boolean     not null default false,
  server_ts  timestamptz not null default clock_timestamp(),
  primary key (user_id, collection, id)
);
create index records_pull on public.records (user_id, server_ts);

create function public.records_lww() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.updated_at <= old.updated_at then
    return null;                       -- stale or repeated write: keep the stored row
  end if;
  new.server_ts := clock_timestamp();
  return new;
end $$;

create trigger records_lww before insert or update on public.records
  for each row execute function public.records_lww();

alter table public.records enable row level security;
create policy records_select on public.records for select to authenticated
  using (user_id = (select auth.uid()));
create policy records_insert on public.records for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy records_update on public.records for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- deletes are tombstones, so no client ever deletes or truncates a row
revoke all on public.records from anon, authenticated;
grant select, insert, update on public.records to authenticated;

create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  count   int  not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
-- server only: no client role holds any privilege, and this policy states that for the advisors
revoke all on public.ai_usage from anon, authenticated;
create policy ai_usage_server_only on public.ai_usage for all to anon, authenticated using (false) with check (false);

create function public.bump_ai_usage(p_user uuid, p_day date, p_limit int) returns boolean
language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into public.ai_usage (user_id, day, count) values (p_user, p_day, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count into c;
  return c <= p_limit;
end $$;
revoke execute on function public.bump_ai_usage(uuid, date, int) from public, anon, authenticated;

insert into storage.buckets (id, name, public) values ('meal-photos', 'meal-photos', false)
  on conflict (id) do nothing;
create policy thumbs_read on storage.objects for select to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy thumbs_write on storage.objects for insert to authenticated
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy thumbs_update on storage.objects for update to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy thumbs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
