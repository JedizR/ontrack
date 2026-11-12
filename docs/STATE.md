# State

Handoff note between contexts. Read first, update last. Keep it under one screen.

## Milestones

Status is one of: not started, in progress, shipped, shipped with cuts, blocked.

| | Milestone | Status | Branch or pull request | Note |
| --- | --- | --- | --- | --- |
| M0 | Foundations | shipped with cuts | PR #4, merged, `v0.0.0` | Supabase MCP not added by the run (needs browser sign in); the owner connected it later. `foods:build` waits for M5 |
| M1 | Design system | shipped | PR #5, merged, `v0.1.0` | Rubric pass stands in for the owner's approval; gallery is on his review list |
| M2 | Engine | shipped | PR #6, merged, `v0.2.0` | 19 sources checked; 3 values kept against their source, on the owner's review list |
| M3 | Data, sync, sign-in | shipped with cuts | PR #7, merged, `v0.3.0` | Conformance green on mock and live. Live sign in unblocked after the run's M6 (Google client, SMTP). No Privacy and Terms line |
| M4 | Onboarding and plan | shipped with cuts | PR #8, merged, `v0.4.0` | Gate green on the mock. Live sign in now works, so production saves plans. Templates without muscle balance until M7 |
| M5 | Today and logging | shipped with cuts | PR #9, merged, `v0.5.0` | Gate green on the mock. Three meals do not fit 390 by 844 without scrolling (as in the M1 reference). No install notice card, no deleting a saved meal |
| M6 | Photo logging | shipped with cuts | PR #10, merged, `v0.6.0` | Gate green on the mock. Eval on ten Commons photos with `gemini-3.6-flash`; deployed time to a review 4.8 s on the one full sample (free tier limits) |
| M7 | Training | shipped | PR #11, merged, `v0.7.0` | Gate green on the mock. Drag on a real phone, and whether the recommendations fit the owner's program, are on his review list |
| D1 | Design refresh (owner, after M7) | shipped | PR #12, merged, `v0.7.1` | OneFin identity in light and dark, wheels and typed steppers instead of the keypad, browser first (no install guide). The look by eye and the wheels by thumb, and the template licence, are on the owner's list |
| M8 | Progress and check-ins | shipped | PR #13, merged, `v0.8.0` | Gate green on the mock: one test per check-in reason on the seeder, vectors F and G on screen. Whether each seeded sentence matches its numbers is on the owner's list |
| N1 | Thai foods and remembered nutrition (owner, after M8) | not started | | F14, F15. Thai table from a published source, corrections remembered and labelled Yours |
| L1 | Landing page (owner, after N1) | not started | | For signed-out visitors, OneFin style with scroll animations; replaces Welcome |
| S1 | Friends, profiles and the food map (owner, after L1) | not started | | F16, F17. Friends by request, optional program on the profile, opt-in meal photos on a map at rounded photo locations |
| M9 | Hardening and release | not started | | |

## What is real and what is mocked

- Repository: real. `github.com/JedizR/ontrack`, private. CI (`.github/workflows/ci.yml`) runs on every pull request. No branch protection (GitHub Free).
- Hosting: real. Vercel `jedizrs-projects/ontrack`, Hobby, Git connected. Previews sit behind Vercel Authentication. Production domain `ontrack-black.vercel.app` goes live on the first merge to `main`.
- Database: real. Supabase `ontrack`, ref `sbexrpzbzkzofnbpaauu`, Singapore, free plan. Migration `0001_init.sql` applied. Security advisors clean.
- Keep-alive: real. `/api/cron/keepalive`, daily 03:17 UTC, answered 200 on the preview.
- Sync and account deletion: real, checked by `pnpm test:live` (the conformance suite against the project, test users made and deleted). Security advisors clean.
- Sign in: real. Google (OAuth client in project `ontrack-514502`, Testing, one test user) and 6 digit email codes over the owner's Gmail SMTP. Auth settings (site URL, redirects, 6 digit codes, 10 minutes, 30 s resend, code templates) are pushed; Google and SMTP are not declared in `supabase/config.toml`, so pushes leave them alone.
- Vision: real. `/api/analyze` with `gemini-3.6-flash`, minimal thinking. Vercel holds `VISION_PROVIDER=gemini`, `GEMINI_MODEL`, and `GEMINI_API_KEY` (the development key, free tier: 20 requests a day per model) for production and preview, plus `VITE_BACKEND=supabase`, the Supabase URL and keys, and `CRON_SECRET`. The key's file is `~/.config/ontrack/gemini-api-key`; `scripts/live-env.sh` reads it for `dev:live` and `eval:vision`.

