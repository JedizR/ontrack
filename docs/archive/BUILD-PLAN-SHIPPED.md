# Build plan: shipped milestones

Moved out of `docs/BUILD-PLAN.md` on 13 November 2026 so each session reads only the open milestones. Read a section here only when a task needs its detail.

## M0 Foundations

Read: this section, `docs/USER-INPUTS.md`, `docs/ARCHITECTURE.md` section 3.

1. **Preflight.** Check and report once: Node against watermelon's `.nvmrc`, `corepack enable pnpm`, `gh auth status`, `vercel whoami`, `supabase projects list`, the Svelte MCP in `claude mcp list`, and the Playwright CLI (`npm install -g @playwright/cli@latest`, then `playwright-cli install --skills`).
2. **Scout.** Run the `port-from-watermelon` scouting brief in the `repo-scout` subagent. Result: `docs/PORT-NOTES.md`.
3. **Scaffold.** Copy the root configuration from watermelon (package manifest, Vite, Svelte, TypeScript, Tailwind, shadcn `components.json`, pnpm workspace, `.nvmrc`, Playwright, PWA assets) and strip what is specific to that app. Add the new dependencies and pin them. Create the layout in `docs/TECH-SPEC.md` section 2 with empty modules where needed.
4. **Tokens.** `src/app.css` imports `design/tokens.css` and maps the tokens into the Tailwind theme. The pre-paint script sets theme and text size.
5. **Shell.** The real header, three empty tabs and the dock, built from tokens, with tab switching.
6. **Scripts.** Every command in `CLAUDE.md` works. `pnpm verify` is the single check.
7. **Repository.** `git init`, a short `README.md`, first commit, `gh repo create ontrack --private --source=. --push`. CI passes on a pull request.
8. **Supabase.** Create and link the project, write migration `0001_init.sql` from the tech spec, `supabase db push`, run the security advisors. Add the Supabase MCP at project scope, limited to this project's ref (confirm the current URL form in Supabase's docs).
9. **Vercel.** Link the project, connect the repository, set the public environment variables, add `vercel.json` (fallback, cache headers, the daily cron), implement the keep-alive handler, deploy.
10. **PWA.** Icons generated from `design/brand/app-icon.svg`. The installability script passes against the preview URL.

Gate: `pnpm verify` green locally and in CI. The preview URL shows the shell in light and dark. `scripts/check-pwa.mjs` passes. The advisors report nothing. A screenshot of the shell at 390 by 844 is in the pull request.
Owner checks: open the preview on the iPhone, add it to the home screen, confirm the icon and the full screen launch.

## M1 Design system

Read: `docs/DESIGN.md`, everything in `design/`, `docs/USER-INPUTS.md` sections 2 and 3.

1. **Take in the owner's references.** If there is a Figma link, add the Figma MCP (`claude mcp add --transport http -s project figma https://mcp.figma.com/mcp`), read variables and the named frames one frame at a time, and reconcile them with `design/tokens.css` using the precedence rule. Look at every image in `design/references/`. Record each change and each deviation in `docs/DECISIONS.md`.
2. **Components.** Add the shadcn-svelte pieces needed, restyle them, then build every component in `docs/DESIGN.md` section 7. Port the keypad, sheets, toasts, header behaviour, haptics, theme and text size from watermelon.
3. **Gallery.** A development only screen showing every component in every state, plus a Today composed from the real components with the same content as `design/reference-today.html`.
4. **Check.** Screens and stress projects cover the gallery. Run `verify-ui`. Put the reference mock and the composed Today side by side in the pull request, light and dark.

Gate: the rubric passes on the gallery at three device sizes and three text sizes in both themes. The composed Today matches the reference in structure, spacing and type.
Owner checks: the gallery on the iPhone. Approve, or say what to change.

## M2 Engine

Read: `docs/SCIENCE.md`.

