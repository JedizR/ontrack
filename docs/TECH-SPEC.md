# Ontrack: technical specification

## 1. Stack

| Layer | Packages | Version policy |
| --- | --- | --- |
| Runtime | Node, pnpm through corepack | Copy `.nvmrc` and `pnpm-workspace.yaml` from watermelon |
| App | svelte 5.57.3, vite 8.3.5, @sveltejs/vite-plugin-svelte 7.3.1, typescript 6.0.3, svelte-check 4.7.7 | Watermelon pins |
| Style | tailwindcss 4.3.3, @tailwindcss/vite 4.3.3, clsx 2.1.1 | Watermelon pins |
| Components | bits-ui 2.20.2, vaul-svelte 1.0.0-next.7, svelte-sonner 1.2.2, @lucide/svelte 1.62.0, shadcn-svelte CLI | Watermelon pins. CLI at latest |
| Data | idb-keyval 6.3.0, zod, @supabase/supabase-js | New ones at latest stable, pinned in M0 |
| Charts | d3-scale 4.0.2, d3-shape 3.2.0 | Watermelon pins |
| PWA | vite-plugin-pwa 2.0.0, workbox-window 7.4.1, @vite-pwa/assets-generator 2.0.0 | Watermelon pins |
| Server | @google/genai, Vercel functions on the Node runtime with web standard handlers | Latest stable, pinned |
| Tests | vitest 5.0.5, @playwright/test 1.64.1 | Watermelon pins |
| Tools | prettier, prettier-plugin-svelte, tsx, vercel CLI, supabase CLI | Latest stable, pinned |

A bump needed for a fix is fine. Note it in `docs/DECISIONS.md`.

## 2. Repository layout

~~~
api/                    Vercel wrappers, a few lines each
  analyze.ts  account.ts  cron/keepalive.ts
server/                 portable handlers and server only code. Never imported from src/
  handlers/   analyze.ts account.ts keepalive.ts
  vision/     provider.ts gemini.ts mock.ts prompt.ts schema.ts resolve.ts
  auth.ts quota.ts env.ts http.ts
shared/                 types and zod schemas used by both sides
  records.ts analysis.ts
src/
  main.ts App.svelte app.css
  tabs/       Today.svelte Train.svelte Progress.svelte
  flows/      onboarding/ signin/ add/ checkin/
  settings/
  lib/
    model/    engine/ dates.ts units.ts format.ts day.ts trend.ts foods.ts export.ts
    db/       store.svelte.ts schema.ts migrations.ts
    sync/     engine.svelte.ts
    backend/  types.ts supabase.ts mock.ts index.ts
    actions.ts
    data/     foods.json exercises.ts templates.ts
    i18n/     en.ts index.ts
    components/   ui/ (shadcn) plus app components
    prefs.svelte.ts theme.ts textsize.ts haptics.ts
data/                   food-list.csv (curated, committed), usda/ (downloaded, ignored)
dev/                    mock-backend.ts api-middleware.ts
scripts/                build-foods.ts check-pwa.mjs
supabase/migrations/
tests/                  unit/ e2e/ fixtures/
design/ docs/ public/
~~~

`src/lib/model/engine/` holds `constants.ts bmr.ts plan.ts targets.ts checkin.ts program.ts index.ts`. It imports nothing outside itself.

## 3. Data model

Everything a user owns is a record in a named collection. Weekdays are numbered 0 for Monday to 6 for Sunday. Dates are `YYYY-MM-DD` strings in the device's calendar.

~~~ts
// shared/records.ts
export type Collection =
  | 'profile' | 'plan' | 'weight' | 'meal' | 'saved'
  | 'program' | 'slog' | 'checkin' | 'day' | 'food' | 'supplement' | 'product';

export type Rec<T = unknown> = {
  collection: Collection;
  id: string;          // 1 to 80 characters
  updatedAt: number;   // ms since epoch on the editing device. Set only in actions.ts
  deleted?: true;      // tombstone
  data: T;
};

export type Profile = {               // id: 'profile'
  sex: 'male' | 'female' | 'unspecified';
  birthYear: number;
  heightCm: number;
  bodyFatPct?: number;
  neat: 'seated' | 'light' | 'moving' | 'physical';
  experience: 'beginner' | 'intermediate' | 'advanced';
  units: 'metric' | 'imperial';
  calorieMode: 'matched' | 'even';
  checkinWeekday: number;
  screening: { pregnant: boolean; medical: boolean; eatingDisorder: boolean; at: string };
  onboardedAt: string;
};

