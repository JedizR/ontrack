# Decisions

Changes to a doc's decision, and choices made on the owner's behalf. Newest first, one line each: what, why.

## M0

- The plus button and the header avatar render but do nothing yet: the plus opens Add in M5, the avatar opens Settings when Settings exists. Why: the shell is the M0 outcome and its layout must be real; there is nothing to open yet.
- Supabase MCP not added. Why: it needs a browser sign in, which the unattended run may not do. The CLI (`supabase db advisors --remote`) covers advisors. See `docs/BLOCKERS.md`.
- No branch protection on `main`. Why: GitHub Free has none for private repositories. The rule is held by habit and CI.
- Vercel variables are set for production and preview only, not development. Why: sensitive values cannot target development, and `vercel env pull .env.local` would overwrite the database password kept there. M3 decides how `pnpm dev:live` gets its values.
- `VITE_BACKEND=supabase` on Vercel. Why: the mock backend exists only in the dev server.
- Keep-alive cron runs daily at 03:17 UTC. Why: Hobby allows one run a day; an off-hour minute avoids the top-of-hour rush.
- `Permissions-Policy` allows the camera for the app's own origin. Why: photo logging in M6. Microphone and location stay off.
- Migration 0001 differs from the spec text in three places: `records_lww` sets `search_path = ''`; `records` revokes all from `anon` and `authenticated` before granting select, insert and update (no delete or truncate, deletes are tombstones); `ai_usage` revokes all from client roles and carries an explicit deny policy. Why: the security advisors flag a mutable search path and a table with RLS but no policy, and the gate needs a clean report.
- The update toast's action is an inverse pill, not lime. Why: lime marks the one primary action on a screen, and the dock's plus is already lime.
- Toasts sit 16 px below the header, not at watermelon's 68 px. Why: Ontrack's header height is a token.
- Tailwind theme names differ from token names where they would collide: `font-sans` and `font-rounded`, and the `shadow-float`, `bar-glass` and `num` utilities read the tokens directly. Why: a theme variable named like its token would be circular.
- Theme, text size and last tab stay in one store, `src/lib/prefs.svelte.ts`, instead of separate `theme.ts` and `textsize.ts`. Why: that is watermelon's tested shape and the three share one saved key, `ot-ui`.
- Helpers ported from watermelon's `src/lib/ui/` live in `src/lib/` (`haptics.ts`, `platform.ts`, `swipe.ts`). Why: the tech spec layout has no `ui/` folder.
- End to end `light` and `dark` projects run WebKit with the iPhone 13 profile at 390 by 844. The `stress` project runs Chromium, as in watermelon. Why: WebKit is closest to Safari; the stress checks are layout only.
- The supabase and vercel CLIs are used from their global installs (supabase 3.1.0, vercel 65.14.0), not pinned as dev dependencies. Why: both download binaries on install and CI does not need them.
- pnpm 12.15.0 is pinned through `packageManager`. Why: corepack in CI then uses the same version as the lockfile.
- `protobufjs` build script is denied in `pnpm-workspace.yaml`. Why: it comes with `@google/genai` and its postinstall only prints a notice.
- New dependencies pinned at the newest release at least a week old: `@google/genai` 3.0.0 and `prettier` 3.9.10 rather than releases one and two days old. Others at latest: `zod` 4.6.7, `@supabase/supabase-js` 2.119.0, `prettier-plugin-svelte` 4.1.1, `tsx` 4.23.15.
- CI actions bumped to the current majors: `checkout` v7, `setup-node` v7, `upload-artifact` v7.
- `pnpm foods:build` is not defined yet. Why: its script and `data/food-list.csv` are M5 work (tech spec section 9).
