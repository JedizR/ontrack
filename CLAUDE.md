# Ontrack

Calorie and training tracker for the phone browser: Safari on iPhone first, Chrome on Android too. Local-first Svelte 5 SPA on Vite, Supabase for auth and sync, Vercel for hosting and three small server functions.

## Commands

| Command | Does |
| --- | --- |
| `pnpm dev` | App on :5173 with the mock backend. No accounts or keys needed |
| `pnpm dev:live` | Same, against real Supabase and Gemini from `.env.local` |
| `pnpm check` | svelte-check, strict TypeScript |
| `pnpm test` | Vitest. Run one file with `pnpm test path/to/file` |
| `pnpm test:e2e` | Playwright, iPhone Safari viewport, light and dark, mock backend |
| `pnpm screenshots` | Every screen and sheet into `screenshots/` |
| `pnpm verify` | check + test + build + e2e smoke. Run before calling anything done |
| `pnpm check:pwa <url>` | Manifest, service worker and offline reload against a preview or `pnpm preview` |
| `pnpm icons` | Regenerate the PWA icons from `design/brand/app-icon.svg` |
| `pnpm foods:build` | Rebuild `src/lib/data/foods.json` from USDA data and `data/food-list.csv` |

Node from `.nvmrc`, pnpm through corepack, every dependency pinned to an exact version.

## Where to look

| Question | Read |
| --- | --- |
| What are we building, for whom, what is in or out | `docs/PRD.md` |
| Why it is built this way, what to reuse from watermelon | `docs/ARCHITECTURE.md` |
| Data model, sync protocol, SQL, API contracts, AI pipeline, tests | `docs/TECH-SPEC.md` |
| Any number about calories, protein or training | `docs/SCIENCE.md` |
| Brand, tokens, components, motion, what good looks like | `docs/DESIGN.md`, `design/` |
| Each screen, its states and its words | `docs/SCREENS.md` |
| What to do next and when it counts as done | `docs/BUILD-PLAN.md`, `docs/STATE.md` |
| Git, sessions, subagents, tools, UI checks | `docs/WORKFLOW.md` |
| What the owner supplied, and the defaults | `docs/USER-INPUTS.md` |

## Invariants

These are the rules that are easy to break without noticing.

- **Numbers come from one place.** Every scientific constant lives in `src/lib/model/engine/constants.ts` with its source. Never inline one. The AI names foods and estimates grams. It never decides a calorie target, and nutrition per 100 g comes from the food table whenever a match exists.
- **One way to change data.** UI calls functions in `src/lib/actions.ts`. Actions write to the store. The store persists and queues sync. Components never call Supabase or IndexedDB.
- **The server boundary is a directory.** Nothing under `src/` imports from `server/` or `api/`. Secrets exist only there. Anything prefixed `VITE_` is public.
- **Days are local.** Bucket by the device's calendar date as a `YYYY-MM-DD` string captured at write time. Never derive a day from a UTC timestamp.
- **Tokens only.** Colours, radii, spacing and type sizes come from `design/tokens.css` through Tailwind theme variables. No raw hex or pixel font sizes in components.
- **Words live in the catalog.** UI strings come from `src/lib/i18n/en.ts`. No em or en dashes, no middle dot separators, sentence case, no exclamation marks. Words are designed like screens: every headline and main action is chosen to be clear and to get the tap (the voice guide in `docs/DESIGN.md`, from O1), never through guilt, false urgency or confirmshaming.
- **Violet means act, green means reached.** OneFin violet fills the primary action and the dock's plus. Success green marks progress that reached its target. Nothing else is violet or green; lavender tints are surfaces.
- **iPhone rules.** Inputs at 16 px or larger. `touch-action: manipulation` globally. Respect safe areas. Never set `maximum-scale`. Test at 390 by 844 in Safari with its toolbars (viewport 390 by 664) and at the SE size (375 by 548).
- **Class names.** Never name a component class after a Tailwind utility (`block`, `flex`, `hidden`). It has bitten us before.

## Gotchas

- Node 22 through `nvm use`; the machine default is 24.
- Vercel previews are behind Vercel Authentication. Use `vercel curl`, or pass `VERCEL_AUTOMATION_BYPASS_SECRET` to `pnpm check:pwa` and to Playwright with `E2E_BASE_URL`.
- `vercel env add NAME env < file` takes the value from one stdin redirect. Confirm with `vercel env pull` into a scratch file, never into `.env.local`.

## Working agreements

- Branch per milestone or fix, conventional commits, pull request into `main`. Never commit `.env*` files other than `.env.example`.
- Finish a task by running `pnpm verify`. Finish UI work by running the `verify-ui` skill as well.
- Every feature is designed for its UX before it is built: the fewest taps for the common case, one-hand reach, every state worded, and the OneFin system in `docs/DESIGN.md`. The owner's rule: no feature ships without being thought through for UX and shown in the OneFin design.
- State that the next session needs goes in `docs/STATE.md`. A lasting gotcha goes here. Keep this file short.
- When compacting, keep: the current milestone and step, files changed, failing checks, and anything the owner said.

Reference repo: `/Users/admin/watermelon-smoothie-shop-budget-webapp/`
