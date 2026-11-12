# State

Handoff note between contexts. Read first, update last. Keep it under one screen.

## Milestones

Status is one of: not started, in progress, shipped, shipped with cuts, blocked.

| | Milestone | Status | Branch or pull request | Note |
| --- | --- | --- | --- | --- |
| M0 | Foundations | shipped with cuts | PR #4, merged, `v0.0.0` | Supabase MCP not added (needs browser sign in). `foods:build` waits for M5 |
| M1 | Design system | shipped | PR #5, merged, `v0.1.0` | Rubric pass stands in for the owner's approval; gallery is on his review list |
| M2 | Engine | shipped | PR #6, merged, `v0.2.0` | 19 sources checked; 3 values kept against their source, on the owner's review list |
| M3 | Data, sync, sign-in | shipped with cuts | PR #7, merged, `v0.3.0` | Conformance green on mock and live. Live sign in blocked: no Google client, no SMTP for codes. No Privacy and Terms line |
| M4 | Onboarding and plan | shipped with cuts | PR #8, merged, `v0.4.0` | Gate green on the mock. Saving on production waits for live sign in (M3 blockers). Templates without muscle balance until M7 |
| M5 | Today and logging | shipped with cuts | PR #9, merged, `v0.5.0` | Gate green on the mock. Three meals do not fit 390 by 844 without scrolling (as in the M1 reference). No install notice card, no deleting a saved meal |
| M6 | Photo logging | shipped with cuts | PR #10, open | Gate green on the mock. Eval on ten Commons photos with `gemini-3.6-flash`; deployed end to end timing not measured (free tier daily cap) |
| M7 | Training | not started | | |
| M8 | Progress and check-ins | not started | | |
| M9 | Hardening and release | not started | | |

## What is real and what is mocked

- Repository: real. `github.com/JedizR/ontrack`, private. CI (`.github/workflows/ci.yml`) runs on every pull request. No branch protection (GitHub Free).
- Hosting: real. Vercel `jedizrs-projects/ontrack`, Hobby, Git connected. Previews sit behind Vercel Authentication. Production domain `ontrack-black.vercel.app` goes live on the first merge to `main`.
- Database: real. Supabase `ontrack`, ref `sbexrpzbzkzofnbpaauu`, Singapore, free plan. Migration `0001_init.sql` applied. Security advisors clean.
- Keep-alive: real. `/api/cron/keepalive`, daily 03:17 UTC, answered 200 on the preview.
- Sync and account deletion: real, checked by `pnpm test:live` (the conformance suite against the project, test users made and deleted). Security advisors clean.
- Sign in: built for both providers, live on neither yet. Google provider off (no OAuth client; the app hides the button). Email codes need custom SMTP before Supabase lets the template carry the code. Both are in `docs/BLOCKERS.md`. Auth settings (site URL, redirects, 6 digit codes, 10 minutes, 30 s resend) are pushed.
- Vision: real. `/api/analyze` with `gemini-3.6-flash`, minimal thinking. Vercel holds `VISION_PROVIDER=gemini`, `GEMINI_MODEL`, and `GEMINI_API_KEY` (the development key, free tier: 20 requests a day per model) for production and preview, plus `VITE_BACKEND=supabase`, the Supabase URL and keys, and `CRON_SECRET`. The key's file is `~/.config/ontrack/gemini-api-key`; `scripts/live-env.sh` reads it for `dev:live` and `eval:vision`.

## Notes for the next milestone

- Open since M5 (for M9 if not sooner): the smoke run's returning-user test logs a console error "onboarding failed to load" while still passing. Find the cause.

