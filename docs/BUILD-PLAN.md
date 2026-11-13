# Ontrack: build plan

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
| M9 | Hardening and release | Settings, export, accessibility, speed, security, production | Full device check |

After M8 the order is N1, N2, B1, D2, N3, T1, O1, L1, S1, then M9. D2 comes straight after B1 so every later screen is built on the refined look. It follows the owner's MoSCoW and RICE prioritization: B1 is Must (the owner made barcode scanning a main feature); N1, N2, N3, T1 and L1 are Should, with N2 the highest RICE score of the features not yet built, (high value for little effort), S1 is Could, and M9 hardens everything last. O1 comes after N2 and T1 so onboarding can personalize with supplements, the faster pace and hybrid templates, and before L1 because the landing page leads into it.

After S1 the order is U1, then M9, in lanes (worktrees, `docs/WORKFLOW.md` section 1):

| Wave | Lanes, side by side | Why this order |
| --- | --- | --- |
| 1 | S1b, and U1a | Onboarding shares no screen with the social screens |
| 2 | U1b, and M9a | U1b changes the shared look; M9a's new Settings screens take it through the shared components |
| 3 | U1c | Motion and feel go over every screen once they all exist, Settings included |
| 4 | M9b | Hardening measures the app as it ships, then `v1.0.0` |

U1 comes before the release because the owner judged the UI about 70 percent and the UX about 30 percent done on the iPhone (13 November): too few good feelings. M9 is split because its features (M9a) and its hardening (M9b) are different work, and only M9b has to be last.

Order: the look is settled before any screen is built (M1), and the logic is settled before any screen needs it (M2, M3). With the owner present, no screen work past M1 starts before he approves the gallery. In an unattended run a clean rubric pass stands in for that approval and the gallery goes on his review list.

Shipped milestones (M0 to L1) have their sections in `docs/archive/BUILD-PLAN-SHIPPED.md`.

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

## U1 Feel and polish (the owner's iPhone pass, 13 November)

The owner used the deployed app in Safari on an iPhone, annotated ten screenshots, and asked for animation, micro-interactions and satisfaction throughout. The screenshots are in `/Users/admin/destination/ontrack-design/feedback/2026-11-13/`; the number after each step names one. Read the text first and open a screenshot only if a step is unclear. Three pull requests.

Read: `docs/DESIGN.md` sections 4 to 9 and its motion section, `docs/SCREENS.md` for each screen touched, `docs/DECISIONS.md` O1 and D2.

### U1a Onboarding feel (alongside S1b)

1. A choice never advances on its own. A tap selects it and enables Continue; Continue moves on. Every choice step, Goal and How fast included. The owner overrides O1's auto-advance: record it in `docs/DECISIONS.md`. (9, 10)
2. A selected choice is clear in both themes: its icon tile turns violet with a light glyph, and the card's selected fill or ring has 3:1 contrast against the page. (9)
3. Goal: a small underlined link under the three goals, "Not what you're looking for?", shows two more. Gain weight, for lean people who want to put on weight in a healthy way and keep their muscle. And one between Build muscle and Lose fat (lose fat while building muscle). Use the fewest new rules: Gain weight is the gain goal leading with the faster pace where `paceOptions` offers it; the in-between goal eats near maintenance with the cut's protein. A new number goes through `science-check` into `constants.ts`, words through the voice guide. (9)
4. Building your plan: after the last step, a short progress screen (about 2 seconds: three steps tick off, energy, training days and protein, then a success mark), then Your plan with its numbers counting up. Under reduced motion, Your plan shows at once. It names only work the app really does. (8)

Gate: end to end tests on the mock: a tap selects without leaving the step and enables Continue; each new goal makes the plan its engine vector expects; the progress screen leads to Your plan and is skipped under reduced motion. The new gesture counts against O1's (one more per choice step) in the pull request.
Owner checks: onboard cold on the iPhone, once per new goal.

