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


---

# Moved 22 November 2026: the plan from the milestone table to M9 (everything shipped by v1.6.0)

The whole of `docs/BUILD-PLAN.md` as it stood before it became the backlog. Rounds after v1.6.0 (L5, R1 to R4b) had no plan sections; see `docs/DECISIONS.md` and `docs/archive/R2-PLAN.md`.

## Ontrack: build plan

Ten milestones and eleven the owner added (D1, N1, N2, B1, D2, N3, T1, O1, L1, S1, U1), each built in its own fresh context: a session when the owner is present, a subagent in an unattended run. Each has a goal, what to read, the steps, a gate that proves it is done, and what the owner checks. Start and finish every milestone with the `milestone` skill. In an unattended run, owner checks are recorded in `docs/BLOCKERS.md` and never hold up the build.

| | Milestone | Outcome | Owner is needed for |
| --- | --- | --- | --- |
| M0 | Foundations | An empty, installable shell deployed with CI green | CLI logins |
| M1 | Design system | Tokens, components and a gallery that looks like Ontrack | Approving the look on the iPhone |
| M2 | Engine | The science engine with checked sources | Nothing |
| M3 | Data, sync, sign-in | Local store, sync on both backends, Google and email code | Google client setup, sign-in test on the iPhone |
| M4 | Onboarding and plan | First run through to a saved plan | A walkthrough |
| M5 | Today and logging | Today, search, quick add, saved meals, weigh-ins | Using it for a day |
| M6 | Photo logging | Camera to reviewed meal | A Gemini key, ten real meals |
| M7 | Training | Program, analysis, training day targets | Entering a real program |
| M8 | Progress and check-ins | Trends and the weekly correction | A review with seeded data |
| N1 | Thai foods and remembered nutrition | Thai dishes from a published table, corrections remembered | Logging five usual Thai meals |
| N2 | Supplements | Whey, creatine and the like logged by scoop in three taps | Logging the morning shake for a few days |
| B1 | Barcode scanning | Scan a packaged food and log it exactly | Scanning ten packaged foods |
| D2 | Visual refinement | Clean flat actions, glass and gradients only where they help | The new look on the iPhone |
| N3 | Thai nutrition from Thai sources | Thai dishes with numbers from Thai pages and the owner's finds | Sending Thai nutrient facts they find |
| T1 | Gain pace and hybrid training | A faster gain pace, strength and cardio planned together, training on Progress | The friends who asked trying it |
| O1 | Onboarding redesign | Engaging, least effort onboarding that personalizes the app | Doing it cold, timed |
| L1 | Landing page | A page for signed-out visitors | Scrolling it on the iPhone |
| S1 | Friends, profiles and the food map | Friends, a profile with an optional program, shared meal photos on a map | A second account as a friend |
| U1 | Feel and polish | The owner's iPhone pass fixed, and motion, feedback and satisfaction app wide | Using it for a day on the iPhone |
| L2 | Landing glass and photo gradients | Liquid glass throughout the landing page, gradients made from photos, a real iPhone 16 frame | Looking at it on desktop and on the iPhone |
| L3 | Landing glass that bends, and Safari's top bar | Glass that blurs more and warps at its edges, no white bar above the page, an ink Sign in | Looking at it on the iPhone |
| P1 | Palette and photo gradients | The owner's wider palette, and every gradient remade from it | Seeing them on the iPhone |
| L4 | Landing rework | Safari's bars left alone, a calm new footer, real liquid glass, a phone-width nav, playful scroll animation, speed | The landing on the iPhone and desktop |
| U2 | App polish: corners, transitions, update prompt, speed | Every radius nested, in-page changes that animate, an update prompt that goes away, a faster app | A day of use on the iPhone |
| U3 | Text hierarchy and cards (Mobbin research) | App text hierarchy and card design from research on Airbnb and Shop, run in a separate session | The app on the iPhone |
| M9 | Hardening and release | Settings, export, accessibility, speed, security, production | Full device check |