## Notes for the next milestone

M8 (progress and check-ins):
- Model: `src/lib/model/progress.ts`. `accountOf(db)` (inside a `$derived`) or `account(records)` gives `first`, `day(date)` (target, intake, protein, items, complete, onTrack), `weeks(end, n)` (seven-day blocks ending on `end`, averages over complete days), `points` and `trendOn(date)` (the S17 trend), and `checkinOn(date)`, the engine's check-in on that day's plan, rebuilt on tomorrow's exercise energy when a program change waits. `checkinDueOn(plans, weekday, date)`: an `edit` plan does not restart the 14 days, which count the check-in day. Both M8 decisions are in `docs/DECISIONS.md`.
- Screens: `src/tabs/Progress.svelte` (range, weight with `TrendChart`, maintenance once measured, intake with `WeekBars`, consistency dots, check-ins, History), `src/flows/checkin/CheckinSheet.svelte` (lazy in `App.svelte`, opened by `sheets.checkin = date`; a stored date opens read only), `src/flows/progress/HistorySheet.svelte` (a day opens in Today). Today shows the check-in card before the weigh-in card. Words under `t.progress`, `t.checkin`, `t.history`.
- Action: `decideCheckin(date, result, decision?)` writes the plan from the next day (`source: 'checkin'`, `tdeeSource: 'measured'`, sessions and goal weight carried) and the record.
- Seeder: `dev/seed.ts`, `seedRecords(outcome, today)` for `raise` (vector F), `adherence` (vector G), `on_track`, `lower`, `need_data`. On `pnpm dev`, sign in as `<outcome>@seed.test` (code 123456) for that account. Tests: `openSeeded(page, outcome)`; `seedAccount` takes `account` instead of SEED and pushes in batches of 100. Engine imports now end in `.ts`.
- Tests: `tests/unit/progress.test.ts`, `tests/e2e/progress.spec.ts` (light project), `progress` and `progress adherence` in `screens.spec.ts`, `progress layout holds` in stress per device and at the largest text.
- For M9: Settings' check-in day should keep `checkinDueOn` as the one rule. Nothing from M8 is cut; the chart has no scrubbing or tooltip (not in the spec).