- Engine (M2): `src/lib/model/engine/`, import from `$lib/model/engine`. `plan(input)` returns the numbers a stored Plan carries (add `effectiveFrom`, `tdeeSource`, `source`). Derive, never store: `dayTarget(plan, { sex, mode, weekday, skipped })`, `dayMacros`, `tdeeAvg`, `effectiveRate`, `calorieStatus`, `proteinOnTrack`. Onboarding uses `guardrails`, `paceOptions`, `defaultPace`. `checkin(...)` returns stats, proposal and the new plan; `checkinDue`. `analyseProgram(sessions, { goal, experience, library: LIBRARY })` returns findings with `kind` and `source`; M7 words them in `en.ts`.
- The engine takes day numbers, not date strings, and age, not birth year. `dates.ts` (M3 or M5) converts.
- Every number is in `constants.ts` as `C` (value, unit, source, status, note) and `V` (values). The Science screen (M9) reads `C` and `docs/SOURCES.md`. An invariant test fails on any numeric literal but 0 and 1 in engine files.
- `src/lib/data/exercises.ts` (71 exercises, `LIBRARY` by id) and `templates.ts` (four programs; `Session` there matches TECH-SPEC, move it to `shared/records.ts` in M3).

- Node 22: run `nvm use` first. The machine default is 24.
- Components (DESIGN.md section 7) are in `src/lib/components/`: `Button` (variant, size lg/md/sm, full), `Card` (hero, list), `Row` (title, caption string or snippet, value, leading, trailing, onclick), `Chip`, `Segmented`, `Stepper`, `Track` (value, target, zone [from, to], hero, label), `HeroNumber`, `WeekStrip`, `SourceLabel`, `SyncMark` (Header takes `sync`), `EmptyState`, `Skeleton`, `Toasts`, `Sheet` (footer snippet is the pinned action), `KeypadSheet` with `keypad.ask()` from `src/lib/keypad.svelte.ts`, `TrainIcon`, `TrackIcon`. Build screens from these.
- `KeypadSheet` is mounted only in the gallery so far; mount it once in `App.svelte` when a screen first uses `keypad.ask()`. Same for any shared sheet.
- `/gallery` and `/gallery/today` exist on dev, local builds and previews (`__GALLERY__`), never production. `src/gallery/TodayComposed.svelte` is the layout M5's Today should follow; its numbers are sample fixtures.
- `src/lib/actions.ts` holds `undoToast` and `dismissUndo` only. `src/lib/model/format.ts` has `num`. Captions that continue a number go under `after` in `en.ts`.
- Tests: `tests/e2e/app.spec.ts` covers the gallery's keypad, sheet, track, stepper, toast and prefs. `screens.spec.ts` shoots each gallery section, the interaction states, and `screenshots/xl/` (SE at the largest text). `stress.spec.ts` runs the layout checks on the gallery, the composed Today and the open keypad at every device and text size.
- Unselected tab labels are `--ink-2` now (M0 open item settled).
- Playwright's WebKit does not draw `backdrop-filter`; the dock looks unblurred in screenshots. The owner checks it on the phone.
- Checking a preview: `vercel curl <path> --deployment <url>`. `check:pwa` and Playwright with `E2E_BASE_URL` read `VERCEL_AUTOMATION_BYPASS_SECRET`. `vercel curl` makes one on the project if none exists.
- `.env.local` holds `SUPABASE_DB_PASSWORD` and `VERCEL_OIDC_TOKEN`; never `vercel env pull .env.local` over it. `pnpm dev:live` and `pnpm test:live` take keys from the Supabase CLI (`scripts/live-env.sh`), nothing on disk. Local `pnpm build` uses the mock (`.env.local` seems to set `VITE_BACKEND=mock`); Vercel builds use Supabase.

