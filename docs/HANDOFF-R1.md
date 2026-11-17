# R1 handoff: read this first (written 16 Nov 2026)

One note to continue the work after a context reset. It says where things stand, what the owner wants and dislikes, what to distrust, and what to do first: a fresh, neutral review of everything built on this branch against production. `docs/STATE.md` has the R1 row; this file has the detail.

## 1. State of the work

- **Branch:** `app-research-onboarding-polish`, cut from `main` at `dd019d6` (L5, which is what production runs). `main` has not moved (checked 16 Nov).
- **Nothing is committed or pushed.** 64 changed files (+1,295, -525) and 10 new ones: `docs/FEATURE-RESEARCH.md`, `src/flows/log/SavedSheet.svelte`, `src/flows/notices/`, `src/flows/train/WorkoutSheet.svelte`, `src/lib/components/Disclosure.svelte`, `src/lib/keyboard.ts`, `src/lib/model/workout.ts`, `src/lib/notices.svelte.ts`, `tests/e2e/workout.spec.ts`, `tests/unit/workout.test.ts`. The owner reviews on localhost and decides what to keep or roll back. No PR yet.
- **Dev server:** `pnpm dev` on :5173 (mock backend, no keys). The e2e server is :5199 and must be free before a run (see section 5).
- **Last verification:** `pnpm check` 0 errors; `pnpm test` 3,525 passed; `pnpm build` ok. Last full e2e: 388 passed, 1 failed (SE "hero above the dock", fixed after by a short-screen exception); the affected specs were then rerun, 108 passed. **The whole suite was not rerun after that last tweak.** `pnpm verify` and the `verify-ui` skill have not been run on this branch.
- **Owner's verdicts so far:** "the add meal LOOKS MUCH BETTER NOW compared to the one on production". They disliked the old hero gradient (replaced, section 3). They sent a screenshot of a white rounded shape under the avatar button at the top right of Today that **I could not reproduce** (section 6, open item 1).

## 2. What was built on this branch (R1), by area