1. Run `science-check`. Result: `docs/SOURCES.md` with a verdict for every source id, and any corrected values applied to the spec, the vectors and `docs/DECISIONS.md`.
2. Write `constants.ts` with value, unit, source id and status for every number.
3. Implement resting energy, plan, daily targets, macros, on track status, trend, check-in and program analysis as pure functions.
4. Tests: every vector in section 13, plus properties: a cap is never exceeded, a floor is never broken, protein never falls when weight rises, the matched week sums to the even week within rounding.
5. Write the exercise library and the four templates, with their tests.

Gate: all engine tests pass. Every source id has a row in `docs/SOURCES.md`. No constant is inlined outside `constants.ts` (a grep proves it).

## M3 Data, sync, sign-in

Read: `docs/TECH-SPEC.md` sections 3 to 7, `docs/PORT-NOTES.md`.

1. Record types and zod schemas in `shared/records.ts`.
2. Port the store and the outbox. Write `actions.ts` for profile, plan, weight, meal, saved, program, session log, check-in and day, with undo where a delete exists.
3. Write the mock backend and its Vite middleware. Port the sync engine onto the `Backend` interface.
4. Write the conformance suite. Make it pass on the mock.
5. Write the Supabase backend. Make the same suite pass against the real project with a test user.
6. Build the sign in sheet with Google and the email code, the session expired state, sign out with the wipe, and the account deletion handler.
7. `pnpm dev:live` runs the app against the real services.

Gate: the conformance suite is green on both backends. An end to end test logs data offline in one browser context, reconnects, and sees it in a second context.
Owner checks: set up the Google client. On the iPhone, in the installed app: sign in with Google, close and reopen, sign out, sign in with an email code. Report anything that opens Safari or loses the session.

## M4 Onboarding and plan

Read: `docs/SCREENS.md` sections 3 to 5, `docs/PRD.md` F2 and section 7.

Build the install guide, welcome, the nine steps, the guardrail screens, Your plan with its breakdown and fine tuning, and the hand over to sign in with the draft surviving the redirect.

Gate: end to end tests for each goal, for each guardrail path, and for a returning user. The flow completes in under 90 seconds by stopwatch. `verify-ui` passes on every step.
Owner checks: run it twice on the iPhone, once as yourself and once as someone trying to lose weight.

## M5 Today and logging

Read: `docs/SCREENS.md` sections 6 and 7, `docs/TECH-SPEC.md` section 9.

1. Draft `data/food-list.csv`, write the build script, generate `foods.json`.
2. Today in full: week strip, hero with the track, macros, cards, training card as a stub until M7, meal list, undo.
3. Add sheet, Search with portions, Quick add, Recent and Saved, the Meal sheet.
4. Weigh in sheet and the weigh-in prompt.

Gate: end to end tests for F3, F5 and F6, including logging while offline. The food build fails when a nutrient is missing (a test proves it). `verify-ui` passes. Logging a recent meal takes two taps.
Owner checks: use it for a full day with search and quick add only. Note every moment of friction.

## M6 Photo logging

Read: `docs/TECH-SPEC.md` sections 7 and 8, `docs/SCREENS.md` section 7.

1. The analyze handler, quota, provider interface, mock provider with fixtures, the Gemini provider. Confirm the current Flash model id and its options in Google's docs first.
2. Capture, resize, thumbnail, upload queue.
3. The Review sheet with every state, the oil control, Describe.
4. With the owner's development key: run the owner's ten meal photos, write what the model got right and wrong into `docs/EVAL-NOTES.md`, and tune the prompt once against them.

Gate: end to end tests for F4 on the mock, covering success, not food, limit, offline and provider failure. The handler rejects a missing token, an oversized body and a bad schema. The median time to a review sheet on the live key is under 8 seconds.
Owner checks: provide the Gemini key. Photograph ten real meals over two days, at least five of them Thai dishes.

## M7 Training

Read: `docs/SCREENS.md` section 8, `docs/SCIENCE.md` sections 4, 5, 7 and 11.