M3 (data, sync, sign-in):
- Records and zod/mini schemas in `shared/records.ts` (`ids` makes the deterministic ids). Store `src/lib/db/store.svelte.ts` (`db.live(c)`, `db.get(c, id)`, maps in `db.data`), sync `src/lib/sync/engine.svelte.ts` (`sync.status`, `sync.pulled`), backends in `src/lib/backend/`, session in `src/lib/session.svelte.ts` (`session.user`, `session.backend`). Screens read the store; writes go through `src/lib/actions.ts` (profile, plan, program, weight, meal, thumb, saved, session log, check-in, day; deletes return undo; `undoToast` for the toast).
- The store opens only for a signed in user. M4's onboarding draft lives in prefs (`ot-ui`, which now also holds `lastUser` and `lastEmail`) and becomes records after the first pull (`sync.pulled`).
- `SignInSheet` takes a `title` ("Save your plan" for M4). App-wide sheets open through `sheets` in `src/lib/sheets.svelte.ts`; they are lazy chunks mounted in `App.svelte`. The avatar opens the account sheet (`src/settings/AccountSheet.svelte`); M9's Settings takes it over and adds the Privacy and Terms line to the sign in sheet.
- Mock backend: `dev/mock-backend.ts`, code 123456, spaces per test (`useSpace`, `signIn` in `tests/e2e/helpers.ts`), `POST /__mock/expire`. `window.ontrack` in dev for tests that log data before the screens exist.
- `DELETE /api/account` is real (`server/handlers/account.ts`), mounted on the dev server for `dev:live`.
- Branch `pr-assets` holds PR screenshots only; never merge it.

M4 (onboarding and plan):
- `App.svelte` decides the screen: `onboarding` (no store, or signed in and pulled with no profile) mounts the lazy `src/flows/onboarding/Onboarding.svelte`; otherwise the shell. A saved draft meets the account in `settle.ts` after the first pull.
- Draft and its logic: `src/flows/onboarding/draft.ts` (pure: `route`, `inputOf`, `paceChoices`, `programOf`, `toRecords`). `actions.finishOnboarding` writes profile, program, plan and the first weigh-in.
- Reuse for Today and How it is calculated: `src/lib/model/day.ts` (`targetWith`, `targetParts` whose lines sum to the target, `trainingDayEee`, `evenEee`, `kgPerWeek`), `src/lib/model/units.ts` (`weightText`, `heightText`, conversions), `src/lib/model/dates.ts` (`today`, `nowIso`, `yearOf`, `weekdayOf`; M5 adds the rest), `src/lib/data/sources.ts` (short names and citations).
- `KeypadSheet` is now mounted once in `App.svelte` (lazy). New components `Switch` and `Wordmark`.
- Tests: `open(page)` signs in to a seeded onboarded account (vector A, 60 kg weigh-in on `TODAY`); `openFresh`, `toWelcome`, `seedAccount`, `onboard(page, answers)`, `keypadEnter` in `tests/e2e/helpers.ts`. `onboarding.spec.ts` runs in the light project; stress walks onboarding on every phone and text size.
- Gate evidence: 13 onboarding tests (each goal, each guardrail, returning user, draft discarded, signed in without a plan, reload). An automated run takes about 10 s; the hardgainer path is 25 taps and 9 keypad digits before sign in.