export type Plan = {                  // id: uuid. The plan for a date is the newest with effectiveFrom <= date
  effectiveFrom: string;
  goal: 'lose' | 'maintain' | 'gain';
  ratePctPerWeek: number;             // positive number. Direction comes from goal
  goalWeightKg?: number;
  weightKg: number;                   // weight used for the calculation
  bmr: number;
  baseline: number;                   // bmr times the daily movement factor, or calibrated from a check-in
  eeeByWeekday: number[];             // 7 numbers, exercise kcal per weekday, frozen at plan time
  delta: number;                      // signed kcal per day after caps
  proteinG: number;
  fatG: number;
  flags: Array<'floor' | 'deficitCap' | 'surplusCap' | 'maintainOnly'>;
  tdeeSource: 'formula' | 'measured';
  engineVersion: number;
  source: 'onboarding' | 'checkin' | 'edit';
  sessions?: Omit<Session, 'exercises'>[];  // the program's sessions when the plan was made, so a past day keeps its own
};

export type Weight = { date: string; kg: number };            // id: `weight:${date}`

export type MealItem = {
  name: string;
  grams?: number;
  kcal: number; protein: number; carbs: number; fat: number;
  source: 'db' | 'estimate' | 'manual' | 'yours'    // yours: the user's remembered numbers for the food (F15)
    | 'off' | 'label' | 'typical';                  // B1: Open Food Facts, a pack's label read and confirmed, a supplement on typical values
  foodId?: string;
  confidence?: 'high' | 'medium' | 'low';
  supplementId?: string;              // a logged supplement (F21): the supplement it came from
  scoops?: number;                    // and how many scoops, 0.5 to 10
  barcode?: string;                   // a scanned product (F22): its barcode, the product's id
};
export type Meal = {                  // id: uuid
  date: string;
  at: string;                         // ISO timestamp
  title: string;
  method: 'photo' | 'text' | 'search' | 'quick' | 'saved' | 'supplement' | 'barcode';
  items: MealItem[];
  thumb?: true;
  ai?: { model: string; raw?: unknown };   // compact model output, at most 4 KB, kept for later evaluation
};

export type Saved = { title: string; items: MealItem[]; uses: number; lastUsedAt: string };   // id: uuid

export type Session = {
  key: string;                        // short id, stable inside the program
  weekday: number;
  name: string;
  type: 'strength' | 'circuit' | 'cardio' | 'sport' | 'mobility' | 'walk';
  minutes: number;
  intensity: 'light' | 'moderate' | 'hard';
  exercises?: Array<{ exerciseId: string; sets: number; repsMin: number; repsMax: number }>;
};
export type Program = { name: string; sessions: Session[] };   // id: 'program'

export type SessionLog = { date: string; sessionKey: string; status: 'done' | 'skipped' };  // id: `slog:${date}:${key}`

export type Checkin = {               // id: `checkin:${date}`
  date: string;
  stats: {
    days: number; weighIns: number; completeDays: number;
    ratePctPerWeek: number | null;    // signed
    meanIntake: number | null; meanTarget: number;
    tdeeObserved: number | null;
  };
  proposal: { kcalChange: number; reason: 'on_track' | 'raise' | 'lower' | 'adherence' | 'need_data' };
  decision?: 'accepted' | 'kept';
  planId?: string;
};

export type Day = { date: string; closed?: true };            // id: `day:${date}`

// Remembered nutrition (F15), what the user corrected a food to. id: the food's table id, or `name:` and its
// normalised name (lower case, accents dropped, Thai script kept) when it has none; at most 80 characters.
export type FoodMemory = { name: string; per100: { kcal: number; protein: number; carbs: number; fat: number } };

// A supplement set up from its tub's label (F21, N2). id: uuid. scoopG 0: the scoop's weight is not known.
export type Supplement = {
  name: string;                       // 1 to 60 characters
  kind: 'whey' | 'casein' | 'plant' | 'gainer' | 'creatine' | 'other';
  scoopG: number;
  perScoop: { kcal: number; protein: number; carbs: number; fat: number };
  lastScoops: number;                 // 0.5 to 10: where the amount step starts, the scoops the user takes at first
  lastMix?: { foodId: string; grams: number };   // the milk from the food table it was last mixed with; none is water
  typical?: true;                     // B1: still on the table's typical values, labelled Typical until set from the tub
};

