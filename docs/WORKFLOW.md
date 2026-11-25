# Ontrack: how we work

How a session works on Ontrack as of v2.3.0 (22 November 2026). The owner's own rules for working are in `docs/DIRECTIONS.md` section 7; this file is the procedure.

## 1. Starting a session

1. `CLAUDE.md` loads by itself. Read `docs/STATE.md` (where things stand, open items) and `docs/DIRECTIONS.md` (what the owner wants). Then only the doc the task needs (the table in `CLAUDE.md`).
2. `lsof -iTCP:5173 -sTCP:LISTEN`. If something is there, it is the owner's `pnpm dev --host` serving their iPhone (http://172.20.10.2:5173) from this checkout. Leave it alone (section 3).
3. Branch from an up to date `main`: `feat-<slug>`, `fix-<slug>`, or the round's name. Never work on `main`. A `git switch` in this checkout changes what the owner's phone shows (and Vite may show a "Soft-invalidated module" overlay until they reload). Branch here when the owner is watching the work; use a worktree (`git worktree add ../ontrack-<slug>`) with its own server port for anything they should not see yet, and tell them when you switch. Before deleting a branch, check `git log main..<branch>`.
4. `nvm use` (Node 22; the machine default is 24).

## 2. The loop: local first, with the owner watching

Most work since R1 has been done this way, and it is the default:

- The owner watches the change on their phone through their own :5173 server, which hot reloads from this working tree. So a branch switch or a half-written file shows on their phone at once. Keep the tree working between edits.
- Build exactly what the owner asked. Anything extra you notice goes in your reply as a suggestion, not into the code.
- While iterating run `pnpm check`, `pnpm test` (or one file), and only the e2e specs the change touches: `pnpm exec playwright test today.spec settings.spec`. Use `E2E_PORT=5198` if another server is up.
- Look at the result yourself before handing it over (section 4). Then tell the owner what changed, in a short list, and wait for their look on the phone.
- When the owner says "deploy" (or "if the tests pass, deploy"), follow section 5. An experiment branch the owner calls experimental is never merged until they say so.

## 3. Servers and processes

- **Never** `pkill -f vite` or any broad pattern: it kills the owner's :5173. Start your own server on another port (`pnpm exec vite --port 5174 &`), keep `$!`, and kill only that PID when done. If you do break theirs, restart it with `pnpm dev --host --port 5173 --strictPort` and tell them.
- Never run two Playwright runs at once (they share `test-results/` and fail each other), and never run the full e2e suite while an agent is editing files (the dev server reloads and tests fail at random).
- Long commands run in the background with their output tailed (`2>&1 | tail -n 20`); wait for the notification, never poll.

## 4. Checking UI yourself

- **The capture harness** in `/Users/admin/destination/ontrack-design/tools/capture/` (Playwright WebKit against your own server): `cap.sh`, `r2.spec.ts` (Today, Train, Progress, sheets, onboarding steps), `tile.py` for contact sheets; `ONLY=today,train` limits it. Sizes: 390 by 844, 390 by 664 and 692 (Safari with its toolbars), 375 by 548 and 667 (SE), 430 by 932. Its README has the commands.
- **yab-browser cannot open localhost** or LAN addresses. Use it only for signed-in outside sites (photogradient.com, Google Cloud, Supabase dashboards).
- **Headless WebKit draws no blur.** Judge glass in a Chromium shot or ask the owner to look on the phone.
- **Both styles.** Check a visual change in Tray and in Bento (`prefs.look`), light and dark, unless it is style-only.
- **The `verify-ui` skill** for a new screen or a big change: screenshots (`pnpm screenshots`), the stress matrix (`--project=stress`: overflow, clipped text, 44 px targets, nested corners), then the `design-critic` subagent. Two rounds at most. A clean rubric is not taste; the owner's phone is.
- Open at most two images in the main context, downscaled (`sips -Z 900`). Motion cannot be judged from a still: test end states and reduced motion, and give the owner a short Playwright video if it matters.

## 5. Releasing ("deploy")

