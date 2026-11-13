# Ontrack

A calorie and training tracker for the phone's browser: Safari on iPhone first, Chrome on Android too. You take a photo of a meal or search the food table, log your weight and your sessions, and a weekly check-in adjusts your target from what actually happened. Built for a university course as a proof of concept; it is not launched publicly.

Live: https://ontrack-black.vercel.app (add it to the Home Screen to use it like an app).

## How it is built

- A local first Svelte 5 single page app on Vite. Everything you log is written to IndexedDB on the phone first, so the app opens instantly and works in airplane mode; a sync engine sends changes to Supabase when there is a connection.
- Supabase: email code and Google sign in, one `records` table with row level security, and the friends tables (`supabase/migrations/`).
- Vercel: hosting, plus three small server functions in `api/` (photo and text analysis with Gemini, account deletion, a daily keep-alive). Their code is in `server/`; secrets live only there.
- The numbers (energy, protein, training energy, check-in rules) come from `src/lib/model/engine/constants.ts`, each with its published source. The AI names foods and estimates grams; calories per 100 g come from the food table (`src/lib/data/foods.json`) whenever it has the food.

## Run it

```sh
nvm use                  # Node from .nvmrc (22)
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm dev                 # http://localhost:5173 with the mock backend: no accounts or keys needed
```

Sign in on the mock with any email and the code `123456`. The mock backend (`dev/mock-backend.ts`) and a mock vision provider stand in for Supabase and Gemini, so the whole app runs offline on a laptop.

`pnpm dev:live` runs against the real Supabase project and Gemini (`scripts/live-env.sh` reads the keys from the Supabase CLI and `~/.config/ontrack/gemini-api-key`).

## Check it

| Command | What it does |
| --- | --- |
| `pnpm verify` | Type check, unit tests, build, the bundle report and the end to end smoke tests. Run it before calling anything done |
| `pnpm test` | Unit tests (Vitest): the engine's test vectors, sync conformance on the mock, the invariants |
| `pnpm test:e2e` | Every end to end test (Playwright, WebKit at iPhone size, light and dark) |
| `pnpm exec playwright test --project=stress` | Every screen on seven devices and three text sizes: overflow, clipped text, 44 px targets, accessible names |
| `pnpm test:live` | The sync conformance suite against the real Supabase project (leave 5 minutes between runs) |
| `pnpm bundle` | After a build: initial JavaScript against the 130 KB budget, the lazy chunks, and a scan for secrets |
| `pnpm smoke:prod` | After a release: production's pages, headers, version, server functions and offline reload |

The offline pass and the start time need a production build; how to run them is at the top of `tests/e2e/offline.spec.ts` and `tests/e2e/start.spec.ts`.

## Where things are

| Path | What |
| --- | --- |
| `src/App.svelte`, `src/tabs/` | The shell and the three tabs: Today, Train, Progress |
| `src/flows/` | Each flow: landing, sign in, onboarding, logging, check-in, training, friends and the food map |
| `src/settings/` | Settings, exports, The science |
| `src/lib/actions.ts` | The only way the UI changes data |
| `src/lib/db/`, `src/lib/sync/` | The IndexedDB store and the sync engine |
| `src/lib/model/` | The engine: plans, check-ins, training analysis |
| `src/lib/components/` | Shared components; `/gallery` shows them in dev |
| `src/lib/i18n/en.ts` | Every word in the UI |
| `design/tokens.css` | Colours, type, spacing, radii and motion |
| `docs/` | The product (`PRD.md`), architecture, tech spec, science, design, screens, build plan and decisions |

`CLAUDE.md` has the rules that are easy to break (one place for numbers, one way to change data, tokens only, words in the catalog). Read it before your first change.

## Release

Pull requests run CI (`.github/workflows/ci.yml`); the label `full-ci` runs every end to end test, the stress matrix and the offline pass. A merge to `main` deploys to production on Vercel. After a release, run `pnpm smoke:prod` and `pnpm test:live`, then tag it.
