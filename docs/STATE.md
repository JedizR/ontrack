# State

Handoff note between contexts. Read first, update last. Keep it under one screen.

## Milestones

Status is one of: not started, in progress, shipped, shipped with cuts, blocked.

| | Milestone | Status | Branch or pull request | Note |
| --- | --- | --- | --- | --- |
| M0 | Foundations | shipped with cuts | PR #4, merged, `v0.0.0` | Supabase MCP not added (needs browser sign in). `foods:build` waits for M5 |
| M1 | Design system | shipped | PR #5, merged, `v0.1.0` | Rubric pass stands in for the owner's approval; gallery is on his review list |
| M2 | Engine | shipped | PR #6, merged, `v0.2.0` | 19 sources checked; 3 values kept against their source, on the owner's review list |
| M3 | Data, sync, sign-in | not started | | |
| M4 | Onboarding and plan | not started | | |
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
- Sign in, sync, vision: not built yet. Vercel holds `VITE_BACKEND=supabase`, the Supabase URL and keys, and `CRON_SECRET` for production and preview.

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
- For M3: `.env.local` holds `SUPABASE_DB_PASSWORD` and `VERCEL_OIDC_TOKEN`; never `vercel env pull .env.local` over it. The Supabase CLI pushes migrations without the password. Auth settings (site URL, redirects, email code) are not set yet.
- Branch `pr-assets` holds PR screenshots only; never merge it.
