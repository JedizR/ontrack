-- S1a: friends, profiles and the food map (PRD F16, F17). docs/TECH-SPEC.md sections 3 and 6, docs/DECISIONS.md S1a.
-- What a user owns stays a record and syncs like the rest: the profile for friends (collection `social`), the program,
-- and a meal's place on the map (`share` inside the meal). After each accepted write the database publishes what the
-- user chose to share into three tables clients may only read: profiles (anyone signed in, so a handle can be found),
-- shared_programs and shared_meals (the owner and accepted friends only). A tombstone, a switch turned off or a meal
-- taken off the map removes the row in the same statement. Friendships are the one table users write directly.
-- Shared photos stay in the private meal-photos bucket: an object is readable by whoever may read the row naming it.

alter table public.records drop constraint records_collection_check;
alter table public.records add constraint records_collection_check check (collection in
  ('profile','plan','weight','meal','saved','program','slog','checkin','day','food','supplement','product','social'));

create table public.profiles (
  user_id      uuid        primary key references auth.users (id) on delete cascade,
  handle       text        not null check (handle ~ '^[a-z0-9_]{3,20}$'),
  name         text        not null check (char_length(name) between 1 and 40),
  photo_path   text,
  show_program boolean     not null default false,
  updated_at   timestamptz not null default now()
);
-- pattern ops, so a search by the start of a handle uses the index
create unique index profiles_handle on public.profiles (handle text_pattern_ops);

create table public.friendships (
  requester  uuid        not null references public.profiles (user_id) on delete cascade,
  addressee  uuid        not null references public.profiles (user_id) on delete cascade,
  status     text        not null default 'requested' check (status in ('requested', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
-- one row per pair, whoever asked; and the addressee's side of the key
create unique index friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));
create unique index friendships_addressee on public.friendships (addressee, requester);

create table public.shared_programs (
  owner   uuid  primary key references auth.users (id) on delete cascade,
  program jsonb not null
);

-- numeric(_, 3) rounds to 0.001 degree (about 100 m) again, whatever a client sends
create table public.shared_meals (
  owner      uuid          not null references auth.users (id) on delete cascade,
  meal_id    text          not null,
  lat        numeric(5, 3) not null check (lat between -90 and 90),
  lng        numeric(6, 3) not null check (lng between -180 and 180),
  taken_at   timestamptz   not null,
  title      text          not null,
  kcal       numeric       not null,
  protein    numeric       not null,
  carbs      numeric       not null,
  fat        numeric       not null,
  photo_path text,
  primary key (owner, meal_id)
);

-- The owner, or an accepted friend of the owner. Runs as the caller, so friendships' own policy applies too.
-- In a schema the API does not expose.
create schema if not exists private;
create function private.sees(who uuid) returns boolean
language sql stable set search_path = '' as $$
  select who = (select auth.uid()) or exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester = who and f.addressee = (select auth.uid())) or (f.addressee = who and f.requester = (select auth.uid()))))
$$;
grant usage on schema private to authenticated;
grant execute on function private.sees(uuid) to authenticated;

alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select to authenticated using (true);

alter table public.friendships enable row level security;
create policy friendships_select on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester, addressee));
create policy friendships_insert on public.friendships for insert to authenticated
  with check (requester = (select auth.uid()) and status = 'requested');
-- only the one asked accepts, and accepting is the only change
create policy friendships_update on public.friendships for update to authenticated
  using (addressee = (select auth.uid())) with check (addressee = (select auth.uid()) and status = 'accepted');
-- declining, withdrawing and removing are all a delete, by either side
create policy friendships_delete on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester, addressee));

alter table public.shared_programs enable row level security;
create policy shared_programs_select on public.shared_programs for select to authenticated using (private.sees(owner));

alter table public.shared_meals enable row level security;
create policy shared_meals_select on public.shared_meals for select to authenticated using (private.sees(owner));

revoke all on public.profiles, public.friendships, public.shared_programs, public.shared_meals from anon, authenticated;
grant select on public.profiles, public.friendships, public.shared_programs, public.shared_meals to authenticated;
grant insert (requester, addressee), delete on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;

-- Publishes a user's accepted write. Definer, because clients hold no write privilege on the published tables; the
-- row it reads was already checked against records' policies, so new.user_id is the caller.
create function private.publish() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  d jsonb := new.data;
  photo text := case when d->>'photo' ~ '^[a-z0-9-]{1,64}$' then new.user_id || '/' || (d->>'photo') || '.jpg' end;
begin
  if new.collection = 'social' then
    if new.deleted then
      delete from public.profiles where user_id = new.user_id;   -- friendships go with it
    else
      begin
        insert into public.profiles (user_id, handle, name, photo_path, show_program)
        values (new.user_id, d->>'handle', d->>'name', photo, coalesce((d->>'showProgram')::boolean, false))
        on conflict (user_id) do update set handle = excluded.handle, name = excluded.name, photo_path = excluded.photo_path,
          show_program = excluded.show_program, updated_at = now();
      exception when unique_violation then
        -- shortcut: someone took the handle between the app's check and this sync; the rest publishes, the old handle
        -- stays (or no profile yet). Upgrade to a claim on the server if two people ever race for one
        update public.profiles set name = d->>'name', photo_path = photo, show_program = coalesce((d->>'showProgram')::boolean, false), updated_at = now()
        where user_id = new.user_id;
      end;
    end if;
  elsif new.collection = 'meal' then
    if not new.deleted and d ? 'share' then
      insert into public.shared_meals (owner, meal_id, lat, lng, taken_at, title, kcal, protein, carbs, fat, photo_path)
      select new.user_id, new.id, (d->'share'->>'lat')::numeric, (d->'share'->>'lng')::numeric, (d->>'at')::timestamptz, d->>'title',
        coalesce(round(sum((i->>'kcal')::numeric)), 0), coalesce(round(sum((i->>'protein')::numeric), 1), 0),
        coalesce(round(sum((i->>'carbs')::numeric), 1), 0), coalesce(round(sum((i->>'fat')::numeric), 1), 0),
        case when d->>'thumb' = 'true' then new.user_id || '/' || new.id || '.jpg' end
      from jsonb_array_elements(d->'items') i
      on conflict (owner, meal_id) do update set lat = excluded.lat, lng = excluded.lng, taken_at = excluded.taken_at,
        title = excluded.title, kcal = excluded.kcal, protein = excluded.protein, carbs = excluded.carbs, fat = excluded.fat,
        photo_path = excluded.photo_path;
    else
      delete from public.shared_meals where owner = new.user_id and meal_id = new.id;
    end if;
  end if;
  -- the program follows both the program and the switch
  if new.collection in ('social', 'program') then
    delete from public.shared_programs where owner = new.user_id;
    insert into public.shared_programs (owner, program)
    select r.user_id, r.data from public.records r join public.profiles p on p.user_id = r.user_id
    where r.user_id = new.user_id and r.collection = 'program' and not r.deleted and p.show_program;
  end if;
  return null;
end $$;

create trigger records_publish after insert or update on public.records
  for each row when (new.collection in ('social', 'program', 'meal')) execute function private.publish();

-- A shared meal's photo and a profile photo, readable as their rows are. Every other object stays its owner's.
drop policy thumbs_read on storage.objects;
create policy thumbs_read on storage.objects for select to authenticated using (
  bucket_id = 'meal-photos' and (
    (storage.foldername(objects.name))[1] = (select auth.uid())::text
    or exists (select 1 from public.shared_meals s where s.photo_path = objects.name)
    or exists (select 1 from public.profiles p where p.photo_path = objects.name)));