D1 (design refresh):
- The look is OneFin's: `docs/DESIGN.md` (rewritten) and `design/tokens.css`. Theme names: `accent*` (violet: the primary button and the dock's plus only), `success` (green fill of a reached track), `success-ink` (On track words and dots), `accent-soft` with `on-accent-soft` (lavender icon tiles), `track` (empty track). Utilities in `src/app.css`: `pill-accent` and `pill-ink` (3D faces, with `-down` for pressed), `shadow-card`, `shadow-float`, `tile`, `input-field`, `bar-glass`, `appear` (fade up once, `--i` staggers), `num` (Geist tabular). Text styles `hero`, `display`, `title`, `heading`, `eyebrow` are Roboto Condensed 900 (the last three in CSS capitals); `lead`, `body`, `callout`, `caption` are Geist. Radii `xs 8, sm 16, control 20, md 24, lg 32, sheet 40, xl 48`. Gutter 16 (`px-4`), inside cards and sheets 24 (`px-6`, rows use `-mx-6`).
- Buttons: `variant` primary, secondary (dark pill, one per screen), neutral, plain, danger; `size` lg 56, md 48, sm 36 in 44. Sheets take `onback` and `backLabel` for a stepped sheet.
- Inputs: `Wheel` (`value`, `min`, `max`, `step`, `decimals`, `unit`, `band`, `onclamp`), `picker.ask({...})` from `src/lib/picker.svelte.ts` opens `WheelSheet` (mounted lazily in `App.svelte`) and answers a number, 0 for Clear, or null; `range(typed)` words a clamped typed value. Use it for M8's profile edits (Settings, M9). `Stepper` numbers can be typed. Maths in `src/lib/wheel.ts`; starts in `START` and weight ends in `weightWheel()` in `src/flows/onboarding/draft.ts`.
- Browser first: nothing mentions installing; `isStandalone` and the install guide are gone. Layout uses `svh` for page heights and the dock sits 12 above the safe area.
- Tests: `wheelType(page, testid, value)` (Enter on the column, type, Enter), `pickerSave`, `fieldFill` in `tests/e2e/helpers.ts`. Viewports are Safari's: the phone projects are Playwright's iPhone 13 (390 by 664); stress uses 393 by 659, the SE 375 by 548 and the Pro Max 430 by 739. `today.spec.ts` checks the hero stays above the dock at 390 by 664 and 375 by 548. `tests/unit/contrast.test.ts` checks token pairs.
- CI: the e2e step took 32 minutes on D1's first run, so the job's timeout is now 60 minutes and the `screens` project shoots at scale 2. Shard Playwright if it grows past 45.
- For M8: the Progress tab and the check-in card should use the same cards, figures in Display, and `success-ink` for "On track" words. The consistency dots in SCREENS.md section 9 now name `--success-ink`.


M7 (training):
- Train tab `src/tabs/Train.svelte` (summary, week, analysis, the drag), sheets in `src/flows/train/` (`SessionSheet`, `ExercisePicker`, `TemplatesSheet`), mounted by the tab itself. Words under `t.train`; sources S11 to S13 added to `src/lib/data/sources.ts`.
- `changeProgram(program)` in `actions.ts` is the only way to change the program after onboarding: it writes the program and a plan from tomorrow (`source: 'edit'`, new exercise energy, everything else from the current plan via `planFromBaseline`), and returns the undo.
- A plan now keeps `sessions` (the program's sessions without exercises). `dayView` reads `plan.sessions ?? program sessions`, so a past day keeps its own sessions and skips. For M8: a check-in's new plan must carry `sessions` from the plan it replaces (or the current program), and `checkinDue` counts days since a plan started or changed; decide whether an `edit` plan (a program change) restarts that count.
- Tests: `tests/e2e/train.spec.ts` (light project: build a week with exercises, analysis, Why, drag, delete with undo; a template from tomorrow with today, yesterday and the next day checked, and a skip). `train` case in `screens.spec.ts`; `training layout holds` in stress per device and at the largest text. The new unit test in `actions.test.ts` covers past days and undo.
- The design refresh after M7 restyles Train too; nothing in M7 was polished beyond the rubric.

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
- Tests: `tests/unit/analyze.test.ts`, `resolve.test.ts`; `tests/e2e/photo.spec.ts` (light project: success with oil and Save meal, not food, provider failure, limit with Add by hand, offline, Describe); a `photo` case in `screens.spec.ts`; the review sheet in stress's logging walk. CI's timeout is 60 minutes since D1.
- Evaluation: `pnpm eval:vision <folder> [<out>]` (`scripts/eval-vision.ts`, macOS `sips` to resize). Ten Wikimedia Commons photos, results in `docs/EVAL-NOTES.md`; photos 2 and 8 still need the tuned prompt's pass, and the owner's own ten meals are still to run. Not measured: a real deployed median (free tier 429s); one sample through `sin1` took 4.8 s, three through `iad1` 8.8 to 11.3 s, so functions now run in `sin1`. The production key with billing is M9.
- For M9: deleting a photo meal (or Undo) leaves its thumbnail in storage until the account is deleted; delete it with the meal. The Add sheet's Recent and Saved rows have no leading tile (design critic). Alcohol is outside the 4p + 4c + 9f check.