// A packaged food by its barcode (F22, B1). id: the barcode, 13 digits (a UPC-A gets a leading 0, as Open Food Facts
// stores it; UPC-E is expanded) or 8 for EAN-8. Values per 100 g, or per 100 ml when `unit` is ml.
export type Product = {
  name: string;                       // 1 to 120 characters
  brand?: string;
  source: 'off' | 'label' | 'yours';  // Open Food Facts; read from the label and confirmed as read; typed or changed
  unit: 'g' | 'ml';
  per100: { kcal: number; protein: number; carbs: number; fat: number };   // kcal at most 1,000
  servingG?: number;                  // one serving, from the label or Open Food Facts
  packG?: number;                     // the whole pack, at most 10,000 like a meal item
  serving?: string;                   // the serving as Open Food Facts prints it ("2 scoops (60 g)")
  lastG?: number;                     // where the amount starts next time
};
~~~

Remembered nutrition is written by `rememberFoods` when a Review or Meal sheet is saved with items the user corrected (per 100 g, two decimals, from the item's numbers and grams; an item without grams or past 900 kcal in 100 g is not remembered) and removed by `forgetFood` ("Use default values"). It is applied on the device: to a photo or description's items after the server's resolution, and to Search's results and portion step. The server never sees it.

A logged supplement (F21) is a meal with `method: 'supplement'`: its first item is the supplement at its scoops (`supplementId`, `scoops`, source `yours`, from the label's values per scoop), then the milk it was mixed with as a table item. `logSupplement` writes it from the supplement's current label; a new entry's amount and mix become the supplement's `lastScoops` and `lastMix`, a corrected one leaves them. A supplement with no calories is shown as taken, and its item does not count toward a complete day. Presets start from the food table where USDA has the powder (whey: SR Legacy 173180, plant: SR Legacy 173181, soy based); casein, mass gainer and creatine have no USDA entry and start at 0, for the label.

A scanned product (F22) is kept in `product` when the user logs it from Open Food Facts or confirms its label, so the next scan of that barcode is instant and works offline. `logProduct` writes a meal with `method: 'barcode'` and one item carrying `barcode`, labelled as the product is; it keeps the amount as the product's `lastG`. Correcting such an item in the Meal sheet (`rememberFoods`) rewrites the product's values as Yours instead of a food memory. A supplement saved with the table's typical values untouched carries `typical`; its logged items read Typical, and setting it from the tub (a scan or a label photo) clears it.

Derived and never stored: day totals, the day's target, on track status, trend weight, weekly averages. They are functions in `src/lib/model/`.

Device only, kept in `localStorage` under `ontrack:prefs` and never synced: theme, text size, last tab, dismissed cards, the id of the last signed in user, and the onboarding draft.

## 4. On the device

- One idb-keyval store per user, named `ontrack-<userId>`. Keys: `r:<collection>:<id>` holds a `Rec`. `outbox` holds the keys changed since the last successful push. `meta` holds `{ schemaVersion, cursor, lastSyncAt }`. `blob:<mealId>` holds a thumbnail. `blobq` holds meal ids waiting to upload.
- At start the store reads every record into `$state` maps, one per collection. Screens read from these maps. Schema changes are handled by numbered migrations in `src/lib/db/migrations.ts`, as in watermelon. A migration takes the records and the meta. Adding a collection needs one: an older version on another device skips the new collection's records but moves its cursor past them, so the migration sets a cursor back to the epoch (schema 2 for `food` in N1, schema 3 for `supplement` in N2, schema 4 for `product` in B1), which pulls everything once without the first load state.
- Every mutation goes through `actions.ts`: validate with zod, stamp `updatedAt` with `Date.now()`, write memory, write IndexedDB, add the key to the outbox, wake the sync engine. Actions that delete return an undo function.
- Onboarding happens before sign-in. Answers live in the prefs draft so they survive the Google redirect. After sign-in and the first pull: if the account already has a profile, the draft is discarded. If not, the draft becomes the profile, program and first plan.

## 5. Sync protocol

The engine and both backends implement these rules. `tests/unit/sync-conformance.test.ts` checks them against any `Backend`.

1. **Push.** Take up to 100 outbox keys, send their records. On success remove each key whose local `updatedAt` still equals what was sent.
2. **Merge on the server.** A write replaces the stored row only if its `updated_at` is greater than the stored one. Otherwise it is ignored without error. Every accepted write gets a fresh `server_ts`.
3. **Pull.** Ask for rows with `server_ts` greater than the cursor minus 30 seconds, ordered by `server_ts`, 500 at a time, until a short page. The overlap covers writes that committed slightly out of order. Merging is idempotent.
4. **Merge on the device.** Accept a pulled record if there is no local copy, or its `updatedAt` is greater, or it is equal and the key is not in the outbox. The new cursor is the largest `server_ts` seen.
5. **Order.** Push, then pull. On a device with no cursor, pull everything before deciding whether to show onboarding.
6. **When.** 1.5 s after a local change, at start, when the app becomes visible, when the network returns, and every 5 minutes while visible. Failures back off from 2 s, doubling to 5 minutes, and reset on success.
7. **Status** shown in the header: `idle`, `syncing`, `offline`, `error`, `auth`. `auth` means the session expired. Data stays safe locally and the app asks the user to sign in again.
8. **Thumbnails.** After a meal with a thumbnail is saved, upload `meal-photos/<userId>/<mealId>.jpg` from the queue with retry. Another device downloads a thumbnail the first time its meal scrolls into view and caches it.
9. **Sign out.** If the outbox is not empty, try to sync and wait. Then sign out and delete the local store.

~~~ts
// src/lib/backend/types.ts
export interface Backend {
  auth: {
    session(): Promise<{ userId: string; email?: string } | null>;
    onChange(cb: (s: { userId: string; email?: string } | null) => void): () => void;
    googleEnabled(): Promise<boolean>;                 // false hides the Google button (M3)
    signInWithGoogle(): Promise<void>;                 // leaves the page
    sendEmailCode(email: string): Promise<void>;
    verifyEmailCode(email: string, code: string): Promise<void>;
    signOut(): Promise<void>;
  };
  push(records: Rec[]): Promise<void>;
  pull(cursor: string | null): Promise<{ records: Rec[]; cursor: string }>;
  putThumb(mealId: string, blob: Blob): Promise<void>;
  getThumb(mealId: string): Promise<Blob | null>;
  accessToken(): Promise<string | null>;               // for /api calls
}
~~~

`VITE_BACKEND=mock` selects `mock.ts`, which talks to `dev/mock-backend.ts`: an in memory implementation of the same rules, with a fake sign-in, isolated per test through a key in the request.

## 6. Database

~~~sql
-- supabase/migrations/0001_init.sql

create table public.records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  collection text        not null check (collection in
               ('profile','plan','weight','meal','saved','program','slog','checkin','day','food','supplement','product')),   -- 'food' from 0002, 'supplement' from 0003, 'product' from 0004
  id         text        not null check (char_length(id) between 1 and 80),
  data       jsonb       not null check (octet_length(data::text) <= 65536),
  updated_at bigint      not null,
  deleted    boolean     not null default false,
  server_ts  timestamptz not null default clock_timestamp(),
  primary key (user_id, collection, id)
);
create index records_pull on public.records (user_id, server_ts);

create function public.records_lww() returns trigger
language plpgsql as $$
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
revoke all on public.records from anon;
grant select, insert, update on public.records to authenticated;

create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  count   int  not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;   -- no policies: server only

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
~~~

The upsert from the client uses `onConflict: 'user_id,collection,id'`. Apply migrations with `supabase db push`. After applying, run the Supabase security advisors and fix anything they flag.

Supabase settings to make by hand or by CLI: Google provider on. Email one time code on, 6 digits, 10 minute expiry, with `{{ .Token }}` in the email template. Site URL set to production. Redirect allow list: `http://localhost:5173/**`, the production URL, and the project's Vercel preview pattern.

## 7. Server functions

All handlers live in `server/handlers/`, take a `Request`, return a `Response` with JSON, and read configuration through `server/env.ts`. Confirm Vercel's current signature for web standard handlers in non framework projects in M0 and write the three wrappers accordingly.

### POST /api/analyze

Header `Authorization: Bearer <access token>`. Body, at most 900 KB:

~~~ts
type AnalyzeRequest =
  | { kind: 'photo'; image: string /* base64 JPEG, 1024 px longest edge */; localDate: string; locale: 'en'; hint?: string }
  | { kind: 'text'; text: string /* at most 500 characters */; localDate: string; locale: 'en' }
  | { kind: 'label'; image: string /* a nutrition label, as a photo */; localDate: string; locale: 'en' };   // B1

// shared/analysis.ts
type AnalysisItem = {
  name: string; grams: number; portionNote: string;
  foodId: string | null; source: 'db' | 'estimate';
  per100: { kcal: number; protein: number; carbs: number; fat: number };
  kcal: number; protein: number; carbs: number; fat: number;
  confidence: 'high' | 'medium' | 'low';
  hiddenFat: boolean;
};
type AnalyzeResponse =
  | { ok: true; analysis: { title: string; items: AnalysisItem[]; model: string; raw: unknown }; usage: { usedToday: number; limit: number } }
  | { ok: false; error: 'bad_request' | 'unauthorized' | 'too_large' | 'not_food' | 'daily_limit' | 'busy' | 'provider_error' | 'timeout' };
~~~

A label (B1) answers `{ ok: true; label: LabelRead; model; usage }` instead of an analysis (`shared/analysis.ts`): its name if printed, `unit` g or ml, `servingG`, `scoops` per serving, `servingsPerPack`, and the `perServing` and `per100` columns, each null when not printed. A photo with no readable label is `not_food`. Label reads count toward the same daily quota.

Status codes: 200, 400, 401, 413, 422 for `not_food`, 429 for `daily_limit` and `busy`, 502, 504.

Steps, in order:
1. Verify the token with `supabase.auth.getUser(token)`.
2. Validate the body with zod.
3. Call `bump_ai_usage` with `AI_DAILY_USER_LIMIT`. If the day's total across users exceeds `AI_DAILY_GLOBAL_CAP`, return `busy`.
4. Build the prompt (section 8) and call the provider with a 20 s timeout and one retry on a 5xx or timeout.
5. Validate the model's JSON with zod. Keep at most 12 items. Clamp grams to 1 through 2000.
6. Resolve each item (section 8) and compute its totals.
7. Return. Log duration, model and item count. Never log the image or the text.

### DELETE /api/account

Verifies the token, deletes the user's objects under `meal-photos/<userId>/`, deletes their rows, then deletes the auth user with the secret key. Returns `{ ok: true }`.

### GET /api/cron/keepalive

Requires `Authorization: Bearer <CRON_SECRET>`. Runs one trivial query so the free project is not paused for inactivity. Scheduled daily in `vercel.json`.

`vercel.json` also holds the SPA fallback (everything except `/api/` and real files goes to `/index.html`) and long cache headers for hashed assets.

## 8. Vision pipeline

Provider interface:

~~~ts
// server/vision/provider.ts
export interface VisionProvider {
  analyze(input: { image?: Uint8Array; text?: string; catalog: string; locale: string; hint?: string }): Promise<ModelOutput>;
}
// server/vision/schema.ts, also sent to the model as the response schema
type ModelOutput = {
  is_food: boolean;
  title: string;
  items: Array<{
    name: string;
    grams: number;
    portion_note: string;
    food_id: string | null;
    est_per_100g: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
    confidence: 'high' | 'medium' | 'low';
    hidden_fat: boolean;
  }>;
};
~~~

System prompt, in `server/vision/prompt.ts`. Tune it against real photos in M6, keep the rules:

~~~
You identify food for a nutrition log. Reply with JSON only, matching the schema.

- When a whole dish is in the catalog (pad thai, khao man kai, pad kra pao pork with rice and fried egg, boat noodles), give it as one item with that food_id rather than its parts. Otherwise list each distinct component as its own item (rice, curry, fried egg).
- For each item estimate the edible weight in grams as served. Use visible cues: plate and bowl size, cutlery, hands, packaging. Give your single best number.
- If an item matches a catalog entry, set food_id to that entry's id. Match the food and how it was cooked. If nothing fits well, set food_id to null.
- Always fill est_per_100g from your own knowledge of the food as cooked.
- Set hidden_fat to true for items likely cooked in or dressed with oil, butter, coconut milk or sugar that a photo cannot show.
- Names are short and plain, in the user's language. No brand names unless printed on packaging.
- If there is no food or drink, set is_food to false and return no items.
- Do not give advice. Do not total the meal.

Catalog, one entry per line as id|name:
~~~

The catalog is the food table's `id|name` lines, built once at module load. Gemini settings: the model from `GEMINI_MODEL`, JSON response type with the schema, thinking level minimal, default temperature. The `mock` provider returns fixtures from `tests/fixtures/vision/` chosen by a hash of the input, including a not food case and a failure case.

Resolution, in `server/vision/resolve.ts`:
- `food_id` present in the table: `per100` comes from the table and `source` is `db`.
- Otherwise `per100` comes from `est_per_100g` and `source` is `estimate`. Clamp kcal to 0 through 900 and each macro to 0 through 100. If kcal differs from `4p + 4c + 9f` by more than 25 percent, recompute kcal from the macros.
- Item totals are `per100` times grams over 100, rounded to whole kcal and one decimal for macros.

**Label reading (B1, F22)**, in `server/vision/label.ts`: the same provider with `label: true`, its own system prompt and schema (`labelOutput`, also the response schema). The model copies printed numbers only and returns null for anything not printed: `per_serving` and `per_100` columns of kcal, kJ, protein, total carbohydrate and total fat, the serving size, scoops per serving, servings per pack, the unit and the printed name; it knows the Thai label terms. `toLabel` takes kcal from kJ (4.184, SCIENCE S19) when only kilojoules are printed, a missing macro as 0, drops a per 100 column past 1,000 kcal, and answers `not_food` when no column has energy. The mock provider answers `label-snack` (or the fixture a test names: `label-whey`, `not-label`).

On the device before upload: draw the capture to a canvas at 1024 px on the longest edge, export JPEG at quality 0.8, which also strips location data. Make the 320 px thumbnail at quality 0.7 from the same canvas. Capture uses `<input type="file" accept="image/*" capture="environment">`, the reliable path on iPhone.

## 9. Food table

`src/lib/data/foods.json` is generated by `pnpm foods:build` and committed. Nobody types a nutrient value.

~~~ts
type Food = {
  id: string;                 // slug, stable forever
  name: string;               // plain display name; a Thai dish by its common romanised name
  aliases: string[];          // search terms, Thai script included
  per100: { kcal: number; protein: number; carbs: number; fat: number; fiber?: number };
  portions: Array<{ label: string; grams: number }>;   // first is the default
  tags: Array<'dense' | 'protein' | 'drink' | 'oil' | 'staple' | 'thai'>;
  source: { set: 'usda-sr-legacy' | 'usda-fndds' | 'sg-foodid' | 'thai-fcd' | 'thai-fcd-owner'; id: string;   // the food's id in that table
            url?: string;                 // a Thai FCD page the values were read from (N3)
            derived?: 'kcal' | 'carbs' }; // worked out by Atwater because the Thai row lacked it (N3)
};
~~~

- `data/food-list.csv` is the curated list: `id, name, aliases, source_id, portions, tags`. A numeric `source_id` is a USDA FoodData Central id, looked up in SR Legacy, then FNDDS; one like `F05060092` is an SG FoodID id; `owner:T102` and `inmu:T184` are Thai FCD codes (N3). Claude drafts the list (M5, N1) and the script validates every id against the data.
- Four tables (N1, N3; sources and terms in `docs/DECISIONS.md`):
  - USDA SR Legacy (2018) and FNDDS 2021 to 2023 (public domain, CC0): the script downloads their CSV archives into `data/usda/` and `data/usda/fndds/` (gitignored). FNDDS names nutrients by number (208 energy), SR Legacy by id (1008).
  - SG FoodID, Health Promotion Board, Singapore (licence: use and redistribution, commercial or not, with a conspicuous notice of the source and a link to the terms): no bulk file, so the API's answer for each listed food (`https://pphtpc.hpb.gov.sg/bff/v1/food-portal/foods/details/<id>`) is kept verbatim in `data/sgfoodid/foods.json` with its URL and the date read, under `foods.json.sha256`. The script fetches a listed food the extract lacks and fails if the file no longer matches its checksum. Values are `baseFoodNutrients`, per 100 g edible portion; null or a negative number is missing.
  - Thai Food Composition Database, INMU, Mahidol University (N3; terms and the owner's decision in `docs/DECISIONS.md`), two ways in. `owner:<code>` is a row of the extract the owner supplied, `data/thai/owner/nutrition_dataset.csv` (per 100 g, "-" missing), under `nutrition_dataset.csv.sha256`. `inmu:<code>` is the database's online page for that food: the server's answer (`foodsearch/food_name_result?selected_id=<id>&selected_dbcode=STD`) kept verbatim in `data/thai/inmu/<code>.html`, listed in `data/thai/pages.json` with the page URL, the date read and a SHA-256. The script finds a missing page's id in its food group's list, fetches it (one a second) and fails on a page that no longer matches its checksum. A page's energy is read with the carbohydrate it was worked from: available, or where the page has neither, total.
  - A Thai row lacking energy gets 4p + 4c + 9f, one lacking carbohydrate gets (energy - 4p - 9f) / 4, and `source.derived` says which. A row is left out, with the reason in the build's output, when its energy is more than 25 percent or 40 kcal from 4p + 4c + 9f, or its derived carbohydrate is below -2 g (`C.tableKcalTolerance`, `C.derivedCarbsMin`); a few rows are left out by hand with the reason in the script (`OWNER_OUT`).
- The script reads energy, protein, carbohydrate, fat and fibre for each listed food and writes the JSON. It fails on a missing id or a missing nutrient (fibre is optional). A unit test checks the extract's checksum and that every SG FoodID food carries its values exactly.
- Search's portion step cites the food's table under the numbers (`FOOD_SOURCES` in `src/lib/data/sources.ts`); for SG FoodID with the date read and a link to its terms, for a Thai FCD page with the date read and a link to that page. The citation hides while the numbers are the user's own.
- Coverage: 670 foods (N2 added soy protein powder, the Plant protein preset; N3 98 Thai foods from the Thai FCD). v1 asked for at least 350: staples and grains cooked and raw (40), meat, poultry, fish and eggs by common cut and cooking method (70), dairy and alternatives (30), fruit (40), vegetables (50), legumes, nuts and seeds (30), oils, fats and sauces (25), breads, noodles and breakfast foods (30), snacks and sweets (20), drinks (15). At least 25 foods carry the `dense` tag for gain mode. N1: at least 80 carry `thai`, each with a Thai script alias (138 at N1, 236 at N3). N3: at least 60 read their values from the Thai FCD (115).
- Two entries have fixed ids used by the oil control: `oil-vegetable` and `butter`.
- Search on the device is a small scored match over `name` and `aliases`: prefix beats word start beats substring, shorter names win ties. No library. Normalising keeps Thai script (U+0E00 to U+0E7F); Thai has no spaces, so a Thai query matches by prefix or substring.

## 10. Exercise library and templates

`src/lib/data/exercises.ts` exports at least 60 exercises:

~~~ts
type Muscle = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core';
type Exercise = { id: string; name: string; primary: Muscle[]; secondary: Muscle[]; equipment: 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other' };
~~~

Every muscle has at least four exercises where it is primary. A unit test checks the schema, unique ids and coverage. `templates.ts` holds the four programs named in the PRD, each built from library ids, each landing inside the bands in `docs/SCIENCE.md` section 11 when analysed. A test asserts that.

## 11. Client notes

- **Start.** An inline script in `index.html` sets the theme and text size before first paint. The shell mounts. If prefs name a last user, the local store opens and Today renders from memory. The backend module then loads lazily, restores the session and starts sync. With no last user the welcome screen shows.
- **Lazy chunks.** Only the shell and Today load at first. Train, Progress, settings, the add flow, the chart, the food table, the exercise library and supabase-js are separate chunks, preloaded when idle and precached by the service worker.
- **Dates.** `dates.ts` is the only place that touches `Date`. It exposes `today()`, `addDays`, `weekdayOf`, `weekStart`, and formatting. Tests run with `TZ=Asia/Bangkok` and one suite repeats under `TZ=America/Los_Angeles`.
- **Units.** Stored in kg, cm and kcal. `units.ts` converts for display only.
- **Numbers.** `format.ts` formats every number: grouping for kcal, one decimal for kg, no trailing zeros.

- **Barcodes (B1, F22).** `src/lib/barcode.ts` checks the GS1 check digit and turns any read or typed code into the product id. `src/lib/scanner.ts` reads with the browser's `BarcodeDetector` when it supports EAN-13, EAN-8, UPC-A and UPC-E (Chrome on Android), otherwise with zxing-cpp compiled to WebAssembly through the `barcode-detector` ponyfill (3.2.3, MIT, on `zxing-wasm` 3.1.6, MIT; a unit test keeps the two versions matched). Both load when the scanner opens; the 947 KB WebAssembly (414 KB gzip) is served from the site and cached by the service worker on first use, not precached. The camera is `getUserMedia` with the rear camera; denial, no camera, a page that is not secure and a camera in use each have their own words and fall back to typing on the number pad. The light shows only where the track reports `torch`.
- **Open Food Facts (B1).** `src/lib/data/off.ts` reads `world.openfoodfacts.org/api/v2/product/<code>` straight from the browser with a short `fields` list and `X-User-Agent: Ontrack/<version> (https://ontrack-black.vercel.app)`, 8 s timeout. `findProduct` asks the user's products first. On the mock backend the same path is answered from `tests/fixtures/off/` under `/__mock/off`.

## 12. PWA

Port watermelon's vite-plugin-pwa setup. Manifest: name and short name Ontrack, `display: standalone`, start URL and scope `/`, background and theme colour from the canvas token with a dark variant through `theme-color` meta tags, icons generated from `design/brand/app-icon.svg` by `pnpm icons`. Register with a prompt: when a new worker is waiting, show the update toast. Navigation falls back to `index.html`. `/api/` is never cached. `scripts/check-pwa.mjs` verifies the manifest, the service worker and an offline reload. Nothing in the interface asks anyone to install the app (D1).

## 13. Tests

| Kind | Where | What |
| --- | --- | --- |
| Unit | `tests/unit/engine.test.ts` | Every vector in `docs/SCIENCE.md` section 13, plus caps, floors and guardrails |
| Unit | `tests/unit/checkin.test.ts`, `trend.test.ts`, `day.test.ts`, `program.test.ts` | Check-in decisions, regression slope, day totals and on track status, program analysis |
| Unit | `tests/unit/sync-conformance.test.ts` | Section 5 rules against the mock always, and against Supabase when `SUPABASE_TEST_EMAIL` is set |
| Unit | `tests/unit/resolve.test.ts`, `foods.test.ts`, `data.test.ts` | Vision resolution and clamps, food search ranking, library and template validity |
| End to end | `tests/e2e/*.spec.ts`, WebKit at 390 by 844, light and dark | One spec per feature F1 to F13 against the mock backend, including offline log then reconnect |
| Camera | `tests/e2e/camera.spec.ts`, project `camera`, Chromium | A barcode read by a fake camera playing `tests/fixtures/barcodes/scan.y4m`, with the browser's reader and with the WebAssembly reader (B1). Full CI only |
| Screens | `tests/e2e/screens.spec.ts`, project `screens` | Every screen and sheet in its main states, written to `screenshots/` |
| Stress | project `stress` | Phone sizes in Safari with its toolbars and three text sizes: no overflow, no clipped text, tap targets, sheet actions on screen |
| Production | project `prod`, run by hand | Sign in with the test account, one write, verify in the database, delete |

`pnpm verify` runs check, unit tests, build, and the end to end specs tagged `@smoke`.

## 14. Environment

| Variable | Side | Purpose |
| --- | --- | --- |
| `VITE_BACKEND` | browser | `mock` or `supabase` |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | browser | Supabase client |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | server | Token verification, quota, account deletion |
| `VISION_PROVIDER` | server | `mock` or `gemini` |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | server | Vision. Development uses a free tier key. Production uses the billed project |
| `AI_DAILY_USER_LIMIT`, `AI_DAILY_GLOBAL_CAP` | server | Quotas, default 40 and 400 |
| `CRON_SECRET` | server | Keep-alive |

## 15. Errors and diagnostics

- Every failure the user can meet has a message in the catalog that says what happened and what to do next. No raw error text reaches the screen.
- The app keeps the last 50 errors and sync events in memory and in prefs. Settings, Report a problem copies them with the app version and device details.
- No third party analytics or trackers in v1.
