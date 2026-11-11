# State

Handoff note between contexts. Read first, update last. Keep it under one screen.

## Milestones

Status is one of: not started, in progress, shipped, shipped with cuts, blocked.

| | Milestone | Status | Branch or pull request | Note |
| --- | --- | --- | --- | --- |
| M0 | Foundations | shipped with cuts | `m0-foundations`, PR #4 | Supabase MCP not added (needs browser sign in). `foods:build` waits for M5 |
| M1 | Design system | not started | | |
| M2 | Engine | not started | | |
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

- Node 22: run `nvm use` first. The machine default is 24.
- Shell: `src/App.svelte`, `src/lib/components/{Header,Dock,TrackIcon}.svelte`, tabs in `src/tabs/`. The plus button and avatar do nothing yet. No shadcn component is generated yet; `components.json` is ready.
- Tailwind classes map to tokens: `bg-canvas`, `text-ink-2`, `text-title`, `rounded-lg`, `font-rounded`, plus utilities `num`, `shadow-float`, `bar-glass`. Defaults are wiped, so a missing class means a missing token.
- `tests/unit/invariants.test.ts` fails on raw hex, pixel font sizes, banned punctuation in `en.ts`, and `src/` importing `server/` or `api/`.
- New screens: add a case to `tests/e2e/screens.spec.ts` and an entry to `SCREENS` in `stress.spec.ts`.
- Open for M1: unselected tab labels use `--ink-3` as the Dock spec says, about 3.2 to 1 in light, below section 12's bar.
- Checking a preview: `vercel curl <path> --deployment <url>`. `check:pwa` and Playwright with `E2E_BASE_URL` read `VERCEL_AUTOMATION_BYPASS_SECRET`. `vercel curl` makes one on the project if none exists.
- For M3: `.env.local` holds `SUPABASE_DB_PASSWORD` and `VERCEL_OIDC_TOKEN`; never `vercel env pull .env.local` over it. The Supabase CLI pushes migrations without the password. Auth settings (site URL, redirects, email code) are not set yet.
- After merging M0: close Dependabot PRs #1 to #3 (this branch already bumps the actions to v7). Branch `pr-assets` holds PR screenshots only; never merge it.
