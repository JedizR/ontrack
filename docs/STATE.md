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
| M4 | Onboarding and plan | shipped | `m4-onboarding`, PR pending merge | Gate green on the mock. Saving on production waits for live sign in (M3 blockers). Templates without muscle balance until M7 |
| M5 | Today and logging | not started | | |
| M6 | Photo logging | not started | | |
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
- Vision: not built yet. Vercel holds `VITE_BACKEND=supabase`, the Supabase URL and keys, and `CRON_SECRET` for production and preview.

## Notes for the next milestone

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