### U1b The look, app wide (after S1b, alongside M9a)

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

### U1c Motion and feel, app wide (after U1b and M9a)

1. Motion tokens in `design/tokens.css` (durations beside the existing `--ease-*`), used by everything below. Reduced motion turns movement into a fade or nothing.
2. Every tap answers: a pressed state on buttons, rows and tiles; `haptic` where the platform allows, on select, log, delete and reaching a target.
3. Changing numbers move: Today's totals count and its bars fill when a meal is logged, edited or removed; Progress's figures count up on arrival.
4. Lists move: a new meal slides in, a deleted one collapses. Swipe to delete works like iOS Mail: the row slides over a full height red action clipped to its card, with no edges showing, a long swipe deletes, Undo stays. (7)
5. Waits show progress: the photo under a scanning effect with its steps in words while it is read; skeletons, never a blank screen, while something loads.
6. Satisfaction, never guilt: a target reached turns its bar green with a short check and pulse; the check-in reveals its result; a finished session ticks off.
7. A UX walk: count taps and time the eight main tasks (photo, scan, search, describe, quick add, a supplement, a weigh-in, a session done) and fix whatever makes one slower, unclear or silent. Counts in the pull request.

Gate: end to end tests that each animation reaches its end state and that reduced motion leaves none running; the start time and the initial JavaScript budget hold; short videos of the eight tasks (Playwright, light and dark) on `pr-assets` under `u1/` for the owner.
Owner checks: use it for a day on the iPhone. Does it feel good?

## M9 Hardening and release

Two pull requests: M9a during wave 2, M9b last.

### M9a Settings and the last features (alongside U1b)

1. Settings in full, exports, The science (with the food table credits: INMU's Thai FCD, SG FoodID, USDA, Open Food Facts), Report a problem.
2. Privacy and Terms as plain language drafts in `public/`, marked for the owner's review, covering sharing, location, friends and barcode lookups; the line on the sign in sheet.
3. Gain mode easy adds (127 foods carry `dense`), the finish day control, in-app reminders (F23, no push).
4. Carried from earlier milestones (details under each in `docs/STATE.md`, `docs/archive/STATE-NOTES.md` and `docs/BLOCKERS.md`): Settings' "Thai dishes first", stepping down from the faster pace, the check-in day (keeping `checkinDueOn` the one rule), experience asked in context on Train, an exact birth year; deleting a meal's thumbnail with the meal (and on Undo's expiry) and a replaced profile photo; a supplement entry's time editable in the amount step; "Use default values" for products; the label reader leaving a nutrient it cannot see empty instead of 0; the "onboarding failed to load" console error in the smoke run.

Gate: end to end tests for each setting, export, the reminders and easy adds on the mock; conformance green on both backends.

### M9b Hardening and release (last)

1. Accessibility pass against `docs/DESIGN.md` section 12. The stress matrix over every screen.
2. Speed: bundle report against the budgets in the PRD, lazy chunks confirmed, start time measured with a year of seeded data.
3. Offline pass: every feature in airplane mode.
4. Security: advisors, a scan of the build output for secrets, quota tests, the account deletion test.
5. Production: environment variables and the production Gemini key in Vercel, the budget alert, the production smoke test, the N1 Thai photo rerun that the free key could not finish (`docs/EVAL-NOTES.md`), `README.md`, tag `v1.0.0`.

Gate: every bar in `docs/PRD.md` section 8 is measured and met, with the numbers in the pull request. All feature tests pass.
Owner checks, on the iPhone, installed: sign in, onboard, log by every method, weigh in, edit a program, go offline and log, come back online, switch theme and text size, export, sign out and back in on a second device if one is available.

## After v1

Set by set logging. Not planned: a Thai language interface (English only, for the class), push notifications (not possible from an iPhone browser tab without install), and a dietitian's review (Ontrack is a class proof of concept and is not launched publicly; accuracy comes from checked sources).
