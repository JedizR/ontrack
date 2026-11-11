# Ontrack: architecture decisions

Every decision here is settled. "Instead of" names what was weighed, so nobody proposes it again without new information.

## 1. The system

~~~
iPhone, installed web app                      Vercel                       Supabase
+--------------------------------+   HTTPS   +----------------------+    +---------------------+
| Svelte 5 SPA + service worker  |---------->| static assets (CDN)  |    | Auth: Google, code  |
|  tabs, sheets, flows           |           | /api/analyze         |--->| Postgres: records,  |
|  actions.ts -> store ($state)  |  /api/*   | /api/account         |    |   ai_usage          |
|               |                |---------->| /api/cron/keepalive  |    | Storage: thumbnails |
|  IndexedDB: records, outbox,   |           +----------+-----------+    +----------^----------+
|  blobs, meta                   |                      | Gemini API                |
|               |                |                      v                           |
|  sync engine ------------------+------ supabase-js, user JWT, row level security -+
+--------------------------------+
~~~

The phone holds the truth for the person using it. Supabase is the replica that makes a second device and a reinstall safe. Server functions exist only for work that needs a secret.

## 2. Decisions

**A1. An installed web app, iPhone first.** One codebase, no store review, free to host, and the owner already ships this way. The app is designed for Safari's standalone mode at 390 by 844 and sits in a centred 480 px column on larger screens. Instead of: native Swift, React Native, Capacitor (a wrapper can come later if push or Health data is needed).

**A2. Svelte 5 single page app on plain Vite.** Ontrack is entirely client rendered and local first, so server rendering and a file router add nothing. This is the same foundation as watermelon, which means its toolchain, pins and code port directly. Instead of: SvelteKit (its one real benefit here, typed server endpoints, is covered by A8), Astro (a content site framework), Next.

**A3. shadcn-svelte on bits-ui, Tailwind 4, Lucide icons.** Components are copied into the repo and restyled with Ontrack tokens. Every sheet is the shadcn Drawer (vaul-svelte). `bits-ui` is a direct dependency. `cn()` is plain `clsx` with no tailwind-merge. svelte-sonner is used directly for toasts. Instead of: a custom component set from scratch, Skeleton, daisyUI.

**A4. Local first.** The reactive store backed by IndexedDB is the source of truth on the device. Every screen reads from memory. Every write lands locally first and joins an outbox. This is what makes logging instant and offline. Instead of: fetching per screen with a cache, which makes every tap wait on the network.

**A5. Supabase for auth, sync and thumbnails.** Free tier, real Postgres, row level security, a good CLI. Instead of: Firebase (weaker exit path), a custom server, Google Sheets (watermelon's choice, right for one shop, wrong for public sign-in).

**A6. One generic `records` table.** Each row is a JSON document: `(user_id, collection, id, data, updated_at, deleted, server_ts)`. One policy protects everything, schema changes need no migration, and the watermelon store maps onto it unchanged. Validation happens in the client with zod and in the database with size and collection checks. Instead of: a table per entity. Relational tables can be added later as read models if server side features need them.

**A7. Last write wins per record, with tombstones and deterministic ids.** A device stamps `updated_at` when it edits. The database ignores a write that is not newer than what it holds. Deletes are records with `deleted: true`. Records that represent one thing per day or one thing per user have ids derived from that fact (`weight:2026-11-11`, `profile`), so two devices converge instead of duplicating. Instead of: CRDTs or operational transforms, which solve a collaboration problem a single user does not have.

**A8. Three server functions on Vercel, written as portable handlers.** Each handler in `server/` takes a standard `Request` and returns a `Response`. Files in `api/` are thin wrappers for Vercel. A Vite middleware in `dev/` mounts the same handlers locally. Nothing uses a Vercel only API, so moving to Cloudflare Workers is a wrapper change. Instead of: Supabase Edge Functions (a second runtime and deploy path), a long running server.

**A9. Sign-in is Google (redirect flow with PKCE) and email 6 digit code.** Both complete inside the installed app. Magic links are excluded because they open in Safari, which does not share storage with the home screen app. Popups are excluded because standalone mode handles them badly. The session lives in the app's local storage through supabase-js. Instead of: passwords, magic links, Apple sign-in (needs a paid developer account, on the later list).

**A10. Photo analysis by Gemini Flash behind a provider interface.** The free tier covers development and the owner has monthly credits for production. `server/vision/` defines `VisionProvider` with two implementations: `gemini` and `mock`. The model id comes from `GEMINI_MODEL`. Check the current Flash model id in Google's docs at M6 and set it in the environment, never in code. Thinking is set to minimal and output is constrained by a JSON schema. Instead of: a self hosted 2B model (far weaker at dishes and portions, no cheaper at this scale), on device WebGPU models (a 1 GB download).

**A11. The model describes, the table decides.** The model returns components, grams and an optional match to the bundled food table. Nutrition per 100 g comes from the table when matched. Otherwise the model's own estimate is used and the item is labelled Estimate. The model never sees or sets a target. Instead of: asking the model for total calories, which hides its reasoning and cannot be corrected item by item.

**A12. Foods and exercises ship inside the app.** A food table of about 350 common foods, built by script from USDA SR Legacy data, and an exercise library of about 60 movements, are bundled as lazy loaded JSON. Search works offline and costs no database calls. Instead of: a live USDA API dependency, database tables.

**A13. The science engine is a pure TypeScript module with a version number.** `src/lib/model/engine/` has no imports from the UI or the store. Every constant carries a source id and a status. Plans record the engine version that produced them. Instead of: formulas scattered through components, or any calculation delegated to an AI model.

**A14. Only a thumbnail is kept.** The capture is resized to 1024 px for analysis and never stored. A 320 px JPEG thumbnail is saved locally and uploaded to a private bucket under the user's id. Instead of: storing originals (privacy cost, and the free tier holds 1 GB).

**A15. Three tabs held in state, sheets for everything else.** Today, Train, Progress. Add, edit, settings, check-in and onboarding are sheets or full height flows. There is no URL router. The last tab is remembered per device. Instead of: page navigation, which feels like a website.

**A16. Strings in a typed catalog, English in v1.** `src/lib/i18n/en.ts` exports message functions. Thai is a second file later. No i18n library.

**A17. Charts are hand built SVG with d3-scale and d3-shape, lazy loaded.** Two charts do not justify a chart library. This is the watermelon decision, kept.

**A18. Tests: Vitest for logic, Playwright for flows and screenshots, a mock backend for both.** End to end tests and screenshots run against the mock backend so they need no network or accounts. One conformance suite runs against the mock and, when credentials exist, against real Supabase, so the two implementations of the sync rules cannot drift. Instead of: running Supabase locally in Docker.

**A19. Exact pins, baseline from watermelon.** Shared dependencies start at the exact versions in watermelon's `package.json`, which are known to work together. New dependencies are installed at their latest stable version in M0 and pinned. TypeScript stays on the major that svelte-check supports. Prettier formats, svelte-check and strict TypeScript catch errors. There is no ESLint in v1.

**A20. One Supabase project and one Vercel project for now.** Preview deployments and production share the project until there are real users. A second project is created before public launch. Vercel Hobby is for personal, non commercial use, so hosting moves to Pro or Cloudflare before any charge is made.

## 3. Reuse map: watermelon to Ontrack

Source paths are as described in watermelon's README and DECISIONS. The scout confirms exact files in `docs/PORT-NOTES.md`.

| Capability | From watermelon | Into Ontrack | What changes |
| --- | --- | --- | --- |
| Reactive store, IndexedDB persistence, schema version, migrations, outbox | `src/lib/db/store.svelte.ts` | same path | Collections from the tech spec. Database name includes the user id |
| Sync engine: debounce 1.5 s, backoff, status states | `src/lib/sync/` | same path | Transport becomes a backend adapter. Merge rule moves into SQL and the mock |
| Wire types | `shared/protocol.ts` | `shared/` | Record envelope and analysis types |
| All mutations in one module, with undo | `src/lib/actions.ts` | same path | Ontrack actions |
| Pure model layer and its unit tests | `src/lib/model/` | same path | Keep the units, format, CSV and backup patterns. Replace the domain |
| Dev backend as Vite middleware, isolated stores for parallel tests | `dev/mock-gas.ts` | `dev/mock-backend.ts` | Emulates records sync, sign-in and `/api` |
| PWA config, update toast, icon generation, installability check | `vite.config.ts`, `pwa-assets.config.ts`, `scripts/check-pwa.mjs` | same paths | New name, colours and icons |
| Sheets with the iOS keyboard fix (vaul `repositionInputs` off, focused field scrolled to centre) | sheet components | `src/lib/components/` | Restyle |
| Number keypad sheet with adaptive key heights | keypad component | `src/lib/components/Keypad.svelte` | Decimal and unit handling for kg and kcal |
| Tab shell: lazy tabs, preloading, swipe with intent detection and resistance | `src/App.svelte`, `src/tabs/` | same | Three Ontrack tabs, floating bar |
| Header: opaque, hairline on scroll, canvas colour behind the status bar | header component | same | Restyle |
| Theme store with system, light, dark and a quick toggle | theme module | same | Tokens |
| Text size: device default through `-apple-system-body`, three scales, `--fs` multiplier | text size module | same | Type scale |
| Haptics through a hidden native switch input | haptics module | same | None |
| Toasts: top centre, pinned 16 px from the edges, one undo at a time | toast setup | same | Restyle |
| Safari install guide matching the current iOS menu, standalone detection | onboarding | `src/flows/onboarding/Install.svelte` | English copy, Ontrack icon |
| Hairline divider and joined parts, used instead of dot separators | `Vr.svelte`, `Parts.svelte` | `src/lib/components/` | None |
| Lazy chart built on d3 | chart component | `src/lib/components/TrendChart.svelte` | Weight trend, weekly bars |
| Playwright projects: flows in light and dark, `screens`, `stress` device and text size matrix | `playwright.config.ts`, `tests/` | same | Ontrack screens |
| Tooling: exact pins, pnpm build script allowlist, `.nvmrc`, `components.json`, Tailwind 4 setup | root config | root | Names |
| Export: CSV with BOM, JSON backup, iOS share sheet | model and settings | same | Ontrack data |
| Sign out: wait for unsent changes, then wipe the local database | settings | same | Supabase sign out |
| What's new screen for existing installs | app shell | same | Used from v1.1 |

Not reused: Apps Script and Sheets code, invite codes and QR links, the Chakra Petch font and its tabular companion, pastel colour blocks, multi shop logic, the guided tour (later).

## 4. Security model

- The browser holds only the publishable Supabase key and the user's session. Row level security restricts every query to `user_id = auth.uid()`.
- The Supabase secret key and the Gemini key exist only in Vercel environment variables and the owner's `.env.local`. Claude is denied read access to `.env` files and never needs their contents.
- `/api/analyze` and `/api/account` verify the caller's token with Supabase before doing anything. `/api/cron/keepalive` requires `CRON_SECRET`.
- Photo analysis is rate limited per user per day and capped globally per day, enforced in Postgres.
- Thumbnails live in a private bucket under a folder named by the user id, with policies that match the folder to `auth.uid()`.
- Model output is untrusted input: validated against a schema, clamped to sane ranges, and never executed or rendered as HTML.
- Before M9 ships: run Supabase's security advisors, confirm no table is exposed without a policy, and confirm the build output contains no secret.

## 5. Known limits, accepted

- Last write wins can drop one of two edits to the same record made offline on two devices. Acceptable for one person's log.
- The whole record set loads into memory at start. Fine for years of one person's data. If start time passes the bar, move to an indexed store that loads the last 60 days first.
- A device with a wrong clock can win or lose merges incorrectly. The server never trusts the client clock for ordering pulls, only for merge order.
- The free Supabase mailer reaches project members only. Email codes for the public need the SMTP step in `docs/USER-INPUTS.md`.
