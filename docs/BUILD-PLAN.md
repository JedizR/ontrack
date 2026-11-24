# Build plan: what is next

Every planned milestone has shipped (M0 to M9, then the rounds L5 and R1 to R6; v2.5.0 is live). This is the backlog from 23 November 2026, most useful first. Claude owns the order (`docs/DIRECTIONS.md` section 1), but the owner usually arrives with their own list from the phone: that list goes first. The old milestone plans are in `docs/archive/BUILD-PLAN-SHIPPED.md`.

Each item: what, why, where to start, and when it is done. Ship a round as one branch, shown on localhost, released when the owner says (`docs/WORKFLOW.md` sections 2 and 5).

## 0. What is left before Ontrack is a finished app (the R5 evaluation, 23 Nov)

Must have, for a real launch:
- **Payments for real:** Stripe webhooks (renewals, failed payments, cancellations made outside the app) and the customer portal; live mode with the business verified, receipts, a refund policy, Thai VAT once sales pass 1.8M baht a year. Vercel Hobby forbids commercial use, so Vercel Pro; Supabase Pro for daily backups.
- **A trial reminder** two days before the first bill. Ontrack sends no email or push today (out of scope), so it is an in-app card only until one exists.
- **AI cost control at scale:** the R5 model loses money if every free user's photo runs on a 3.x Flash class price. Route the free plan (or routine photos) to Flash-Lite and measure the accuracy cost, keep the fair use cap.
- **AI accuracy measured:** a weighed-plate truth set (30 to 40 photos, kitchen scale) and `eval:vision` with repeats and the new replay mode, before claiming R5's resolver gains. The coach has never run on live Gemini (item 3).
- **Analytics and error reporting:** nothing measures the funnel (landing, onboarding, plans sheet, Checkout) or reports a crash; both are needed to run the business the model describes, privacy first.
- **Legal review:** the terms, privacy page and PDPA consent by a lawyer before taking money.
- **Accessibility on a device:** a VoiceOver pass on the iPhone (the stress matrix checks sizes and contrast, not a screen reader's flow).

Should have:
- Personal portion priors (the user's own grams habit per food) and a per-dish calibration from corrected meals (AI audit items 10 and 11).
- Food table gaps (item 4) and the oil and sugar questions for drinks and fried dishes (AI audit item 9).
- The rest of the wording audit (`docs/archive/WORDS-AUDIT-R5.md`, 62 rows, about 20 applied in R5): "item" to "food", "Save meal" to "Save for next time", first person on the friends screens.

Nice to have: a monthly recap, milestones without streaks, progress photos, Ask Ontrack from other pages (item 8).

## 1. The owner's iPhone pass of v2.3.0

- **What:** the owner looks at the app on the phone in both styles: the style card on Today, Bento's flat pages, the check-in sheet, the nav and header glass (they said they would show how the glass looks on their phone), the sheet colour under the keyboard, the Done and Undo feel, and the light gradient panels in dark mode (never reviewed).
- **Why:** headless WebKit draws no blur and cannot judge feel; every round so far has come back with device feedback.
- **Done when:** their notes are fixed or recorded in `docs/DIRECTIONS.md`.

## 2. Thai photo accuracy, measured

- **What:** run the photo eval (`pnpm eval:vision`) on Thai dishes with the R2 fields (`dish`, `protein`, `extras`) and the 983-food table, including the protein variants (pad kra pao with chicken, pork, beef, duck, shrimp). Add photos of the new variants to the fixtures.
- **Why:** Thai food is the reason the app exists. The last eval (R2) was text only, 30 of 30; no photo eval has run since the table grew. The key is on the paid tier, so it is cheap.
- **Where:** `scripts/eval-vision.ts`, `server/vision/` (`thai.ts`, `prompt.ts`), `docs/AI-THAI.md`, results in `docs/EVAL-NOTES.md`. 30 s between photos.
- **Done when:** a dated entry in EVAL-NOTES with dish, protein and calorie accuracy, and fixes for what it finds.

## 3. The coach on live Gemini

- **What:** call `/api/coach` live for each kind (week, check-in, session, gap, ask, program) and check the words against the catalog's voice (DESIGN.md section 2), the latency (program retries twice at 25 s), and the shared daily quota (`AI_DAILY_USER_LIMIT`, photos and coach together).
- **Why:** only the mock has spoken so far.
- **Where:** `server/coach/`, `server/handlers/coach.ts`, TECH-SPEC section 7b.
- **Done when:** an entry in EVAL-NOTES and prompt fixes for anything off voice.

## 4. Food table gaps

- 7-Eleven ready meals (no box weights found), jok variants, beef and pork khao soi, pad pak dishes, garlic pepper stir fries.
- A plain table item picked for a fried food loses its oil flag (`docs/AI-THAI.md`).
- **Where:** `data/thai/` (sources and `recipes/`), `pnpm foods:build`.

## 5. Small design leftovers

- From the design critic after R3: planned days in ink on Train's week, the Up next ring, the sparkle on Adjust with AI.
- **Where:** `src/tabs/Train.svelte`; run `verify-ui` on Train after.

## 6. Loose ends found in the 22 Nov docs refresh

- **Unused since R3:** the coach's `session` kind has no caller (the finish screen went with set logging; `sessionFacts`, its server rules and template remain): wire it to Done or remove it. `bits-ui` is a direct dependency nothing imports.
- **Unused tokens:** `--glass-*`, `--bar-*`, `--blur-glass`, `--blur-bar`, `--fade-h`, `--spring-reveal` in `design/tokens.css` (only `contrast.test.ts` still reads `glass-solid` and `bar-solid`).
- **Bento's corners are untested:** the `unnested` corner gate in the stress matrix runs only in Tray.
- **More stale comments:** `Header.svelte` line 19 ("fades into the canvas"), `SupplementSheet.svelte` ("the one violet featured card").
- **Per-phone dismissals on an account switch** (found in R6's review): when a session expires and another account signs in without signing out, the database is wiped but `prefs.paywallDue`, `suggestOff`, `liftAsked` and `guideHidden` stay. Clear them where the wipe happens (`session.svelte.ts`), as sign out does.
- **`--grad-streak`** is still named streak although the box is Consistency and the app has no streaks. Rename with `scripts/gradients.sh`.

## 7. Engine questions (need `science-check` before any number changes)

- **Calories out** on Progress is the plan's baseline plus logged exercise, a formula. Consider showing the check-in's measured maintenance once it exists.
- **Program changes apply from today.** Changing the program after training today also changes today's target. Consider asking "from today or tomorrow?" when a session is already done.
- **Cardio setup is descriptive:** speed, incline and level do not change the energy; intensity does. ACSM walking and running equations would need sources and constants in `constants.ts`.

## 8. Ideas from research the owner has not asked for

Suggest these, do not build them unasked: a monthly recap, neutral milestones, coach marks, a first-meal moment, meals grouped by time, per-exercise charts, creating a saved meal from scratch, camera flash and zoom, Ask Ontrack from pages other than Progress, progress photos. Sources: `docs/FEATURE-RESEARCH.md`, `ontrack-design/research/`.

## Not planned

Push notifications, Apple Health, Watch or anything needing a paid Apple developer account; a Thai language interface; set by set workout logging and a workout timer (removed on purpose, 18 Nov); a dietitian's review; a public launch.
