# Decisions

Changes to a doc's decision, and choices made on the owner's behalf. Newest first, one line each: what, why.

## M1

- No Figma link and no images in `design/references/`, so `docs/DESIGN.md` and `design/` are used as they stand. Why: nothing to reconcile.
- Unselected dock tabs use `--ink-2`, not `--ink-3`; DESIGN.md section 7 now says so. Why: their labels are text and need 4.5 to 1 (section 12). Settles the M0 open item.
- The compact button and the chip are 44 high to tap, with the 36 high pill drawn inside. Why: section 7 asks for 36, the rubric for 44 px targets.
- Segmented options are 44 high, so the control is 52. Why: 44 px targets.
- The gallery picks the text size with chips, not a segmented control. Why: four options at the largest text clip in a segmented control on the SE.
- New tokens: `--scrim` behind an open sheet, and `--t-key` (24, scaling like Display) for keypad numerals. Why: section 7 asks for both and tokens.css had neither.
- Sheets are `--surface` with no shadow, over the scrim. They keep watermelon's 44 px close button beside the title. Why: section 4 puts sheets on surface; only the dock and toasts float; the button is a visible, named way to dismiss.
- In the composed Today, reference spacings off the 4 px grid (2, 6, 10, 14, 18) are rounded to the grid. Why: rubric 6.
- Row hairlines are inset to the text, not full width as in the reference. Why: section 7 says inset.
- Row titles wrap to two lines and captions wrap, rather than truncate. Why: truncation cut "Adds 240 kcal" to "Adds 2..."; the reference wraps the same caption.
- Macro columns show the value and "of 108 g" on two lines, not one. Why: the reference's single line wraps unevenly at 390 (carbs) and at large text, which puts the three tracks at different heights.
- Today's week cell keeps the reference's 16 px corners although section 7 calls it a pill. Why: the reference is the worked example; a full radius makes a tall capsule.
- Week strip: days after today cannot be picked; a picked past day is a `--surface-2` tile; today's on track dot is lime on the ink pill. Why: nothing to show for the future; `--lime-ink` on ink is invisible in light mode.
- The Train tab and the training tile use the reference's level barbell (`TrainIcon.svelte`), not Lucide's diagonal dumbbell. Why: match the reference.
- Track: the zone runs from its lower to its upper bound or the end of the 110 percent scale, whichever comes first; the fill is lime only inside it. Why: the gain band (95 to 115) runs past the scale; the lose band (90 to 105) ends inside it.
- Keypad keeps watermelon's four columns with "+" to add amounts up and "00", returns a number, drops the note and delete options, and draws keys on `--surface-2`. Why: summing two amounts is useful for calories; the rest was shop specific.
- The gallery lives at `/gallery` and `/gallery/today` on the dev server, local builds and Vercel previews, and is dropped from production builds (`VERCEL_ENV`) and from the precache. Why: the owner reviews it on a preview from the iPhone.
- Gallery-only labels are inline; product words come from `en.ts`. Meal photos in the gallery are flat colour SVG squares, as in the reference. Why: the gallery is a dev tool; no real photos exist yet.
- Captions that continue a number ("to go", "of 2,460 kcal") live under `after` in `en.ts` and may start in lower case; the copy check now also runs catalog functions. Why: the sentence case check was wrong for fragments.
- The drawer is watermelon's shadcn-svelte output, ported and trimmed to five files, not generated again with the CLI. Why: same code, already adapted for iOS.
- Not built in M1: a wordmark component. Why: section 1 uses it only on welcome, install guide and Settings (M4 and M9).

## M0

- Unselected tab labels use `--ink-3`, as the Dock row in DESIGN.md section 7 says, though that is about 3.2 to 1 on the light dock and section 12 reserves `--ink-3` for large or non essential text. Kept for now; the icon, position and the selected state carry the meaning. M1 settles it (now `--ink-2`, see M1).
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
