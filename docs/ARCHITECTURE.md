# Ontrack: architecture decisions

Every decision here is settled. "Instead of" names what was weighed, so nobody proposes it again without new information.

## 1. The system

~~~
iPhone browser (Safari)                        Vercel                       Supabase
+--------------------------------+   HTTPS   +----------------------+    +---------------------+
| Svelte 5 SPA + service worker  |---------->| static assets (CDN)  |    | Auth: Google, code  |
|  tabs, sheets, flows           |           | /api/analyze         |--->| Postgres: records,  |
|  actions.ts -> store ($state)  |  /api/*   | /api/coach           |    |   ai_usage, friends |
|               |                |---------->| /api/account         |    | Storage: thumbnails |
|  IndexedDB: records, outbox,   |           | /api/cron/keepalive  |    +----------^----------+
|  blobs, meta                   |           +----------+-----------+               |
|               |                |                      | Gemini API                |
|  sync engine ------------------+------ supabase-js, user JWT, row level security -+
+--------------------------------+
~~~

The phone holds the truth for the person using it. Supabase is the replica that makes a second device and a cleared browser safe. Four server functions exist, only for work that needs a secret: reading a photo or a sentence (`/api/analyze`), writing coach words (`/api/coach`), deleting an account (`/api/account`), and a daily keep-alive query (`/api/cron/keepalive`).

## 2. Decisions

**A1. A web app in the phone's browser, iPhone first.** One codebase, no store review, free to host. Everyone uses it in a browser tab: Safari on iPhone first, Chrome on Android too, and nothing asks anyone to install it (D1). The app is designed for Safari at 390 by 844 with its toolbars showing (a 390 by 664 viewport) and sits in a centred 480 px column on larger screens. Instead of: native Swift, React Native, Capacitor (a wrapper can come later if push or Health data is needed).

**A2. Svelte 5 single page app on plain Vite.** Ontrack is entirely client rendered and local first, so server rendering and a file router add nothing. Instead of: SvelteKit (its one real benefit here, typed server endpoints, is covered by A8), Astro (a content site framework), Next.

**A3. Tailwind 4 on design tokens, the shadcn Drawer, Lucide icons.** Colours, radii, spacing and type sizes come from `design/tokens.css` through Tailwind theme variables. Every sheet is the shadcn Drawer on vaul-svelte (`src/lib/components/ui/drawer`, wrapped by `Sheet.svelte`); every other component is Ontrack's own in `src/lib/components/`. `cn()` is plain `clsx` with no tailwind-merge. svelte-sonner is used directly for toasts. Instead of: a component library, Skeleton, daisyUI.

**A4. Local first.** The reactive store backed by IndexedDB is the source of truth on the device. Every screen reads from memory. Every write lands locally first and joins an outbox. This is what makes logging instant and offline. Instead of: fetching per screen with a cache, which makes every tap wait on the network.

**A5. Supabase for auth, sync, thumbnails and friends.** Free tier, real Postgres, row level security, a good CLI. Instead of: Firebase (weaker exit path), a custom server, Google Sheets (right for one shop, wrong for public sign-in).

**A6. One generic `records` table.** Each row is a JSON document: `(user_id, collection, id, data, updated_at, deleted, server_ts)`. One policy protects everything, and a new collection needs only a wider check constraint and a device migration (`docs/TECH-SPEC.md` section 4). Validation happens in the client with zod (`zod/mini`, in `shared/records.ts`, so `actions.ts` stays small in the first chunk) and in the database with size and collection checks. Instead of: a table per entity. Relational tables hold only what the server must read across users (A21).

**A7. Last write wins per record, with tombstones and deterministic ids.** A device stamps `updated_at` when it edits, always later than anything the device already holds. The database ignores a write that is not newer than what it holds. Deletes are records with `deleted: true`. Records that represent one thing per day or one thing per user have ids derived from that fact (`weight:2026-11-11`, `profile`), so two devices converge instead of duplicating. Instead of: CRDTs or operational transforms, which solve a collaboration problem a single user does not have.

**A8. Four server functions on Vercel, written as portable handlers.** Each handler in `server/handlers/` takes a standard `Request` and returns a `Response`. Files in `api/` are thin wrappers that export `POST`, `DELETE` or `GET`. A Vite middleware in `dev/` mounts the same handlers locally (the mock backend serves them on `pnpm dev`, `dev/api-middleware.ts` on `pnpm dev:live`). Nothing uses a Vercel only API, so moving to Cloudflare Workers is a wrapper change. Instead of: Supabase Edge Functions (a second runtime and deploy path), a long running server.

**A9. Sign-in is Google (redirect flow with PKCE) and email 6 digit code.** Both complete in the tab that started them. Magic links are excluded because they open wherever the mail app chooses, which may be another browser or device. Popups are excluded because mobile Safari handles them badly. The session lives in the app's local storage through supabase-js. Instead of: passwords, magic links, Apple sign-in (needs a paid developer account, on the later list).

**A10. Photo and text analysis by Gemini Flash behind a provider interface.** `server/vision/` defines `VisionProvider` with two implementations, `gemini` and `mock`; `VISION_PROVIDER` picks both this and the coach's provider. The model comes from `GEMINI_MODEL` (`gemini-3.6-flash` today), never from code. `GEMINI_FALLBACK_MODEL` (`gemini-3.5-flash-lite` in `scripts/live-env.sh`) answers when the main model returns 429 or 503, and the analysis records the model that answered. Thinking is set to minimal, which the newest Flash refuses, and output is constrained by a JSON schema. Instead of: a self hosted 2B model (far weaker at dishes and portions, no cheaper at this scale), on device WebGPU models (a 1 GB download).

**A11. The model describes, the table decides.** The model returns components, grams and an optional match to the bundled food table, plus a Thai dish's parts (dish, protein, extras) that the server resolves to the table's variant (`docs/AI-THAI.md`). Nutrition per 100 g comes from the table when matched. Otherwise the model's own estimate is used and the item is labelled Estimate. A pack's label is read, never estimated. The model never sees or sets a target. Instead of: asking the model for total calories, which hides its reasoning and cannot be corrected item by item.

**A12. Foods and exercises ship inside the app.** A food table of 983 foods (USDA, SG FoodID, the Thai Food Composition Database, and Thai dishes computed from sourced ingredients), built by script, and an exercise library of 71 movements are bundled as lazy loaded data. Search works offline and costs no database calls. Instead of: a live USDA API dependency, database tables. Packaged foods are the exception: a barcode asks Open Food Facts from the browser, and the result is kept as a record.

**A13. The science engine is a pure TypeScript module with a version number.** `src/lib/model/engine/` has no imports from the UI or the store. Every constant carries a source id and a status. Plans record the engine version that produced them. Instead of: formulas scattered through components, or any calculation delegated to an AI model.

**A14. Only a thumbnail is kept.** The capture is resized to 1024 px for analysis and never stored. A 320 px JPEG thumbnail is saved locally and uploaded to a private bucket under the user's id; it is also the photo a friend sees on a shared meal. Photos leave storage when their meal is deleted. Instead of: storing originals (privacy cost, and the free tier holds 1 GB).

**A15. Three tabs held in state, sheets for everything else.** Today, Train, Progress. Add, edit, Profile, settings, the weekly check-in and onboarding are sheets or full height flows; the food map is a full screen layer. There is no URL router. The last tab is remembered per device. Instead of: page navigation, which feels like a website.

**A16. Strings in a typed catalog, English only.** `src/lib/i18n/en.ts` exports message functions. No i18n library.

**A17. Charts are hand built SVG with d3-scale and d3-shape, lazy loaded.** A few small charts do not justify a chart library. The food map is the one exception: MapLibre GL in its own chunk, outside the offline precache.

**A18. Tests: Vitest for logic, Playwright for flows and screenshots, a mock backend for both.** End to end tests and screenshots run against the mock backend so they need no network or accounts. One conformance suite runs against the mock and, when credentials exist, against real Supabase, so the two implementations of the sync rules cannot drift. CI runs a quick pass on every pull request and the full suite on a release, a label or a manual run (`docs/TECH-SPEC.md` section 13). Instead of: running Supabase locally in Docker.

**A19. Exact pins.** Every dependency is pinned to an exact version in `package.json` and installed with `--frozen-lockfile`. TypeScript stays on the major that svelte-check supports. Prettier formats; svelte-check and strict TypeScript catch errors. There is no ESLint.

**A20. One Supabase project and one Vercel project for now.** Preview deployments and production share the project until there are real users. A second project is created before public launch. Vercel Hobby is for personal, non commercial use, so hosting moves to Pro or Cloudflare before any charge is made. Functions run in `sin1` (Singapore).

**A21. Sharing is published by the database, not written by clients.** Friends and the food map need other people's data, so the `records` table stays private and a trigger copies what a user chose to share (profile, program, a meal's place and nutrition) into three tables clients may only read. Friendships are the one table users write. Row level security through `private.sees(owner)` limits reads to the owner and accepted friends. Instead of: letting friends query `records`, or a social API server.

**A22. The coach writes words, the engine owns numbers.** The model never writes a digit: it names a number as a slot (`{{id}}`) from facts the app computed, the server refuses any reply that breaks the rule, and the app fills the slots. A failed or offline call falls back to a template from the same facts. Instead of: letting the model quote numbers, which would let it change a target.

## 3. Watermelon

Ontrack began from the watermelon shop app (a sibling Svelte, Vite and local first project): its toolchain pins, store and outbox, sync engine, `actions.ts` pattern, mock backend, PWA setup, iOS keyboard fix for sheets, tab shell and chart pattern. Each was adapted, and Ontrack's code is now the truth. The file by file map is history, kept in `docs/archive/PORT-NOTES.md`. Not taken: Apps Script and Sheets code, invite codes, multi shop logic, the old font and colour blocks.

## 4. Security model

- The browser holds only the publishable Supabase key and the user's session. Row level security restricts every query on `records` to `user_id = auth.uid()`, and friends' tables to `private.sees(owner)`.
- The Supabase secret key and the Gemini key exist only in Vercel environment variables and the owner's `.env.local`. Claude is denied read access to `.env` files and never needs their contents. Nothing under `src/` imports from `server/` or `api/`, and `pnpm bundle` scans the build for secrets.
- `/api/analyze`, `/api/coach` and `/api/account` verify the caller's token with Supabase before doing anything. `/api/cron/keepalive` requires `CRON_SECRET` and is closed when it is unset.
- Photo analysis and coach text share one daily quota per user, plus a global daily cap, counted in Postgres on the server's UTC day.
- Thumbnails live in a private bucket under a folder named by the user id, with policies that match the folder to `auth.uid()`. A shared meal's photo is readable as its `shared_meals` row is.
- Model output is untrusted input: validated against a schema, clamped to sane ranges, never executed or rendered as HTML. The coach's reply passes the slot rule, and a requested program is clamped and checked against `programSchema`.
- A meal's place on the map is rounded to 0.001 degree (about 100 m) on the phone and again by the database. The photo's own location is dropped by the canvas redraw.
- `vercel.json` sets `nosniff`, a strict referrer policy and `Permissions-Policy: camera=(self), microphone=(), geolocation=(self)`.
- After each migration, run Supabase's security advisors and confirm no table is exposed without a policy.

## 5. Known limits, accepted

- Last write wins can drop one of two edits to the same record made offline on two devices. Acceptable for one person's log.
- The whole record set loads into memory at start. Fine for years of one person's data. If start time passes the bar, move to an indexed store that loads the last 60 days first.
- A device with a wrong clock can win or lose merges incorrectly. The server never trusts the client clock for ordering pulls, only for merge order.
- Email codes go out over the product's own SMTP mailbox (`docs/USER-INPUTS.md`), so sending volume is that mailbox's.
- What a friend could reach, they may keep: a photo already downloaded stays on their phone, and Supabase's CDN serves an object a token already fetched until it expires (`docs/DECISIONS.md`, S1a).