**Onboarding** (`src/flows/onboarding/`)
- On the landing's sky (`--grad-sky` behind the page, a light island in both themes). `Step.svelte`: progress at the top; a white 56 px Back beside Continue inside the landing's Liquid Glass capsule (`liquid`, inset 12 px each side so it stays under WebKit's 90 percent width, L4); `rise` blur settle for each block.
- Continue before an answer is `aria-disabled`, not `disabled`: a faint ink tint (Button.svelte), and a tap shakes `[data-answers]` with a buzz (`nudge()` in Onboarding.svelte). Metric is the default (`draft.ts` `fresh()`).
- `Choices.svelte`: ring with white check, tiles light lavender on the picked black card, dark violet on white ones. Days step shows a week of seven dots.
- `Building.svelte`: percent ring and five ticking rows, about 4 s. **Plays under reduced motion** (the owner never saw it before because the code skipped it; a wait's pacing is not motion). `YourPlan.svelte`: count-up from zero over `--d-reveal` 1.4 s, protein/carbs/fat tiles, **Goal weight section with a projected date**, three closed disclosures (training, how calculated, fine tune), scroll reveal (`reveal` + `inview`).

**Shared pieces**
- `Disclosure.svelte` (chevron accordion), `Row` prop `chevron`, `app.css` utilities `rise`, `reveal`, `no-scrollbar`, `appear` now `backwards`.
- `src/lib/keyboard.ts`: publishes `--kb` and `--vvh` while a field has focus; the drawer (`ui/drawer/drawer-content.svelte`) and Step's bar lift by it. **Unverified on a real iPhone.**
- Notifications: `src/lib/notices.svelte.ts`, `NoticesSheet.svelte`, a bell in `Header.svelte` with a red dot (`prefs.noticesRead`). The starting checklist moved there from Today. In-app only, no push.

**Today** (`src/tabs/Today.svelte`, `WeekStrip.svelte`)
- `WeekStrip`: Today pinned right; six sliding days that snap; tapping one of the left three slides it to the fourth; tapping Today slides back and picks it; a soft fade before the chip; **one letter on each day button, three-letter day in the big title** ("Tue, Nov 10", `dayTitleShort`). No "Back to today".
- One **To do** card (training rows, then the weigh-in row) instead of two. Start opens the workout log for strength sessions with exercises; Mark done is in the row menu.

**Add meal** (`AddSheet.svelte`, `DescribeSheet.svelte`, `ReviewSheet.svelte`, `MealSheet.svelte`, `SavedSheet.svelte`, `Scanner.svelte`, `ScanSheet.svelte`)
- Composer on the sky: "What did you eat?" pill field (opens Describe) with a mic, four round glass actions (Photo ink, Scan, Search, Quick add), Recent/Saved as one list with a switch, supplements as rows only if set up, else one row at the foot.
- Review: "Something off?" field re-reads the photo or words with the user's sentence (server `hint`); a Time field. Describe: Speak button where the browser has speech recognition. MealSheet: bookmark toggle; SavedSheet with swipe to delete. Scanner: Barcode, Meal, Label modes with Take photo (Add's Photo tile still uses the system camera).

**Train** (`src/tabs/Train.svelte`): order is Up next (feature gradient, Start, this week's session pills) then the conditional cards, the week, a compact program row, then Analysis (muscle balance is a closed disclosure). **Progress** (`src/tabs/Progress.svelte`): range, weight hero with the goal inside it, three glance tiles on the washes, intake, training with this-week pills, best lifts, consistency and maintenance behind chevrons, check-ins, history.

**Workout log** (`WorkoutSheet.svelte`, `src/lib/model/workout.ts`, `shared/records.ts`): set by set, rest timer, effort 1 to 10, summary with new bests. Stored as optional `workout` on the existing `slog` record (no new collection, no migration).

**Hero gradient:** `design/gradients/haze-light.webp` regenerated: Soft Bézier + FBM warp (`gt=1 ws=4` in `scripts/gradients.sh`, which now takes per-row `gt=`/`ws=`), with pinks; CSS fallback in `design/tokens.css` `--grad-hero`. Used by Today, Progress and Your plan heroes.

**Words:** shorter strings across onboarding and the app (tests were updated to match). **Docs:** `FEATURE-RESEARCH.md` (what fits with status, what is not taken and why, Bevel in section 6), `SCREENS.md` sections 2, 4, 6 to 9, `DESIGN.md` gradients, `STATE.md` R1 row.

## 3. What the owner wants (carry these forward)

- **Think from the ground up per page:** "imagine we do not have any UI yet": what does the user need to see and do, in priority order, then arrange for that. A restyle is not a rework. Pages: Today, Add meal, Train, Progress.
- **Design language:** the landing page (sky and wash gradients, display type, ink pill actions, violet brand, liquid glass on floating bars, blur-rise entrances). Keep Ontrack's own taste.
- **Features:** learn from Cal AI, Strava, Alma, Bevel and others on Mobbin; **cut anything that needs an OS connection** (Apple Health, Watch, widgets, push); the owner will not pay for an Apple developer account. No streaks, no guilt (PRD).
- **Process:** do it on this one branch, on localhost, so they can look early; report what was done as a list so they can keep or drop each item; "suggest, do not do" for anything unrequested; Sonnet's suggestions are input, not decisions. Do not run CI or deploy while iterating.
- **Small rules from the chats:** Back is white; Continue's disabled look must suit the glass; fewest words, secondary information behind a chevron; Today is the hub (weigh-in is there); metric first; day buttons one letter, title three letters.
- Memory files in `/Users/admin/.claude/projects/-Users-admin-destination-ontrack/memory/` hold the same (owner-onboarding-feel, owner-wants-feel, minimize-tokens, mobbin-contact-sheet, sonnet-xhigh-and-local-first).

## 4. Distrust list (my own earlier claims to check, not to repeat)

- I only looked at screens with seeded mock data at 390 wide (light and dark), the SE and a 1100 wide desktop. Real data, a long meal list, many saved meals, big text sizes, and every sheet at every size were **not** all reviewed.
- Several screens were judged from one screenshot each. Hierarchy decisions (Train's order, Progress's order, Today's To do card) are my reading of user need, not tested with the owner except Add meal.
- The headless WebKit screenshots do not render backdrop blur, so the glass looks flatter than it is.
- Text cuts were made by an exact-string script over the catalog and tests: check for awkward or ambiguous copy, plurals, and anything that lost a needed word.
- Docs may lag the code (SCREENS sections 6 to 9 were rewritten in one pass).

## 5. Gotchas learned the hard way

- **Never run two Playwright runs at once** (they clobber `test-results/` and give false failures). If a run is stopped, free the e2e port or the next run hits a dead server: `lsof -ti :5199 | xargs kill`. `pkill -f "playwright test"` leaves the Vite server behind.
- Known load flakes that pass alone: onboarding "maintain with lifting and cardio" and "under BMI 16"; friends/motion/landing footer; one stress "logging" scan; screens scan/sign-in/friends on SE.
- Scratch screenshots: a temporary `tests/e2e/zz-scratch.spec.ts` plus `playwright.scratch.config.ts` (testMatch on it, baseURL `http://localhost:5173`, `open()`/`openSeeded()` from `tests/e2e/helpers.ts`), **delete both afterwards**. Contact-sheet tooling (PIL) lived in the old session scratchpad; recreate it as needed. Test clock is frozen on 2026-11-11 (a Wednesday).
- Playwright treats `aria-disabled` as disabled (use `{ force: true }`). Vaul sheets hear Escape only after they slide in (wait for `transform: none`). Chromium's fake camera plays a barcode that is read at once, so camera-mode tests stub `BarcodeDetector` with all four formats.
- Repo invariants that bit: no `scrollIntoView` (pans iOS); lowercase captions only under `after.`; no raw hex (write `black`); Tailwind needs whole class names (no `wash-{n}`); shapes need equal gaps for corner nesting (`stress` checks); every button needs a pressed state; sentence case, no em or en dashes, no emoji.
- macOS: `sed -i ''`. Gradients: `sh scripts/gradients.sh haze-light` needs Yab and cwebp; photogradient.com styles: 0 Simple, 1 Soft Bézier, 2 Mesh Static, 3 Mesh Grid, 4 Sharp Bézier; warps 0 Simplex, 1 Circular, 2 Value, 3 Worley, 4 FBM, 5 Voronoi, 6 Domain Warping, 7 Waves, 8 Smooth.

## 6. Open items

1. **White shape, top right of Today** (owner screenshot, under the avatar, flush with the column's right edge, rounded bottom-left, touching the header's bottom edge). Not reproduced. Fixed a related one: the header's 16 px fade washing the Today chip (tabs now start 16 px lower, 4 px on screens under 620 px tall). Also made `appear` use `backwards`. If it persists, ask for window width and when it shows, and try the real clock (the owner's today is Monday 16 Nov).
2. Run the full suite once, alone, after the last tweak; then `pnpm verify` and the `verify-ui` skill.
3. Real iPhone Safari: liquid glass blur, the onboarding capsule and Safari 26's bar tint, keyboard lift, week-strip snap and fade, text blur on appear, speech recognition.
4. Owner decides keep or drop per feature (the list is in the last report: onboarding, bell, Save meal, AI fix, voice, goal weight, workout log, camera modes, Today/Train/Progress/Add rebuilds, gradient). Then commit in conventional commits and open a PR into `main`.
5. Not built: meals grouped by time (skipped, see FEATURE-RESEARCH), flash/zoom, a chart per exercise, create a saved meal from scratch, first-meal moment and coach marks, neutral milestones (owner call), progress photos.
6. Not done: DECISIONS.md entry, version bump, a `docs/STATE.md` trim (the R1 row is long).

## 7. First task for the next session: a fresh, neutral review

Do not defend the earlier work. Compare it with what production runs and judge it as a stranger would.

1. **Production baseline.** `main` is `dd019d6`, which is the latest production. Check out a worktree of `main` (`git worktree add ../ontrack-main main`, install, `pnpm dev --port 5174`) so both builds run the same mock data. Use https://ontrack-black.vercel.app only for the public landing page and onboarding visuals (production needs a real sign-in for the app).
2. **Same screens, same data, same size** (390 by 844, and 390 by 664 and 375 by 548), light and dark: onboarding (each step, Building, Your plan), Today, Add (and Review, Describe, Scan, Saved), Train (with a template program), Progress (seeded), the bell, the Workout sheet.
3. **Judge each page** by what the user needs first: can they do the main action in the fewest taps, is the important thing biggest, is anything noisy, is the new version better, worse or equal, and why. Name regressions plainly (including density, extra taps, lost information, copy that got worse, and test or code risk). Record what is clearly better (the owner already says Add meal is).
4. **Report** a table per page (better, worse, equal) and a recommendation per change (keep, drop, revisit), plus the open items above. Then wait for the owner. Do not change code until they answer.