Build the Train tab, the session sheet, the exercise picker, templates, the analysis and recommendations, session done and skipped on Today, and matched targets everywhere a target is shown.

Gate: end to end tests for F7 and F8. Changing a program creates a new plan from the next day and leaves past days as they were. `verify-ui` passes.
Owner checks: enter your real program and say whether the recommendations are right.

## M8 Progress and check-ins

Read: `docs/SCREENS.md` sections 9 and 10, `docs/SCIENCE.md` section 10.

Build the chart, the Progress cards, history, and the check-in flow. Add a development only data seeder that creates weeks of realistic logs for each check-in outcome.

Gate: end to end tests for F9 and F11 using the seeder, one per check-in reason. Vectors F and G drive the screens to the expected proposal. `verify-ui` passes.
Owner checks: walk through each seeded check-in and judge whether the sentence matches what the numbers show.

## N1 Thai foods and remembered nutrition

Read: `docs/PRD.md` F14 and F15, `docs/TECH-SPEC.md` sections 3, 5, 8 and 9, `docs/SCREENS.md` section 7, `docs/EVAL-NOTES.md`.

1. Find a published Thai food composition source whose terms allow use in an app. Candidates: the Thai Food Composition Database from INMU, Mahidol University; the Department of Health's nutritive values of Thai foods; the ASEAN Food Composition Database. Record the source, edition and terms. "Nobody types a nutrient value" still holds: `pnpm foods:build` reads the source file, or a checked-in extract of it with page references and a checksum, and fails on a missing value.
2. At least 80 Thai dishes and Thai ingredients: rice and noodle dishes, curries, stir fries, soups, salads, grilled meats, sticky rice, desserts, drinks. Thai script and romanised aliases, and Thai portions (plate, bowl, bag of sticky rice). Mixed dishes stay as one item when the table has the dish.
3. The vision catalog carries the Thai dishes, and the prompt prefers a catalogued dish over its parts. If the evaluation shows it helps, drop `est_per_100g` from the output when `food_id` is set, to cut tokens and time.
4. Remembered nutrition: a synced per user collection keyed by `food_id`, or by the normalised name when there is none, through `actions.ts`, the store and sync, with the sync conformance suite extended. Applied on the device after resolution and in search. The source label says Yours, with a control to forget it.
5. Rerun the evaluation on the Thai photos with the free key (about 20 requests a day, so budget them): table match rate and time to a review sheet, before and after, in `docs/EVAL-NOTES.md`.

Gate: end to end tests for F14 (search by a Thai script alias, a Thai dish fixture resolves to Database) and F15 (correct, log again, see Yours, forget). Conformance green on both backends. The evaluation numbers are in the pull request.
Owner checks: log five Thai meals you eat often and judge the numbers.

## N2 Supplements

Why: the owner's own pain point. Many lifters have a protein shake as their breakfast. Photographing a shaker is awkward and searching for it is slow; "whey, 2 scoops" should be three taps.

Read: `docs/PRD.md` F5 and F21, `docs/SCREENS.md` sections 6 and 7, `docs/DESIGN.md`, `docs/TECH-SPEC.md` sections 3 and 5.

1. UX first. Before code, write the flow into `docs/SCREENS.md`: setting up a supplement from its label, logging it, changing the amount, editing and removing it, the zero calorie case, and every empty and error state. Lay it out against the OneFin references and the existing Add sheet. Use the fewest taps for the common case and one-hand reach, with wheels or typed steppers and no keypad.
2. Data: a synced per user supplements collection (name, kind, scoop grams, nutrition per scoop, last amount, last mix) through `actions.ts`, the store and sync, with the conformance suite on both backends and a Supabase migration with row level security. A logged supplement is a meal item that refers to it.
3. Presets for whey, casein, plant protein, mass gainer and creatine. Defaults come from the food table through `foods:build` where USDA has the item; otherwise the user enters the label. The setup says in one line why the label is the better number.
4. The user's supplements sit at the top of the Add sheet. The amount sheet shows calories and protein live, starts at the last amount, and offers water or milk (milk from the food table).
5. Today and past days show logged supplements. Creatine and other zero calorie supplements show as taken, compactly.