M5 (Today and logging):
- Food table: `data/food-list.csv` (512 foods, `id,name,aliases,fdc_id,portions,tags`, lists split by `|`) -> `pnpm foods:build` (`scripts/build-foods.ts`, downloads SR Legacy into `data/usda/` when missing) -> `src/lib/data/foods.json`. `src/lib/data/foods.ts`: `loadFoods()` (lazy chunk, precached), `searchFoods`, `itemFor(food, grams)`. `oil-vegetable` and `butter` exist for M6's oil control; 127 foods carry `dense` for M9's easy adds.
- Day math in `src/lib/model/day.ts`: `planFor`, `dayView` (target, band, macros, eaten, status, training, sessions), `totals`, `mealSource`, `recentMeals`, `recentFoods`, `weighInDue`. Engine gained `calorieBand` and `proteinBand`. `dates.ts` gained `addDays`, `daysBetween`, `lastWeek`, `timeOf`, `atTime`, `dayTitle`, `stampOn`.
- `view` (`src/lib/view.svelte.ts`): the day on screen and the day the plus logs to; resets to today when leaving the Today tab; follows the clock.
- Logging sheets live in `src/flows/log/`, mounted together by `LogSheets.svelte` (lazy, in `App.svelte`). Open them through `sheets` (`add`, `search`, `quick`, `how`, `meal` id, `session`). Search in pick mode: set `sheets.pick = (item) => ...` before `sheets.search = true`; Add hands back the item (Replace and Add an item in the Meal sheet). M6 adds the Photo and Describe tiles to `WAYS` in `AddSheet.svelte` and builds Review from the Meal sheet's item rows and `items.ts` (`Line`, `scaled`, `PORTIONS`).
- Actions added: `logAgain`, `logSaved` (returns its undo), `saveAsMeal`. `SwipeRow` deletes on a left swipe; `swipe.ts` takes `commit` and lets an element that owns its gesture keep it.
- The How it is calculated breakdown is `src/flows/plan/Breakdown.svelte`, shared by Your plan and Today.
- Tests: the seed now carries a program (strength Monday, Wednesday, Friday, Saturday). `open(page, '/', MEALS)` adds a typical day (1,840 kcal on TODAY, 2,300 the day before, one saved meal). `today.spec.ts` (light project) covers F3, F5, F6 and offline logging. On the dev server lazy chunks load on demand, so an offline test opens Search once before going offline. Stress has `logging layout holds` per device and at the largest text.
- Not built, on purpose: easy adds and Finish day (M9 per the build plan), the check-in card (M8), thumbnails in the meal list (M6).

M6 (photo logging):
- Server: `server/handlers/analyze.ts` takes its dependencies (`Deps`: caller, bump, provider, limits) so `dev/mock-backend.ts` answers `/api/analyze` with the same handler; `liveDeps()` is Supabase. `server/quota.ts` (`bump_ai_usage` plus the day's rows), `server/vision/` (`provider.ts` picks by `VISION_PROVIDER`, `gemini.ts`, `mock.ts`, `prompt.ts`, `schema.ts`, `resolve.ts`). Wire types in `shared/analysis.ts`. The quota counts on the server's UTC day.
- Mock vision: fixtures in `tests/fixtures/vision/` (basil pork, chicken rice, oats, not food, fail). Tests set the answer with `vision(page, space, { fixture, used })` from `tests/e2e/helpers.ts` (`POST /__mock/vision`); `open()` now returns the space; `takePhoto(page, notice?)` drives the hidden file input. `tests/fixtures/meal.jpg` is a drawn plate.
- Client: `src/lib/photo.ts` (`preparePhoto`), `analyzeMeal` and `logReviewed` in `actions.ts`, `sheets.review` and `sheets.describe`, `ReviewSheet.svelte`, `DescribeSheet.svelte`, `ItemList.svelte` (shared with the Meal sheet), `Thumb.svelte` (Today rows and the Meal sheet). `prefs.photoOk` remembers the notice. Thumbnails are stored as bytes in IndexedDB (WebKit private mode refuses Blobs).
- Tests: `tests/unit/analyze.test.ts`, `resolve.test.ts`; `tests/e2e/photo.spec.ts` (light project: success with oil and Save meal, not food, provider failure, limit with Add by hand, offline, Describe); a `photo` case in `screens.spec.ts`; the review sheet in stress's logging walk. CI's timeout is 40 minutes.
- Evaluation: `pnpm eval:vision <folder> [<out>]` (`scripts/eval-vision.ts`, macOS `sips` to resize). Ten Wikimedia Commons photos, results in `docs/EVAL-NOTES.md`; photos 2 and 8 still need the tuned prompt's pass, and the owner's own ten meals are still to run. Not measured: the deployed median time to a review (the free tier's 20 a day ran out). The production key with billing is M9.
- For M9: deleting a photo meal (or Undo) leaves its thumbnail in storage until the account is deleted; delete it with the meal. The Add sheet's Recent and Saved rows have no leading tile (design critic). Alcohol is outside the 4p + 4c + 9f check.

