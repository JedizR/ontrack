# Ontrack: build plan

Ten milestones and seven the owner added (D1, N1, N2, T1, O1, L1, S1), each built in its own fresh context: a session when the owner is present, a subagent in an unattended run. Each has a goal, what to read, the steps, a gate that proves it is done, and what the owner checks. Start and finish every milestone with the `milestone` skill. In an unattended run, owner checks are recorded in `docs/BLOCKERS.md` and never hold up the build.

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
| T1 | Gain pace and hybrid training | A faster gain pace, strength and cardio planned together, training on Progress | The friends who asked trying it |
| O1 | Onboarding redesign | Engaging, least effort onboarding that personalizes the app | Doing it cold, timed |
| L1 | Landing page | A page for signed-out visitors | Scrolling it on the iPhone |
| S1 | Friends, profiles and the food map | Friends, a profile with an optional program, shared meal photos on a map | A second account as a friend |
| M9 | Hardening and release | Settings, export, accessibility, speed, security, production | Full device check |

After M8 the order is N1, N2, T1, O1, L1, S1, then M9. It follows the owner's MoSCoW and RICE prioritization: N1, N2, T1 and L1 are Should, with N2 the highest RICE score of the features not yet built, (high value for little effort), S1 is Could, and M9 hardens everything last. O1 comes after N2 and T1 so onboarding can personalize with supplements, the faster pace and hybrid templates, and before L1 because the landing page leads into it.

Order: the look is settled before any screen is built (M1), and the logic is settled before any screen needs it (M2, M3). With the owner present, no screen work past M1 starts before he approves the gallery. In an unattended run a clean rubric pass stands in for that approval and the gallery goes on his review list.

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

The owner's rule: onboarding must be very engaging and easy, personalize the app, and take the least effort to finish. Research on how products and designers handle onboarding in 2026 (TikTok, Duolingo and others) is in `/Users/admin/destination/ontrack-design/onboarding/RESEARCH.md`, with references in `refs/`.

Read: that research, `docs/PRD.md` F2 and section 7, `docs/SCREENS.md` section 4, `docs/SCIENCE.md`, `docs/DESIGN.md`, `src/flows/onboarding/`.

1. Decide the flow from the research. Ask only what changes the plan or the app; default, infer or defer the rest, and state in `docs/DECISIONS.md` what each default or inference costs in accuracy, using SCIENCE.md. Rewrite `docs/SCREENS.md` section 4 before code.
2. Build it in the OneFin system, with motion from MOTION.md, auto-advance on single choices, the plan number building as the user answers, and a payoff moment that is honest (no fake loading).
3. Personalize from the answers: Today's first state, a suggested program, supplements set up (F21), the gain pace (F19), Thai foods (F14).
4. The guardrails in PRD section 7 stay intact: the adult check, and screening before any number is shown.

Gate: end to end tests for the new flow on each goal and for every guardrail exit. The measured taps and time for a typical user beat the current flow and meet the research targets; put both in the pull request. `verify-ui` passes.
Owner checks: hand the phone to someone who has never seen Ontrack and time them.

## L1 Landing page

Read: `docs/PRD.md` F18, `docs/DESIGN.md`, `docs/SCREENS.md` (Welcome), and in `/Users/admin/destination/ontrack-design/onefin/`: `site/SITE-EXTRACT.md` (the "Landing sections" chapter) and `site/motion/MOTION.md`.

Build the landing page for signed-out visitors (no session and no onboarding draft) in the OneFin style, with scroll animations from MOTION.md. It replaces Welcome. "Get started" opens onboarding, "Sign in" opens the sign-in sheet. Phone frames show real screenshots of the app. No OneFin raster or video artwork ships; decoration is CSS or SVG. A lazy chunk, reduced motion respected, no install wording. Update `docs/SCREENS.md` and `docs/PRD.md`.

Gate: end to end tests: a new visitor sees the landing page, both buttons work, a returning user with a draft or a session skips it, reduced motion shows everything without animation. The initial JavaScript budget still holds. `verify-ui` passes at every size.
Owner checks: scroll it on the iPhone in Safari.

## S1 Friends, profiles and the food map

Read: `docs/PRD.md` F16, F17 and section 7, `docs/TECH-SPEC.md` sections 3, 5, 6 and 8, `docs/SCREENS.md`.

1. Data: profiles with a unique handle, friendships (requested, accepted), shared meals (owner, photo path, rounded latitude and longitude, taken at, title, nutrition). Row level security: a shared row is readable by its owner and accepted friends only. Shared photos sit in a private bucket readable the same way. Removing a friendship, unsharing and deleting the account all take effect on the server. Supabase advisors clean.
2. The mock backend matches, and a visibility suite runs on both backends: a stranger cannot read, a friend can, a removed friend cannot.
3. Profile and friends screens: handle, display name, optional photo, search by handle, requests, remove, the program visibility switch.
4. "Share to map" in the photo review sheet, off by default. Location: the GPS data in the original file if present, read before the canvas strips it, otherwise one `getCurrentPosition` call after the user turns sharing on. Round to about 100 m on the device.
5. The map: MapLibre GL JS with OpenFreeMap tiles (free, no key; confirm the terms and show the attribution), in a lazy chunk. Photo pins with the person's avatar, grouping with "+N more", back and recenter controls, a bottom sheet with friend search, taking its layout cues from Instagram's map and its look from DESIGN.md. Tapping a pin shows the photo, title and nutrition. Offline shows a plain message.
6. Add one landing page section about friends and the map.

Gate: end to end tests on the mock with two users: request, accept, share, see the pin, open it, unshare, remove the friend. The visibility suite passes on live Supabase. The initial JavaScript budget still holds. `verify-ui` passes.
Owner checks: make a second account a friend, share three meals from different places, check what each account can see.

## M9 Hardening and release

1. Settings in full, exports, The science, Report a problem.
2. Privacy and Terms as plain language drafts in `public/`, marked for the owner's review.
3. Gain mode easy adds, the finish day control, and anything cut from earlier milestones and recorded in `docs/STATE.md`. Privacy and Terms cover sharing, location and friends.
4. Accessibility pass against `docs/DESIGN.md` section 12. The stress matrix over every screen.
5. Speed: bundle report against the budgets in the PRD, lazy chunks confirmed, start time measured with a year of seeded data.
6. Offline pass: every feature in airplane mode.
7. Security: advisors, a scan of the build output for secrets, quota tests, the account deletion test.
8. Production: environment variables and the production Gemini key in Vercel, the budget alert, the production smoke test, `README.md`, tag `v1.0.0`.

Gate: every bar in `docs/PRD.md` section 8 is measured and met, with the numbers in the pull request. All feature tests pass.
Owner checks, on the iPhone, installed: sign in, onboard, log by every method, weigh in, edit a program, go offline and log, come back online, switch theme and text size, export, sign out and back in on a second device if one is available.

## After v1

Thai language. Barcode scanning. Set by set logging. Push reminders. A dietitian's review of the guardrails and copy before any public launch.
