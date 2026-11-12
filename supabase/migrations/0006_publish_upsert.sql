-- S1a, from the code review: the trigger republished a program as a delete then an insert, so two phones of one user
-- syncing a program or profile in the same instant could collide on shared_programs' key and have the second push
-- refused. It is an upsert now, and a delete only when the program is not shown. Everything else is as in 0005.
create or replace function private.publish() returns trigger
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
    insert into public.shared_programs (owner, program)
    select r.user_id, r.data from public.records r join public.profiles p on p.user_id = r.user_id
    where r.user_id = new.user_id and r.collection = 'program' and not r.deleted and p.show_program
    on conflict (owner) do update set program = excluded.program;
    if not found then
      delete from public.shared_programs where owner = new.user_id;
    end if;
  end if;
  return null;
end $$;
