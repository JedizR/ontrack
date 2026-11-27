-- 27 Nov, before the first user test. Two new tables; nothing existing changes.
--
-- ai_advice: the free plan's AI advice (Ask Ontrack answers and Adjust with AI) counted per calendar month, 10 a month
-- (shared/plans.ts FREE_ADVICE_PER_MONTH). Server only, as ai_usage: bump_ai_advice counts and returns the count.
create table public.ai_advice (
  user_id uuid not null references auth.users (id) on delete cascade,
  month   date not null,
  count   int  not null default 0,
  primary key (user_id, month)
);
alter table public.ai_advice enable row level security;
revoke all on public.ai_advice from anon, authenticated;
create policy ai_advice_server_only on public.ai_advice for all to anon, authenticated using (false) with check (false);

create function public.bump_ai_advice(p_user uuid, p_month date) returns int
language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into public.ai_advice (user_id, month, count) values (p_user, p_month, 1)
  on conflict (user_id, month) do update set count = public.ai_advice.count + 1
  returning count into c;
  return c;
end $$;
revoke execute on function public.bump_ai_advice(uuid, date) from public, anon, authenticated;

-- barcodes: a product someone added from its nutrition label when neither they nor Open Food Facts had the barcode,
-- shared so the next person who scans it finds it. Every signed in user reads them all and adds new ones; nobody
-- changes or deletes one (the first label wins), and the app checks each against its product schema before use.
create table public.barcodes (
  code       text primary key check (code ~ '^[0-9]{8,14}$'),
  product    jsonb not null check (jsonb_typeof(product) = 'object' and pg_column_size(product) <= 2048),
  added_by   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.barcodes enable row level security;
revoke all on public.barcodes from anon, authenticated;
-- who added a row stays private: other users read the barcode and the product only
grant select (code, product, created_at), insert on public.barcodes to authenticated;
create policy barcodes_read on public.barcodes for select to authenticated using (true);
create policy barcodes_add on public.barcodes for insert to authenticated with check (added_by = (select auth.uid()));