Gate: end to end tests: set up whey from its label, then log 2 scoops in three taps from the plus and see Today update; log creatine as taken; edit and delete with undo; log offline. Conformance green on both backends. `verify-ui` passes, with the design critic judging against OneFin.
Owner checks: set up your own whey from the tub and log your morning shake for a few days.

## B1 Barcode scanning

Why: the owner made barcode scanning a main feature. Much of what Thai users eat is packaged, a lot of it from convenience stores, and a barcode is the fastest exact log there is.

Read: `docs/PRD.md` F5, F15 and F22, `docs/SCREENS.md` section 7, `docs/TECH-SPEC.md` sections 3, 5, 7 and 8. For ideas only (it has no licence, so copy no code): https://github.com/rezahedi/NutriScan, which scans with the browser's `BarcodeDetector`, looks products up in Open Food Facts then USDA, and caches each product so it is fetched once.

1. UX first, in `docs/SCREENS.md`: scan from the Add sheet in one tap; the camera view with a framing guide, the torch where the browser allows it, and typing the number; the found, not found, unreadable, offline and camera denied states; the product sheet with serving choices and live calories; Add. OneFin design, real icons, words chosen to get the tap.
2. Scanning: the browser's `BarcodeDetector` where it exists (Chrome on Android), otherwise a lazily loaded WebAssembly decoder for Safari (for example the `barcode-detector` polyfill on zxing-wasm; check its licence and size). A lazy chunk, so the initial JavaScript budget holds.
3. Lookup: the user's saved products first (a synced per user collection keyed by barcode, so it works offline), then Open Food Facts (free, no key; follow its API rules on identifying the app and rate limits, and credit it under the ODbL). If a product is unknown or lacks nutrition, "Photograph the label" sends the panel to the vision provider with a prompt that reads printed values and never estimates; the user confirms, and the product is saved. A shared server side cache of Open Food Facts lookups is optional; decide from the call volume.
4. Source labels: Open Food Facts, Label, Yours.

Gate: end to end tests on the mock: a known barcode fixture logs in the fewest taps; an unknown one goes through a label photo fixture, is saved, and scans again offline; camera denied falls back to typing. Unit tests for check digits, Open Food Facts parsing and the label reader's schema, plus the decoder reading barcodes from fixture images. Conformance green on both backends. `verify-ui` passes. Live camera scanning goes on the owner's list, since the test browser has no camera.
Owner checks: scan ten packaged foods at home or in a convenience store.

## D2 Visual refinement

Why: the owner's feedback on D1. The 3D gradient button goes. Ontrack adopts OneFin's clean pieces instead: the "Withdraw" card (a flat solid pill on a white card, light grey stat tiles, all on a lavender surface) and its glassmorphism done right (the invoice card: one gradient header, a frosted "Paid" pill, a floating "Direct pay" chip with a thin white border, ghost cards stacked behind). Gradients and glass go on a few elements only. Think before applying: adopt each OneFin pattern because it helps that screen, and write the reason in `docs/DESIGN.md`.

Read: `docs/DESIGN.md` and the invariants in `CLAUDE.md`. The primary source is `/Users/admin/destination/ontrack-design/onefin/owner-picks/`: sixteen screenshots the owner curated as "the most direct answer to what design to adopt from OneFin", and `OWNER-PICKS.md`, which reads each one and the system they add up to. The owner's instruction: extract the style from these, and improvise every other component in the same style. The wider extraction (`IDENTITY.md`, `site/components/`, `site/motion/frames/`) is background only; where it disagrees, the picks win. No OneFin artwork, photos or brand marks ship.