1. Bump `version` in `package.json` (Settings shows it; minor for a round of features, patch for fixes).
2. Update `docs/STATE.md` (what shipped, open items) and add the round's lines to `docs/DECISIONS.md`. Update DESIGN.md or SCREENS.md if the change altered a screen or a rule, in the same pull request.
3. `pnpm verify`, then the full `pnpm test:e2e` alone (about 11 minutes, 389 tests at v2.3.0). Both must pass. A flaky test is fixed, not retried into green.
4. If the look of the app changed, regenerate the landing page's phone shots (section 7).
5. Commit, push, open a pull request with `gh`. CI runs the quick level (section 6). Add the `full-ci` label for changes to stored data, sync, sign in, the server or row level security.
6. When CI is green: `gh pr merge --squash`, `git switch main && git pull`, `git tag vX.Y.Z && git push origin vX.Y.Z` (a `v1` and later tag also starts full CI).
7. A merge to `main` deploys production on Vercel. Wait for it in the background with a bounded loop: `vercel ls ontrack` until the newest `https://ontrack-...` production row is Ready. Match the URL, never the "Production deployments" header line (a watcher that matched it once ran for 415 minutes).
8. `pnpm smoke:prod` (pages, headers, the version in Settings, server functions refuse without a session, PWA, offline reload). It fails if the deployed bundle lacks the new version. After a sync or RLS change also `pnpm test:live` (leave 5 minutes between runs: Supabase allows 30 code sign-ins per 5 minutes).
9. Check that CI on `main` (not only the pull request's) went green. It was red for two days unnoticed once.
10. If the change touched `design/tokens.css` or `src/app.css`, look at the landing page before and after the deploy: v2.2.0 shipped with the landing's glass gone.
11. Tell the owner: the version, the URL https://ontrack-black.vercel.app, what to look at on the phone.

## 6. CI

- `.github/workflows/ci.yml`, pinned to `ubuntu-24.04` (Playwright's WebKit does not launch on 26.04, which `ubuntu-latest` moved to on 18 November).
- **Quick**, on every pull request and push to `main`: check, unit tests, build, bundle report, the `@smoke` e2e tests and the e2e files the pull request changed. Markdown and `docs/` only changes skip CI, except `docs/SOURCES.md`.
- **Full** (every e2e test, screenshots, the stress matrix, the offline pass, in shards): the `full-ci` label, a release tag, or a manual run.
- CI minutes and deploy time are the owner's quota: iterate locally, run CI when shipping.
- A run stuck "queued" with no jobs: cancel it and push an empty commit.
- Review videos and screenshots for the owner go on the orphan branch `pr-assets` (its `vercel.json` turns deploys off). Never merge it.

## 7. Recurring jobs

- **Landing phone shots:** `LANDING_SHOTS=1 E2E_REAL_TILES=1 pnpm exec playwright test --project=shots` rewrites `src/flows/landing/shots/*.webp` (needs `cwebp` and the network for map tiles). They are made in Tray. To use the owner's real day and their food photos, add `LANDING_SEED=<json>` (records exported from their account) and `LANDING_PHOTOS=<folder>` (pin photos named by hue, `0.jpg`, `200.jpg`, `260.jpg`). Keep both outside the repo. Update `t.landing.alt` in `en.ts` if a number on a shot changed.
- **Gradients:** `sh scripts/gradients.sh <name>` remakes the photo gradients in `design/gradients/` (colours and settings are listed in the script).
- **Icons:** `pnpm icons` from the frozen `design/brand/app-icon.svg`.
- **Foods:** `pnpm foods:build` rebuilds `src/lib/data/foods.json`; Thai sources and recipes are in `data/thai/`.
- **Vision eval:** `pnpm eval:vision` against live Gemini, once per change to the prompt or resolver, 30 s between photos (the per-minute limit). Results go in `docs/EVAL-NOTES.md`.

## 8. Subagents

- Use one when the work would flood your context (reading many files, screenshots, long logs), when pieces are independent and can run side by side, or for a review by something that did not write the work (`/code-review`, `design-critic`).
- **Sonnet at xhigh effort** is the default worker: give it the owner's words, the files, the decisions already made, what is out of scope and the files it must not touch. Its suggestions are input; the owner or you decide.
- Give parallel agents disjoint files. An agent never commits, merges or deploys unless that is its whole task.
- Briefs point at files and sections; they do not paste docs. Earlier briefs that worked are in `ontrack-design/research/r2/BRIEF-*.md`.
- Project agents: `design-critic` (screenshots against the rubric), `source-checker` (one paper per agent, for `science-check`), `repo-scout` (the watermelon reference repo).

## 9. Tools

| Need | Tool |
| --- | --- |
| Svelte 5 correctness | The Svelte MCP: docs and `svelte-autofixer` on new or heavily changed components |
| UX research on real apps | The Mobbin MCP (load `mobbin:search` first). Read whole flows cheaply by curling each `image_url` and tiling a contact sheet with PIL. Cal AI is the most trusted reference; also Strava, Bevel, Alma, Apple Health |
| The design source | OneFin through the Framer MCP; the owner's picks in `ontrack-design/onefin/owner-picks/`; Figma MCP for the community files (iPhone 16 mockup, iOS 26 Liquid Glass, Meal AI kit) |
| Gradients | photogradient.com through yab-browser, or `scripts/gradients.sh` |
| Database | Supabase MCP for queries, advisors and logs; migrations only as files in `supabase/migrations/` pushed with the Supabase CLI |
| Hosting | Vercel CLI (`vercel ls`, `vercel env`, `vercel curl` for previews behind Vercel Authentication) |
| GitHub | `gh` for pull requests, checks and runs |
| Library behaviour | The library's own docs at its pinned version |

## 10. Spending tokens well

- Read the lines you need; search before opening; never re-read a file you just wrote.
- Tail command output. Watch CI and deploys in the background.
- Screenshots go to a subagent or a contact sheet, not one by one into the main context.
- Archived plans and notes are in `docs/archive/`: grep them, do not read them whole.
- Ask the owner one batched question, and only when the answer changes the work.
- Quality first: rework costs more tokens than care. Check platform behaviour against vendor docs instead of guessing (the Safari bar and the pull footer of 13 November were guesses that had to be rolled back).

## 11. When something goes wrong

- A check fails: fix the cause. Do not weaken the check, skip the test or widen a tolerance. If the check is wrong, change it in its own commit and say so.
- A free tier limit is hit: stop and tell the owner what it would cost. Never add a paid service.
- Docs disagree: the PRD for what, SCIENCE.md for numbers, DESIGN.md for look, the owner over all of them. Fix the doc that is wrong in the same pull request.
- The owner reports a bug with a screenshot: reproduce it in a test where possible, then fix it, so it cannot come back.

## 12. What only the owner does

Signing in to services and handling keys; approving a deploy; anything that spends money; emailing outside parties; the final look and feel on the iPhone; the course deliverables' submission.

## 13. Traps that bit us

**Tests**
- Load flakes that pass alone: rerun the one test alone (up to three times) before calling it real. Usual causes: another Playwright run, files edited mid-run (by you or an agent), `package.json` edited mid-run. Known ones: `supplements.spec` around line 143, sync "deleting the account removes its data everywhere", thai F15, stress landscape-phone shell and iphone-15-safari logging, onboarding "under BMI 16", the landing footer.
- A stuck e2e port: `lsof -ti :5199 | xargs kill` (killing `playwright test` leaves its Vite running).
- Mobile WebKit has no `mouse.wheel`: use `window.scrollBy`. An `aria-disabled` control needs `{ force: true }`. Vaul hears Escape only after its `transform: none`. Chromium's fake camera reads a barcode at once: stub `BarcodeDetector`.
- The test clock is 2026-11-11, a Wednesday. Mock sign in: any email and code `123456`; `<outcome>@seed.test` (raise, lower, on_track, adherence, need_data) seeds a check-in case. In dev, `window.ontrack` exposes the store and actions.
- Tests answer the style card for you (`stylePicked: true` in `useSpace` and `seedAccount`); call `showStyleCard(page)` to see it.

**Safari and WebKit**
- A browser feature behind a permission (camera, microphone, location) must also be allowed in `vercel.json`'s `Permissions-Policy`. Dev, preview tests and e2e never send that header, so only production blocks it (R7 shipped Speak with `microphone=()`; `pnpm smoke:prod` checks it now).
- Headless WebKit draws no backdrop blur. No regex lookbehind before Safari 16.4. `@property` colour transitions fall back to instant before 16.4. Never `scrollIntoView` (it pans iOS). Safari's bars take their colour from the page; nothing fixed within 4 px of an edge (`edge.ts`).

**CSS, Svelte and Tailwind**
- Plain rules outside `@layer` (as in `landing.css`) beat Tailwind utilities: a component's own `transition` silently replaced the chip's `transition-colors` until the colours were added to it.
- Radii live in a root-only `:root` block so light islands (`.haze`, `.feature`, `[data-theme=light]`) do not reset them.
- A `$effect` that calls `prefs.force()` reads and writes state and loops: use `onMount` with a cleanup.
- A Lucide icon given a `class` prop breaks its type: wrap it in a span. Tailwind needs whole class names (no `wash-{n}`).
- A chromium ancestor that fades or filters becomes a backdrop root and kills the blur under it: animate a glass bar by transform only.

**Shell (zsh on macOS)**
- Quote globs (`--include='*.ts'`), split with `${=var}`, `sed -i ''`. A `pgrep -f` inside a waiting loop matches itself: wait on a PID.

**Assets**
- `scripts/gradients.sh` needs the `yab` CLI and `cwebp`. Derive a new gradient from an approved one (the Today haze) as the source; fresh palettes were rejected twice.