After M8 the order is N1, N2, B1, D2, N3, T1, O1, L1, S1, then M9. D2 comes straight after B1 so every later screen is built on the refined look. It follows the owner's MoSCoW and RICE prioritization: B1 is Must (the owner made barcode scanning a main feature); N1, N2, N3, T1 and L1 are Should, with N2 the highest RICE score of the features not yet built, (high value for little effort), S1 is Could, and M9 hardens everything last. O1 comes after N2 and T1 so onboarding can personalize with supplements, the faster pace and hybrid templates, and before L1 because the landing page leads into it.

After S1 the order is U1, then M9, in lanes (worktrees, `docs/WORKFLOW.md` section 1):

| Wave | Lanes, side by side | Why this order |
| --- | --- | --- |
| 1 | S1b, and U1a | Onboarding shares no screen with the social screens |
| 2 | U1b, and M9a | U1b changes the shared look; M9a's new Settings screens take it through the shared components |
| 3 | U1c | Motion and feel go over every screen once they all exist, Settings included |
| 4 | M9b, and L2 | Hardening measures the app as it ships, then `v1.0.0`; L2 (the owner's desktop pass) touches only the landing page, and M9b re-measures after it merges |

U1 comes before the release because the owner judged the UI about 70 percent and the UX about 30 percent done on the iPhone (13 November): too few good feelings. M9 is split because its features (M9a) and its hardening (M9b) are different work, and only M9b has to be last.

Order: the look is settled before any screen is built (M1), and the logic is settled before any screen needs it (M2, M3). With the owner present, no screen work past M1 starts before he approves the gallery. In an unattended run a clean rubric pass stands in for that approval and the gallery goes on his review list.

Shipped milestones (M0 to L1) have their sections in `docs/archive/BUILD-PLAN-SHIPPED.md`.

### S1 Friends, profiles and the food map

Read: `docs/PRD.md` F16, F17 and section 7, `docs/TECH-SPEC.md` sections 3, 5, 6 and 8, `docs/SCREENS.md`.

1. Data: profiles with a unique handle, friendships (requested, accepted), shared meals (owner, photo path, rounded latitude and longitude, taken at, title, nutrition). Row level security: a shared row is readable by its owner and accepted friends only. Shared photos sit in a private bucket readable the same way. Removing a friendship, unsharing and deleting the account all take effect on the server. Supabase advisors clean.
2. The mock backend matches, and a visibility suite runs on both backends: a stranger cannot read, a friend can, a removed friend cannot.
3. Profile and friends screens: handle, display name, optional photo, search by handle, requests, remove, the program visibility switch.
4. "Share to map" in the photo review sheet, off by default. Location: the GPS data in the original file if present, read before the canvas strips it, otherwise one `getCurrentPosition` call after the user turns sharing on. Round to about 100 m on the device.
5. The map: MapLibre GL JS with OpenFreeMap tiles (free, no key; confirm the terms and show the attribution), in a lazy chunk. Photo pins with the person's avatar, grouping with "+N more", back and recenter controls, a bottom sheet with friend search, taking its layout cues from Instagram's map and its look from DESIGN.md. Tapping a pin shows the photo, title and nutrition. Offline shows a plain message.
6. Add one landing page section about friends and the map.

Gate: end to end tests on the mock with two users: request, accept, share, see the pin, open it, unshare, remove the friend. The visibility suite passes on live Supabase. The initial JavaScript budget still holds. `verify-ui` passes.
Owner checks: make a second account a friend, share three meals from different places, check what each account can see.

### U1 Feel and polish (the owner's iPhone pass, 13 November)

The owner used the deployed app in Safari on an iPhone, annotated ten screenshots, and asked for animation, micro-interactions and satisfaction throughout. The screenshots are in `/Users/admin/destination/ontrack-design/feedback/2026-11-13/`; the number after each step names one. Read the text first and open a screenshot only if a step is unclear. Three pull requests.

Read: `docs/DESIGN.md` sections 4 to 9 and its motion section, `docs/SCREENS.md` for each screen touched, `docs/DECISIONS.md` O1 and D2.

#### U1a Onboarding feel (alongside S1b)

1. A choice never advances on its own. A tap selects it and enables Continue; Continue moves on. Every choice step, Goal and How fast included. The owner overrides O1's auto-advance: record it in `docs/DECISIONS.md`. (9, 10)
2. A selected choice is clear in both themes: its icon tile turns violet with a light glyph, and the card's selected fill or ring has 3:1 contrast against the page. (9)
3. Goal: a small underlined link under the three goals, "Not what you're looking for?", shows two more. Gain weight, for lean people who want to put on weight in a healthy way and keep their muscle. And one between Build muscle and Lose fat (lose fat while building muscle). Use the fewest new rules: Gain weight is the gain goal leading with the faster pace where `paceOptions` offers it; the in-between goal eats near maintenance with the cut's protein. A new number goes through `science-check` into `constants.ts`, words through the voice guide. (9)
4. Building your plan: after the last step, a short progress screen (about 2 seconds: three steps tick off, energy, training days and protein, then a success mark), then Your plan with its numbers counting up. Under reduced motion, Your plan shows at once. It names only work the app really does. (8)

Gate: end to end tests on the mock: a tap selects without leaving the step and enables Continue; each new goal makes the plan its engine vector expects; the progress screen leads to Your plan and is skipped under reduced motion. The new gesture counts against O1's (one more per choice step) in the pull request.
Owner checks: onboard cold on the iPhone, once per new goal.

#### U1b The look, app wide (after S1b, alongside M9a)

1. Corners nest: an inner radius is the outer radius minus the gap between them, and padding grows with the radius so text never sits in the curve. Keep the large outer radius the owner likes and raise the padding to match. Write the pairs in `docs/DESIGN.md` and apply them to Today's hero and stat tiles, Your plan, Progress's cards, list cards and sheets. (2, 5, 8)
2. Dark theme contrast: the page, cards, the selected day in the week, "Back to today", the dock and its edge stand apart. Controls and selected states need 3:1 against what is next to them (WCAG 1.4.11); a unit test checks the token pairs in both themes. (3)
3. The dock's active tab: a grey pill behind it, its icon and label in violet. (3, 7)
4. Content scrolling under a sticky header or a sheet header fades out (a short blur or gradient into the page or sheet colour) instead of meeting a hard edge. (2, 6)
5. A line with two facts (a meal's time and its source, and the like) separates them with a designed divider, never a comma or a middle dot; the second fact one step lighter. (2)
6. The status bar area continues the colour at the top of the screen: the hero on the landing page and onboarding, the page elsewhere (`theme-color` and the top safe area). (1)
7. The Add sheet's Photo card takes the sheet's one gradient, as its featured method. The button sweep test allows that one featured card, changed in its own commit. (4)
8. The look items carried from earlier milestones: calorie numbers in rows without "kcal" (Search, Add's supplement rows, Review, History); the Session sheet's heading and intensity control (SCREENS.md asks for a segmented control); "Continue with Google" at `lg` in content; Today's training card caption wrapping on the SE; the Add sheet's Recent and Saved rows without a leading tile; Your plan's protein in Display where section 7 asks for Body 600.
9. Rubric items for 1 to 6 in `docs/DESIGN.md` section 9, so the design critic checks them from now on.

Gate: the token contrast test; the stress matrix green; the button sweep green; one design critic round over every screen with the new rubric items, all fixed.
Owner checks: the same screens on the iPhone, light and dark.

#### U1c Motion and feel, app wide (after U1b and M9a)

1. Motion tokens in `design/tokens.css` (durations beside the existing `--ease-*`), used by everything below. Reduced motion turns movement into a fade or nothing.
2. Every tap answers: a pressed state on buttons, rows and tiles; `haptic` where the platform allows, on select, log, delete and reaching a target.
3. Changing numbers move: Today's totals count and its bars fill when a meal is logged, edited or removed; Progress's figures count up on arrival.
4. Lists move: a new meal slides in, a deleted one collapses. Swipe to delete works like iOS Mail: the row slides over a full height red action clipped to its card, with no edges showing, a long swipe deletes, Undo stays. (7)
5. Waits show progress: the photo under a scanning effect with its steps in words while it is read; skeletons, never a blank screen, while something loads.
6. Satisfaction, never guilt: a target reached turns its bar green with a short check and pulse; the check-in reveals its result; a finished session ticks off.
7. A UX walk: count taps and time the eight main tasks (photo, scan, search, describe, quick add, a supplement, a weigh-in, a session done) and fix whatever makes one slower, unclear or silent. Counts in the pull request.

Gate: end to end tests that each animation reaches its end state and that reduced motion leaves none running; the start time and the initial JavaScript budget hold; short videos of the eight tasks (Playwright, light and dark) on `pr-assets` under `u1/` for the owner.
Owner checks: use it for a day on the iPhone. Does it feel good?

### L2 Landing glass and photo gradients (the owner's desktop pass, 13 November)

The owner liked the landing page on desktop but saw too little glass and a plain gradient. References in `/Users/admin/destination/ontrack-design/feedback/2026-11-13-landing/`: `landing-01.png` (the page now), `glass-01` to `glass-05` (OneFin's glass mixed with solid elements: the footer's glass panels over a glow, glass cards and chips around a ring, the invoice's frosted chips over a gradient header, a glass chip on a photo, glass percentage chips on a donut), `photogradient-ui.png` (the tool's controls: gradient type, warp shape, warp, warp size, noise, colours), `pad-krapao-fried-eggs.avif` (the meal photo to use).

1. Gradients made from photos, not CSS ramps: make the hero and section backgrounds with https://photogradient.com/ (from a photo, or colours set by hand from the brand palette; warp, positions and a little grain), exported as images. If the site cannot be driven, generate the same kind of warped mesh gradient with grain with a script in `scripts/`. Keep assets small (WebP; the grain as a tiny tiling overlay if that is lighter).
2. Glass throughout, mixed with solid elements as in the references: the nav, floating chips, feature cards over the gradients, the footer's panels. The material follows the "iOS 26 Liquid Glass (Community)" file in Figma (through the Figma MCP): blur, light edge, specular rim, tint. A solid fallback without `backdrop-filter`; text on glass keeps 4.5:1.
3. The phone: frame the app with the iPhone 16 from "iPhone 16 and 16 Plus Mockups (Community)" in Figma, top part only, with its status bar and Dynamic Island, so the app no longer touches the top of the phone.
4. The meal photo in every mockup is the owner's pad kra pao with fried eggs.

If the Figma MCP cannot open a community file without its link, record "Needs your action: the two Figma links" and build from the published dimensions meanwhile.

Gate: `landing.spec.ts` and reduced motion green; initial JavaScript unchanged (the landing is lazy); the landing chunk and its images within a budget stated in the pull request; screenshots at 1440 desktop and 390 phone, light and dark; one critic round against the references.
Owner checks: the landing on desktop and on the iPhone.

### L3 Landing glass that bends, and Safari's top bar (the owner's iPhone pass, 13 November, after L2)

References: `safari-top-white-bar.jpg` in `/Users/admin/destination/ontrack-design/feedback/2026-11-13-landing/`, and L2's pull request screenshots.

1. The landing's top "Sign in" is the ink pill: black with white words (white with ink in dark).
2. No white bar above the page in Safari on iOS: the status bar area shows the colour at the top of the screen (the hero's sky on the landing, the page elsewhere). Safari 26 ignores `theme-color` and samples the page's own background and what sits at the top, so the page background and the hero extend under the top safe area (`viewport-fit=cover` is set), while the nav keeps its place below the status bar (`env(safe-area-inset-top)`).
3. Liquid glass that is liquid: more blur, and what is behind warps a little at the glass's edges, as in iOS 26. Safari draws no SVG displacement inside `backdrop-filter`, so over the landing's fixed images (the gradients) draw the bend with a lens layer (the same image, scaled and blurred, aligned to the background and masked to the rim); where the browser supports displacement, use it; elsewhere the stronger blur and rim. Keep it light on the GPU (CI's WebKit has none).

4. The footer, in two states (`footer-currently.png`, `new-footer-unextended.png`). The page ends on the teaser: after the last call to action and "Already have an account? Sign in", the top of the giant wordmark with its glow and the back-to-top button cut by the bottom of the screen. Scrolling on past the bottom meets a sticky resistance (the teaser follows the pull at a fraction); past a threshold it gives way and the extended footer opens; let go earlier and it springs back. Once the extended part has left the screen upwards it closes again, so it has to be pulled open again. The extended footer is redesigned to look professional, as OneFin's footer (glass-01): the wordmark behind, nested glass panels with link columns (start, learn, good to know, contact and legal) and a bottom bar. A button opens it too, for keyboards and screen readers; reduced motion opens it without the pull.

Gate: `landing.spec.ts`, reduced motion and the stress matrix green; the press check covers the landing; the footer's pull, spring back, open, close on leaving and the button in end to end tests; screenshots at 390 and 1440, light and dark, against L2's; one critic round.
Owner checks: the landing in Safari on the iPhone: the top bar, the glass bending at its edges, pulling the footer open.

### Round 3: the owner's review of L2 and L3 (13 November, evening)

The owner judged most of the L2 and L3 round not good. Screenshots in `/Users/admin/destination/ontrack-design/feedback/2026-11-13-round3/` (numbered below). Quality comes first this round: low quality work costs more tokens in rework than it saves. Lanes: P1 first and fast, then L4 and U2 side by side; U3 runs in another session from `docs/briefs/U3-text-and-cards.md`.

#### P1 Palette and photo gradients (first, small)

1. Brand colours stay `#381ac9` and `#bebeff`. Add every colour in screenshot 07 as an occasional palette: `#EDDECC`, `#6C9BBB`, `#FFFFFF`, `#F89183`, `#E46D58`, `#F9BBA1`, `#A7BEDB`, `#A69EB4`. Tokens in `design/tokens.css` with names and a rule in DESIGN.md for when each may be used (never for actions; contrast checked).
2. Remake every gradient, app and landing, in the manner of screenshot 08: photogradient.com with Gradient "Sharp Bézier", Warp Shape "Worley Noise", Warp about 25 percent, Warp Size about 35 percent, Noise about 60 percent, eight colour points. Each gradient unique (different colours chosen from the palette and different positions), all from the same settings. Through Yab (`yab exec`), settings and colours recorded in `scripts/gradients.sh`. Dark theme variants deeper but from the same palette. The grain comes from the export, not a separate overlay, unless that is lighter.
3. Text on every gradient keeps its contrast (`contrast.test.ts` and the landing's check).

Gate: verify; screenshots of every gradient in place, light and dark; one critic round.

#### L4 Landing rework (after P1, alongside U2)

1. Safari's bars: no tint, band or fade at the top or the bottom (screenshots 02 to 05; before L3 the bottom was fine). Read WebKit's own notes on how Safari 26 colours its bars (fixed elements at the edges, the page background, `theme-color` ignored) and cite them in DECISIONS. If no colour can be made to disappear, roll L3's change back to the state before it.
2. The footer: roll back to a normal footer, no pull to open. Redesign it to fit the landing's mood, with some creativity and professional restraint: not OneFin's footer, not the current violet panels.
3. Liquid glass (screenshot 06): no frosted layer behind text where the text already reads; the nav bar gets the liquid glass too; on desktop the nav is no wider than a phone (about 430 px), centred. Study https://github.com/callstack/liquid-glass (clone it, read its effect styles, tint, interactive highlight and the container that merges nearby glass) and make our own web version of those behaviours; record what was taken in DECISIONS.
4. Scroll animation, maximised: playful, asymmetric, like the "02 Training" card; looping ambient motion; micro-interactions on every control. Reduced motion respected.
5. Speed: measure the landing (largest paint, total weight, images, fonts, layout shift, scroll smoothness with the glass) before and after, and fix what costs most.

Gate: landing tests, reduced motion, stress; before and after numbers in the PR; screenshots at 390 and 1440, light and dark; two critic rounds; videos of the scroll for the owner.

#### U2 App polish (after P1, alongside L4)

1. Every corner radius nested (screenshot 01: the dock's active pill against the dock); audit every element with a check that measures it.
2. Changes on the same page animate, minimal and pleasant: content swaps, toggles, segmented controls, expanding rows, values changing, items appearing. Reduced motion respected.
3. "A new version is ready": after Update it must not come back on reload. Find why the waiting service worker does not take over, fix it, test it.
4. Speed: measure the app (start, interaction, bundle) and fix what costs most.

Gate: verify, stress, motion tests, the update flow tested; before and after numbers; one critic round.

#### U3 Text hierarchy and cards (separate session)

Run by the owner in another session: `docs/briefs/U3-text-and-cards.md`. Research on Mobbin (Airbnb, Shop), then the app's text hierarchy and card design.

### M9 Hardening and release

Two pull requests: M9a during wave 2, M9b last.

#### M9a Settings and the last features (alongside U1b)

1. Settings in full, exports, The science (with the food table credits: INMU's Thai FCD, SG FoodID, USDA, Open Food Facts), Report a problem.
2. Privacy and Terms as plain language drafts in `public/`, marked for the owner's review, covering sharing, location, friends and barcode lookups; the line on the sign in sheet.
3. Gain mode easy adds (127 foods carry `dense`), the finish day control, in-app reminders (F23, no push).
4. Carried from earlier milestones (details under each in `docs/STATE.md`, `docs/archive/STATE-NOTES.md` and `docs/BLOCKERS.md`): Settings' "Thai dishes first", stepping down from the faster pace, the check-in day (keeping `checkinDueOn` the one rule), experience asked in context on Train, an exact birth year; deleting a meal's thumbnail with the meal (and on Undo's expiry) and a replaced profile photo; a supplement entry's time editable in the amount step; "Use default values" for products; the label reader leaving a nutrient it cannot see empty instead of 0; the "onboarding failed to load" console error in the smoke run.

Gate: end to end tests for each setting, export, the reminders and easy adds on the mock; conformance green on both backends.

#### M9b Hardening and release (last)

1. Accessibility pass against `docs/DESIGN.md` section 12. The stress matrix over every screen.
2. Speed: bundle report against the budgets in the PRD, lazy chunks confirmed, start time measured with a year of seeded data.
3. Offline pass: every feature in airplane mode.
4. Security: advisors, a scan of the build output for secrets, quota tests, the account deletion test.
5. Production: environment variables and the production Gemini key in Vercel, the budget alert, the production smoke test, the N1 Thai photo rerun that the free key could not finish (`docs/EVAL-NOTES.md`), `README.md`, tag `v1.0.0`.

Gate: every bar in `docs/PRD.md` section 8 is measured and met, with the numbers in the pull request. All feature tests pass.
Owner checks, on the iPhone, installed: sign in, onboard, log by every method, weigh in, edit a program, go offline and log, come back online, switch theme and text size, export, sign out and back in on a second device if one is available.

### After v1

Set by set logging. Not planned: a Thai language interface (English only, for the class), push notifications (not possible from an iPhone browser tab without install), and a dietitian's review (Ontrack is a class proof of concept and is not launched publicly; accuracy comes from checked sources).
