# Ontrack

Calorie and training tracker for the phone browser: Safari on iPhone first, Chrome on Android too. Local-first Svelte 5 SPA on Vite, Supabase for auth and sync, Vercel for hosting and four small server functions (photo analysis, the AI coach, account deletion, a keep-alive). The owner's course project, built like a real product; live at https://ontrack-black.vercel.app.

Start every session with `docs/STATE.md` (where things stand) and `docs/DIRECTIONS.md` (what the owner wants).

## Commands

| Command | Does |
| --- | --- |
| `pnpm dev` | App on :5173 with the mock backend. No accounts or keys needed |
| `pnpm dev:live` | Same, against real Supabase and Gemini from `.env.local` |
| `pnpm check` | svelte-check, strict TypeScript |
| `pnpm test` | Vitest. Run one file with `pnpm test path/to/file` |
| `pnpm test:e2e` | Playwright, iPhone Safari viewport, light and dark, mock backend |
| `pnpm screenshots` | Every screen and sheet into `screenshots/` |
| `pnpm verify` | check + test + build + bundle + e2e smoke. Run before calling anything done |
| `pnpm smoke:prod` | Production after a deploy: pages, version, server functions, PWA, offline |
| `pnpm test:live` | Sync conformance against real Supabase. 5 minutes between runs |
| `pnpm check:pwa <url>` | Manifest, service worker and offline reload against a preview or `pnpm preview` |
| `pnpm icons` | Regenerate the PWA icons from `design/brand/app-icon.svg` |
| `pnpm foods:build` | Rebuild `src/lib/data/foods.json` from USDA data and `data/food-list.csv` |

Node from `.nvmrc`, pnpm through corepack, every dependency pinned to an exact version.

## Where to look

| Question | Read |
| --- | --- |
| Where things stand, what is live, what is open | `docs/STATE.md` |
| What the owner wants: every standing direction | `docs/DIRECTIONS.md` |
| What are we building, for whom, what is in or out | `docs/PRD.md` |
| Why it is built this way | `docs/ARCHITECTURE.md` |
| Data model, sync protocol, SQL, API contracts, AI pipeline, tests | `docs/TECH-SPEC.md` |
| Any number about calories, protein or training | `docs/SCIENCE.md` |
| Brand, tokens, components, motion, what good looks like | `docs/DESIGN.md`, `design/` |
| Each screen, its states and its words | `docs/SCREENS.md` |
| What to do next | `docs/BUILD-PLAN.md` |
| Sessions, the local loop, releasing, UI checks, tools, traps | `docs/WORKFLOW.md` |
| Accounts, keys, env names, design references | `docs/USER-INPUTS.md` |
| Thai recognition, photo eval results | `docs/AI-THAI.md`, `docs/EVAL-NOTES.md` |
| Why something was decided, round by round | `docs/DECISIONS.md` (newest first); old plans and notes in `docs/archive/` |

## Invariants

These are the rules that are easy to break without noticing.

- **Numbers come from one place.** Every scientific constant lives in `src/lib/model/engine/constants.ts` with its source. Never inline one. The AI names foods and estimates grams. It never decides a calorie target, and nutrition per 100 g comes from the food table whenever a match exists.
- **One way to change data.** UI calls functions in `src/lib/actions.ts`. Actions write to the store. The store persists and queues sync. Components never call Supabase or IndexedDB.
- **The server boundary is a directory.** Nothing under `src/` imports from `server/` or `api/`. Secrets exist only there. Anything prefixed `VITE_` is public.
- **Days are local.** Bucket by the device's calendar date as a `YYYY-MM-DD` string captured at write time. Never derive a day from a UTC timestamp.
- **Tokens only.** Colours, radii, spacing and type sizes come from `design/tokens.css` through Tailwind theme variables. No raw hex or pixel font sizes in components.
- **Words live in the catalog.** UI strings come from `src/lib/i18n/en.ts`. No em or en dashes, no middle dot separators, sentence case, no exclamation marks. Words are designed like screens: every headline and main action is chosen to be clear and to get the tap (the voice guide in `docs/DESIGN.md`, from O1), never through guilt, false urgency or confirmshaming.
- **Ink means act, violet is the brand, green means reached.** The primary action is a flat ink pill (white on dark), and the dock's plus its circle: no gradient, bevel or glow on any button. Violet marks Ontrack: icon tiles, links, highlighted words, progress, the one featured card. Success green marks progress that reached its target. One gradient per screen, on its hero; glass only on small chips over colour, the dock and sheet backdrops.
- **Corners and contrast (U1b).** A shape 8 or less inside another's corner takes the outer radius less the gap; padding is at least half the radius. Selected states and shape-only controls need 3 to 1 against their neighbours (`contrast.test.ts`). Two facts on a line use `Facts`, never a comma.
- **iPhone rules.** Inputs at 16 px or larger. `touch-action: manipulation` globally. Respect safe areas. Never set `maximum-scale`. Test at 390 by 844 in Safari with its toolbars (viewport 390 by 664) and at the SE size (375 by 548).
- **No emoji.** Never type an emoji into the UI, the catalog, data or assets. Anything that needs a picture uses a real icon from the icon set. `tests/unit/invariants.test.ts` enforces it.
- **The app icon is frozen.** `design/brand/app-icon.svg` is the only source and is never redrawn; `pnpm icons` makes the rest. See `design/brand/ICON.md`.
- **Class names.** Never name a component class after a Tailwind utility (`block`, `flex`, `hidden`). It has bitten us before.
- **Two styles.** Tray (the default, R3's cards on a tray with glass) and Bento (flat: no card in a card, one radius, no glass), picked in Settings or on Today's one-time card. A style-only difference branches on `prefs.tray` or `[data-look="tray"]`; every other change applies to both. The landing page is always Tray.

## Gotchas

- Node 22 through `nvm use`; the machine default is 24.
- The owner's `pnpm dev --host` on :5173 serves this checkout to their iPhone. Never `pkill vite`; run your own server on another port and kill it by PID. A `git switch` here changes what their phone shows.
- yab-browser cannot open localhost; check local UI with the capture harness (`docs/WORKFLOW.md` section 4). Headless WebKit draws no blur.
- Vercel previews are behind Vercel Authentication. Use `vercel curl`, or pass `VERCEL_AUTOMATION_BYPASS_SECRET` to `pnpm check:pwa` and to Playwright with `E2E_BASE_URL`.
- `vercel env add NAME env < file` takes the value from one stdin redirect. Confirm with `vercel env pull` into a scratch file, never into `.env.local`.

## Working agreements

- Branch per milestone or fix, conventional commits, pull request into `main`. Never commit `.env*` files other than `.env.example`.
- Finish a task by running `pnpm verify`. Finish UI work by running the `verify-ui` skill as well.
- Every feature is designed for its UX before it is built: the fewest taps for the common case, one-hand reach, every state worded, and the OneFin system in `docs/DESIGN.md`. The owner's rule: no feature ships without being thought through for UX and shown in the OneFin design.
- Work locally with the owner watching; merge and deploy only when they say so (`docs/WORKFLOW.md` sections 2 and 5).
- State that the next session needs goes in `docs/STATE.md`; a new standing direction from the owner goes in `docs/DIRECTIONS.md`; a decision goes in `docs/DECISIONS.md`. A lasting gotcha goes here or in WORKFLOW section 13. Keep this file short.
- When compacting, keep: the current milestone and step, files changed, failing checks, and anything the owner said.

Reference repo: `/Users/admin/watermelon-smoothie-shop-budget-webapp/`