1. Audit every gradient, 3D effect, glow and blur in the app today, with a keep or change verdict and the reason.
2. Buttons: the primary action becomes an ink pill like "Withdraw" and the pricing buttons in the picks (white on dark or coloured surfaces): flat, at most a soft drop shadow, no colour gradient, no bevel, no glow, and a clear pressed state. Secondary actions are grey pills; icon buttons are ink squares, grey when disabled. The dock's plus joins the same family. Violet becomes the brand colour (icon tiles, links, highlighted words, badges, progress, the one featured card), not the action colour: rewrite the "Violet means act" invariant in `CLAUDE.md` and `docs/DESIGN.md`, and keep green for "reached".
3. Rules in `docs/DESIGN.md`:
   - Where glass is allowed: small floating chips and pills over a coloured or gradient surface, sheet backdrops, the dock.
   - What glass is made of: backdrop blur, a 1 px translucent white border, a soft shadow, and a fallback for browsers without blur.
   - At most one hero element per screen may carry a gradient.
   - Content cards stay solid (white, or the dark equivalent) so numbers stay readable.
4. Apply the rules to every component and screen, through tokens only.
5. Borrow the reference's number styling (the decimal part in a lighter ink) where it helps reading, for example weight.

Gate: no gradient or glow on any button, proved by a test over the component styles. `verify-ui` passes, with the design critic judging against the owner's two picks. The pull request shows before and after for Today, an onboarding step, Add, a sheet and the dock, in light and dark.
Owner checks: the refined look on the iPhone in Safari.

## N3 Thai nutrition from Thai sources

Why: N1 found no Thai source whose terms allow distribution, so its Thai dishes come from Singapore and USDA data. Ontrack is a class proof of concept that will not launch publicly, and the owner wants the closest Thai numbers there are: Thai government, university and hospital pages found with Thai keywords, and values the owner sends. Record this reasoning and each source's terms in `docs/DECISIONS.md`.

Read: `docs/DECISIONS.md` (N1), `docs/EVAL-NOTES.md` (N1), `docs/TECH-SPEC.md` section 9, `scripts/build-foods.ts`.

1. Search in Thai, for example "พลังงาน ต่อ 100 กรัม ผัดกะเพรา", "ตารางคุณค่าทางโภชนาการอาหารไทย", "แคลอรี่ อาหารจานเดียว กรมอนามัย", with WebSearch and WebFetch. Use the owner's browser through `yab exec` only for pages that need a real browser. Prefer the Department of Health, INMU and Thai university or hospital pages, and record each page's URL, publisher and date.
2. Save each source page as a snapshot in `data/thai/` with a checksum; a parser extracts the values and `pnpm foods:build` reads them, so nobody types a nutrient value. Values the owner sends go in `data/thai/owner/` with where they found them.
3. Fill the gaps N1 listed first (khao soi, massaman, red and panang curry, tom kha, som tam, larb, nam tok, kai yang, moo ping, pad see ew, khao kha moo, Thai desserts), then common street food and convenience store dishes: at least 60 dishes that have no table entry today. Thai script aliases; the interface stays English.
4. Where a Thai source and an existing entry disagree, prefer the Thai source and list differences over 20 percent in `docs/EVAL-NOTES.md`.

Gate: the build reads every Thai value from a snapshot, every Thai row cites its page, the N1 evaluation reruns within the free quota with the match rate reported, and tests pass.
Owner checks: send any Thai nutrient facts you find, and judge five dishes you eat often.

## T1 Gain pace and hybrid training

From the owner's friends: a way for skinny people to gain weight faster in a healthy way, training analysis and suggestions, and support for people who do both strength and cardio. The analysis and suggestions exist since M7; T1 adds the rest.

Read: `docs/PRD.md` F7, F10, F19 and F20, `docs/SCIENCE.md`, `docs/SCREENS.md` (onboarding pace, Train, Progress).

