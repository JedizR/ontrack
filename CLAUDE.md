# Ontrack

Calorie and training tracker. Installed iPhone web app (Safari, Add to Home Screen). Local-first Svelte 5 SPA on Vite, Supabase for auth and sync, Vercel for hosting and three small server functions.

## Commands

| Command | Does |
| --- | --- |
| `pnpm dev` | App on :5173 with the mock backend. No accounts or keys needed |
| `pnpm dev:live` | Same, against real Supabase and Gemini from `.env.local` |
| `pnpm check` | svelte-check, strict TypeScript |
| `pnpm test` | Vitest. Run one file with `pnpm test path/to/file` |
| `pnpm test:e2e` | Playwright, iPhone viewport, light and dark, mock backend |
| `pnpm screenshots` | Every screen and sheet into `screenshots/` |
| `pnpm verify` | check + test + build + e2e smoke. Run before calling anything done |
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
- **Words live in the catalog.** UI strings come from `src/lib/i18n/en.ts`. No em or en dashes, no middle dot separators, sentence case, no exclamation marks.
- **Lime means on track.** It marks the primary action and progress that has reached its target. Nothing else is lime.
- **iPhone rules.** Inputs at 16 px or larger. `touch-action: manipulation` globally. Respect safe areas. Never set `maximum-scale`. Test at 390 by 844 and at the iPhone SE size.
- **Class names.** Never name a component class after a Tailwind utility (`block`, `flex`, `hidden`). It has bitten us before.

## Working agreements

- Branch per milestone or fix, conventional commits, pull request into `main`. Never commit `.env*` files other than `.env.example`.
- Finish a task by running `pnpm verify`. Finish UI work by running the `verify-ui` skill as well.
- State that the next session needs goes in `docs/STATE.md`. A lasting gotcha goes here. Keep this file short.
- When compacting, keep: the current milestone and step, files changed, failing checks, and anything the owner said.

Reference repo: `/Users/admin/watermelon-smoothie-shop-budget-webapp/`