1. Science first, with the `science-check` skill: a primary source for a faster rate of gain for lean or underweight adults, who may choose it (a BMI or experience limit), and how it sits with the surplus cap. New constants go in `constants.ts` with their sources and engine test vectors. If no source supports a rate, ship the pace as provisional with its label, or not at all, and record which in `docs/DECISIONS.md`.
2. The pace in onboarding, in the plan breakdown and in the check-in's rate band.
3. Hybrid: two templates that mix strength and cardio, and analysis points for weeks with both (order, gap, cardio type on leg days), each from a checked source.
4. Progress: the training card from F20, built from the done and skipped marks that already exist.

Gate: engine vectors for the new pace. End to end tests: a lean user picks the faster pace and gets a plan inside the surplus cap; a hybrid template builds a week and shows its analysis points; Progress shows the training card on seeded data. `verify-ui` passes.
Owner checks: the friends who suggested these try them.

## O1 Onboarding redesign

The owner's rule: onboarding must be very engaging and easy, personalize the app, and take the least effort to finish. Research on how products and designers handle onboarding in 2026 (TikTok, Duolingo and others) is in `/Users/admin/destination/ontrack-design/onboarding/RESEARCH.md`, with references in `refs/`. The owner also wants the words, above all the main actions, chosen to maximise engagement and click-through; the wording research and proposed strings are in `COPY.md` beside it.

Read: that research, `docs/PRD.md` F2 and section 7, `docs/SCREENS.md` section 4, `docs/SCIENCE.md`, `docs/DESIGN.md`, `src/flows/onboarding/`.

1. Decide the flow from the research. Ask only what changes the plan or the app; default, infer or defer the rest, and state in `docs/DECISIONS.md` what each default or inference costs in accuracy, using SCIENCE.md. Rewrite `docs/SCREENS.md` section 4 before code.
2. Build it in the OneFin system, with motion from MOTION.md, auto-advance on single choices, the plan number building as the user answers, and a payoff moment that is honest (no fake loading).
3. Personalize from the answers: Today's first state, a suggested program, supplements set up (F21), the gain pace (F19), Thai foods (F14).
4. Words: apply `COPY.md` to every onboarding string, write its voice guide into `docs/DESIGN.md`, and go over every main action label in `src/lib/i18n/en.ts` app-wide with it. Wording stays within the catalog rules and the PRD's neutral language.
5. The guardrails in PRD section 7 stay intact: the adult check, and screening before any number is shown.

Gate: end to end tests for the new flow on each goal and for every guardrail exit. The measured taps and time for a typical user beat the current flow and meet the research targets; put both in the pull request. `verify-ui` passes.
Owner checks: hand the phone to someone who has never seen Ontrack and time them.

## L1 Landing page

Read: `docs/PRD.md` F18, `docs/DESIGN.md`, `docs/SCREENS.md` (Welcome), and in `/Users/admin/destination/ontrack-design/onefin/`: first `owner-picks/OWNER-PICKS.md` and its screenshots (the owner's curated style, including the landing-only patterns: tilted sticker eyebrows, condensed headlines, inline pills, floating icon tiles, dark sections with a violet glow, the footer), then `site/SITE-EXTRACT.md` (the "Landing sections" chapter) and `site/motion/MOTION.md` for layout and motion. Where they disagree, the picks win.

Build the landing page for signed-out visitors (no session and no onboarding draft) in the OneFin style, with scroll animations from MOTION.md. Its headline, sections and both buttons are worded for click-through using the voice guide in `docs/DESIGN.md` and the landing proposals in `/Users/admin/destination/ontrack-design/onboarding/COPY.md`. It replaces Welcome. "Get started" opens onboarding, "Sign in" opens the sign-in sheet. Phone frames show real screenshots of the app. No OneFin raster or video artwork ships; decoration is CSS or SVG. A lazy chunk, reduced motion respected, no install wording. Update `docs/SCREENS.md` and `docs/PRD.md`.

Gate: end to end tests: a new visitor sees the landing page, both buttons work, a returning user with a draft or a session skips it, reduced motion shows everything without animation. The initial JavaScript budget still holds. `verify-ui` passes at every size.
Owner checks: scroll it on the iPhone in Safari.
