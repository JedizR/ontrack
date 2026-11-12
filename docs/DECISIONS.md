# Decisions

Changes to a doc's decision, and choices made on the owner's behalf. Newest first, one line each: what, why.

## M6

- Gemini model `gemini-3.6-flash` with thinking at minimal, as the tech spec asks; set in `GEMINI_MODEL` on Vercel, in `.env.example` and as the `dev:live` default, never in code. Why: `gemini-3.8-flash`, the newest Flash, answered 503 or hung on every call during the evaluation and refuses minimal thinking. Calls go through `models.generateContent` with `responseJsonSchema` built from the zod schema. `VISION_PROVIDER=gemini` on Vercel.
- The ten photo evaluation used ten Wikimedia Commons photos (six Thai), the run's fallback for the owner's photos; results and the one prompt tuning in `docs/EVAL-NOTES.md`. Item names are put in sentence case in code, since the tuned prompt made the model write them in lower case.
- The provider returns the reply unvalidated and the handler checks it with zod; the provider interface has no `catalog` field, since the prompt module builds the catalog once.
- The handler takes its dependencies (token check, quota, provider) as an argument, so the mock backend answers `/api/analyze` with the same code. The mock picks a food fixture by a hash of the input; a description containing "not food" or "fail" picks those cases; tests name the fixture through `POST /__mock/vision`.
- The quota counts on the server's UTC day, not the phone's `localDate`. Why: a phone that sends other dates could multiply its quota and step around the global cap. The limit resets at 07:00 in Thailand.
- A model item with a blank name is dropped; a reply with no items left is not food. Why: a meal item needs a name.
- The photo estimate checks (900 kcal per 100 g, 25 percent from 4p + 4c + 9f) are in `constants.ts` as Ontrack assumptions. Known limit, from the spec's rule: alcohol is not in the macro energy, so a cocktail or soju missing from the food table is recomputed too low. Beer, wine and spirits are in the table.
- The photo notice shows inside the Add sheet the first time Photo is tapped; Continue opens the camera. Accepting it is remembered per device in prefs (`photoOk`).
- The Review sheet's photo is cropped to 4 by 3 at full width, so the items start above the fold. The Meal sheet shows the 320 px thumbnail the same way, a little soft.
- "Add by hand" keeps the photo and the Review sheet, empty, and opens Search to add items one by one. The daily limit shows only "Add by hand", since trying again cannot succeed.
- Error lines for a description: "We could not find food in that description", "Describing a meal needs a connection", "Could not analyse the description". A busy service has its own line; Gemini's own rate limit (429, the free tier's daily cap) answers as busy, without a retry. A photo that cannot be read as an image shows the general failure.
- "Cooked with oil?" adds vegetable oil from the food table (1 tsp is 4.5 g, 40 kcal; 1 tbsp is 14 g, 124 kcal) as its own item, described under the control rather than as an editable row. The item list then stops at 29 so the oil fits the 30 item limit.
- A logged photo meal: the thumbnail is stored before the meal so Today shows it at once; a thumbnail the phone cannot store does not stop the meal. Undo deletes the meal only. The model's reply is kept with the meal (`ai.raw`) unless it is over 8 KB.
- Thumbnails are stored in IndexedDB as bytes and a type, not as Blobs. Why: WebKit refuses Blobs in IndexedDB in private browsing, and so does Playwright's WebKit.
- The Review and Meal sheets share `ItemList.svelte`; the Review sheet's oil control sits between the items and Add an item, as SCREENS.md orders them.
- Toast titles keep to one line with an ellipsis (DESIGN.md section 7); a long meal name made "Added ..." wrap.
- `@google/genai` moved to `dependencies`, since a server function imports it.

## M5

- The week strip shows the seven days ending today, each with its own weekday letter, instead of Monday to Sunday. Why: F3 asks for any of the last 7 days; a calendar week reaches only today on a Monday. Same cells, letters, dots and today pill.
- The Add sheet shows Search and Quick add only. Photo and Describe join in M6. Why: no dead buttons; both need the vision pipeline.
- The Add sheet logs to the day on screen; on a past day a meal gets the current clock time on that day. Why: F11 says past days can be edited; the time is editable in the Meal sheet.
- Recent is the last five meals distinct by title and calories; Saved is most used first. Logging a photo meal again records it as `saved`, without a photo. Why: SCREENS.md section 7; no photo was taken.
- Quick add opens the keypad for calories at once; protein, carbs and fat each open the keypad too; the name is a text field. At most 10,000 kcal and 1,000 g a macro at a time, with a message. Why: F5 asks for the custom keypad; the caps catch typos before the record schema refuses them.
- The Meal sheet scales each item from what was logged: the stepper moves 10 g, the chips are half, same, one and a half and double of the logged amount, never compounding. Typed (Quick add) items have no grams, so only the chips scale them.
- Swipe left on a meal past 96 px slides it out and deletes it with an undo toast; a swipe that starts on a meal never changes tab. Why: the row owns its horizontal gesture, like other horizontal scrollers.
- The training row's menu is a 44 px ellipsis button opening a small sheet with "Skip today"; no long press. Why: a long press has no visible cue and fights scrolling. Done shows a check and Undo; Skipped says the day uses the rest target and offers Undo.
- Training day or rest day follows the program's sessions on that weekday; the target follows the plan's frozen exercise energy (TECH-SPEC section 3). Skipping every session that day gives the rest target (F8).
- "240 over" is eaten minus the target; "On track from" shows the band start rounded to the 10 kcal target step (2,337 shows as 2,340, as in the reference).
- The weigh-in sheet is the keypad itself, titled Weigh in, prefilled with the last weigh-in; a value outside 30 to 300 kg asks again with the reason. The prompt card on Today has a neutral Weigh in button. Why: F6, one sheet with the keypad; "quiet".
- A meal without a photo shows a neutral tile with the icon of how it was logged (search, hash for Quick add, bookmark for saved). A quick add's source label reads "Quick add". Why: DESIGN.md section 11; Database or Estimate would misstate typed numbers.
- A past day's header title is "Monday, Nov 9". Why: fits the header at the largest text on the SE.
- Food list: 512 foods from USDA SR Legacy (April 2018), drafted by Claude. Portion weights come from USDA's portion table where it has a sensible one, else a typical serving. Thai dishes are mostly absent from SR Legacy, so a few Thai words are aliases on the nearest plain food (khao for rice). Oat milk, pad thai, Thai milk tea, udon, dragon fruit and congee are not in SR Legacy and are left out. Why: TECH-SPEC section 9; Thai foods are estimates in v1.
- The build reads the archive from `data/usda/` and downloads it with `unzip` when missing. Search ignores case and accents.

## M4

- Which screen opens: no store on the phone shows onboarding; a signed in phone that has never pulled shows Today's first load state; signed in and pulled with no profile shows onboarding again, from Welcome, whose "I already have an account" then switches accounts. While the last user's store opens, the shell shows, never Welcome. Why: sync rule 5, pull before deciding whether to show onboarding.
- The draft lives in prefs under `ot-ui`, field `draft`, not `ontrack:prefs`. Why: `ot-ui` is the prefs key since M0.
- "Save my plan" marks the draft saved; it becomes records only once a signed in phone has pulled in this session (`sync.pulledNow`), never on an older pull, so a plan made since on another phone is not overwritten. A draft that meets an account with a profile is dropped without a message. Why: TECH-SPEC section 4; the account's plan is the one the person made before.
- Leaving setup (from the eating disorder advice or the age screen) clears the draft and returns to Welcome.
- Eating disorder advice: "Leave setup" is the main action; continuing gives a maintenance target only, as for the other two answers. Why: PRD section 7 advises against tracking and offers to exit; maintenance only is the safest way to continue.
- Age is the current year minus the birth year, so 2008 passes in 2026. Why: only the year is asked.
- Field limits: birth year from 110 years ago to this year, height 100 to 250 cm, weight 30 to 300 kg, body fat 5 to 60 percent (the engine's range). Why: wider than any adult, inside the database checks.
- The experience question is skipped only when the week typed in has no strength or circuit session. "I will set this up later" and programs still ask it; skipped means beginner. Why: experience changes the gain pace and cap.
- A typed week spreads its sessions from Monday (2: Mon Thu, 3: Mon Wed Fri, 4: Mon Tue Thu Fri, then consecutive). The session name is the type's label. Defaults: 3 days, strength, 60 minutes, moderate.
- A program picked in Templates stays when coming back to step 7, unless the controls are changed ("Using Upper lower 4 days" says so).
- Templates in M4 lists name, days a week and who it suits; the "who it suits" lines are in `en.ts` now. Muscle balance per template and the replace confirm wait for M7.
- The pace step, when the guardrails remove every loss pace (BMI under 18.5), offers one "Hold your weight" option with the reason. It also explains the faster pace starting at BMI 25 and the lean only pace for advanced lifters. Why: one line saying why for every missing option.
- The pace figures and the Your plan hero show a typical training day: the mean exercise energy of the days that have a session. With no sessions, or the same target every day, one number. Why: a program can have sessions of different lengths.
- The breakdown shows whole kcal; the rounding to the 10 kcal target lands on daily movement, itself an estimate. A lift to the floor is its own line. Why: the lines must sum exactly to the target.
- Each breakdown line shows its first source when closed and every citation, with Working assumption where it applies, when tapped, in place rather than in a sheet. Short names and citations live in `src/lib/data/sources.ts`. Why: The science screen is M9; one line of caption per row.
- Flags sit below Fine tune, in the spec's order; the doctor card (BMI under 16) sits at the top on `--attention-soft`. Why: rubric 14; the doctor card is health guidance and comes first.
- Onboarding's input messages (out of range, goal weight refused) use `--attention`, not `--danger`. Why: danger is never for weight.
- The check-in weekday is the weekday the plan started. Why: the first check-in falls two weeks later on the same day.
- Single choice questions move on as soon as an answer is tapped and still show Continue, for coming back to an answered step.
- The birth year keypad opens by itself on a first visit and a valid year moves on; height then weight open by themselves the same way. Why: fewer taps toward 90 seconds.
- The install guide shows on every visit in Safari on iPhone until onboarding is done, and is not remembered. Android and desktop skip it. Why: SCREENS.md section 3, "on every visit until done".
- The keypad sheet loads lazily in `App.svelte` with the sign in and account sheets, and onboarding is its own lazy chunk. Why: the first chunk stays small for the returning user.
- Buttons have a minimum height instead of a fixed one, and a full width label wraps to a second line at the largest text sizes instead of spilling. Why: on CI's Linux fonts "I already have an account" and "Continue in the browser" spilled at the SE's large text. Locally a wide font (Verdana) reproduces it.
- CI's job limit is 30 minutes, up from 20. Why: the onboarding walks in the stress matrix bring the end to end step to about 16 minutes on the runner.
- Intensity on step 7 is three chips, not a segmented control. Why: "Moderate" clipped at the largest text on the SE with CI's fonts, as the text size control did in M1.
- New components: `Switch` (ink when on, never lime) and `Wordmark` (the mark inline, the name as live text).
- Unit abbreviations and the hero captions ("kcal on training days") live under `after` in `en.ts`. Why: they continue a number and start in lower case.
- Goal weight is stored on the plan and only checked against BMI 18.5 (and the 30 kg field minimum), not against the goal's direction; a later height change that puts it under BMI 18.5 drops it. Why: PRD section 7 sets only that rule.
- The expected change on Your plan and the pace step is summed day by day in the chosen calorie mode, not taken from the engine's `effectiveRate`, which uses the even week. Why: in matched mode a floor can lift rest days only, which slows the change.
- End to end: `open(page)` now signs in to a seeded account that has finished onboarding (vector A), `openFresh` starts a first run, and `withPrefs` merges into `ot-ui` instead of replacing it. Why: there is no signed out shell any more.

## M3

- The Backend interface gains `auth.googleEnabled()`, read from Supabase's public auth settings. Why: the Google button is hidden while the project has no Google provider, instead of being a dead button.
- `onChange` passes the email with the user id. Why: the account sheet shows it without a second call.
- The pull loop (rule 3) lives in one helper, `pullPages`, used by both backends. Later pages start at the last timestamp seen, inclusive, and drop rows already seen. Why: a strict `>` can skip rows that share a timestamp across a page boundary.
- An empty string cursor means "pulled before, the server had nothing". Why: rule 5 needs to know a device has pulled once even when the account is empty.
- The device refuses data over 32 KB per record although the database allows 64 KB. Why: jsonb text spaces out JSON, so a record near 64 KB on the device could be refused by the server.
- A batch the server refuses as a whole is resent one record at a time, and a refused record is set aside (kept on the phone, out of the outbox, logged). Why: one bad record would otherwise block every later change.
- While sync is backing off, a local edit waits for the backoff instead of retrying at once. Why: rule 6.
- Client schemas use `zod/mini`. Why: the full zod build added about 20 KB gzip to the first chunk; mini has the same checks.
- The sign in and account sheets are lazy chunks, preloaded 800 ms after start like the tabs. Why: the drawer code doubled the first chunk.
- Sign out wipes the user's IndexedDB keys (`clear`) rather than deleting the database, then reloads. Why: the open connection blocks a delete until the page unloads.
- Sign out on Supabase is `scope: 'local'`; if the server cannot be told (offline), the session keys on this phone are removed anyway. Why: other phones stay signed in, and an offline sign out must still sign out.
- An expired access token that cannot be refreshed for lack of network is treated as offline, not as signed out; only a SIGNED_OUT event ends the session. Why: SCREENS.md section 12 says offline changes nothing else.
- A different account signing in on a phone that holds unsent changes for the last one is signed out again, and the expired card names the account to use. With nothing unsent, the last account's data is wiped first. Why: the unsent changes would otherwise be stranded in a store nobody opens.
- Deleting the account stops sync before the request. Why: a round in flight could recreate rows or a thumbnail after the server emptied them.
- The account rows (email, backup, sign out, delete) sit in an Account sheet opened from the avatar until Settings exists (M9). Signed out, the avatar opens sign in. Why: the avatar was inert and sign in needs a way in before Welcome (M4).
- Delete account is confirmed by typing the account's email. Why: a typed word would have to live in the catalog in lower case, and the email is unambiguous.
- The six code boxes are drawn over one hidden input with `autocomplete="one-time-code"`. Why: iOS fills the code from Mail and a paste lands whole; auto advance comes free.
- The code step also has a pinned "Sign in" button, though six digits submit on their own. Why: a sheet keeps its main action pinned (DESIGN.md section 7).
- Supabase cannot tell a wrong code from an expired one (both are `otp_expired`), so the sheet says "expired" when more than 10 minutes have passed since sending. Why: the two states in SCREENS.md section 5.
- The sign in sheet has no Privacy and Terms small print yet. Why: those pages arrive with Settings in M9; a link to nothing would be a dead link. M9 adds the line.
- The mock accepts the code 123456 (printed by the dev server) and its Google button signs in `google.user@example.com` through a real redirect. Its tokens name their space and epoch, so a restarted dev server keeps you signed in and `POST /__mock/expire` ends a space's sessions.
- `window.ontrack` (actions, store, sync) exists in dev builds only, so end to end tests can log data until the logging screens exist (M5).
- `pnpm dev:live` and `pnpm test:live` read the Supabase URL and keys from the Supabase CLI into the environment (`scripts/live-env.sh`). Why: no key is written to disk and `.env.local` is never touched.
- The live conformance run makes its test users with the secret key (an admin generated one time code, no email) and deletes them through the real `DELETE /api/account` handler, falling back to an admin sweep for users whose sessions it ended.
- Supabase auth settings pushed with `supabase config push`: site URL `https://ontrack-black.vercel.app`; redirects `http://localhost:5173/**`, the production URL and `https://ontrack-*-jedizrs-projects.vercel.app/**`; email codes 6 digits, 10 minutes, one send per 30 s. Other declared settings were set to the project's current values so nothing else changed.
- The email code template was not changed: Supabase refuses template edits on the free plan's built in mailer. See `docs/BLOCKERS.md`.
- `fake-indexeddb` 6.2.7 (dev only, the newest release over a week old). Why: the conformance suite runs the real store and engine as two devices.
- `Session` (the program session type) now comes from `shared/records.ts`; `templates.ts` imports it. Why: STATE.md asked for the move in M3.
- `dates.ts` waits for M5. Why: nothing in M3 converts dates.

## M2

Science check (verdicts in `docs/SOURCES.md`):

- Moderate walking is 3.8 MET, not 3.5 (code 17190); light and hard walking are codes 17152 and 17200. Why: the Compendium's level walking codes for slow, moderate and brisk pace.
- Sport stays 4.0, 6.0, 8.0 MET as a working assumption; its stated basis changed. Why: they are not band mid points and the Compendium has no general sport code.
- Low weekly volume is under 5 sets (was under 6); beginners are told 5 to 9 is a fine start. Why: S11's categories are under 5, 5 to 9 and 10 or more.
- The 20 set ceiling stays, labelled an assumption. Why: S11 found too little data above 12 sets to set a limit.
- Advanced lifters gaining are offered the lean pace only, and their surplus cap is 10 percent. Why: S7 gives about 0.25 percent a week and a 5 to 10 percent surplus for advanced lifters.
- 7,700 kcal per kg stays, labelled a working assumption. Why: S6 says it overstates the energy per kg for leaner people, but a body fat dependent model is out of scope; the caps bound the deficit and the check-in corrects from measured weight.
- Movement factors 1.20 to 1.60 stay, labelled a working assumption. Why: FAO/WHO/UNU's 1.40 to 2.40 includes exercise, which Ontrack adds per session; its sedentary office example is 1.53, so the seated start may be low and the check-in raises it.
- Floors 1,200, 1,500 and 1,350 stay, labelled a working assumption. Why: S14 gives low calorie diet ranges, not floors; these sit at or above its lower bounds and the PRD guardrail sets them.
- S2 cites Cunningham 1991 only. Why: it states 370 + 21.6 x FFM; no Katch and McArdle primary source was found.
- The certainty stance no longer says "within about 10 percent for most people". Why: S18 says Mifflin-St Jeor was the most reliable equation, not that equations are within 10 percent for most.
- The 4, 4, 9 kcal per gram factors got a source, S19 (FAO 2003). Why: macros use them and every number needs one.
- BMI 16 for the doctor card is verified through a WHO EMRO guide citing WHO TRS 854. Why: TRS 854 itself could not be opened.

Engine choices where the spec was silent or self contradictory:

- Protein reference weight is body weight capped at the weight for BMI 30, instead of switching to the weight at BMI 25 above BMI 30. Why: the switch drops protein by about a sixth at BMI 30 and breaks the gate's "protein never falls when weight rises"; vector C is unchanged.
- Aerobic minutes count cardio, walk and sport sessions at 3 METs or more, double at 6 or more, instead of "cardio, hard counts double". Why: S13 defines moderate and vigorous in METs and counts walking; moderate cardio (6.8) is vigorous by that definition.
- Circuit sessions count as strength sessions. Why: S13's muscle-strengthening activity includes resistance circuits.
- A session counts toward a muscle's frequency when the muscle is a primary target of one of its exercises. Why: section 11 does not say; direct work is the conservative reading.
- The `floor` flag is set when the plan's lowest possible day (a rest or skipped day) falls under the floor. Why: matched mode and skips make any day a rest day, and the plan record has no calorie mode.
- The effective rate uses the even target after floors. Why: the matched week averages to it unless a floor lifts only some days.
- "Protein and fat exceed the target" is tested against the lowest day target. Why: fat is the same every day.
- A plan never runs faster than the paces offered at its BMI; a lose goal under BMI 18.5 gets no deficit. Why: a check-in recomputes at a new weight and must keep the guardrails.
- Check-in mean target is over every day in the window, mean intake over complete days. Why: vector F's 2,357.14 is the plan's weekly mean, which 12 complete days cannot produce.
- Check-in, rate only: the target rate is the plan's effective rate, and the change moves the baseline before the plan is recomputed. The proposal is the even target's actual move rounded to 10, in both paths. Why: what the user accepts should equal the number shown.
- A check-in move over 200 shifts the baseline back so the even target moves 200. Why: section 10 clamps the move, not the baseline.
- A check-in keeps the plan's exercise energy per weekday and its resting energy, and uses the trend weight for everything else. Why: section 10 recomputes sections 6 to 8 only.
- Weigh-ins span 14 days counting the first and last day. Why: the spec does not say; inclusive matches "two weeks of weigh-ins".
- The engine takes day numbers, not date strings, for weigh-ins and check-in days. Why: `dates.ts` is the only place that touches `Date` and the engine imports nothing; M8 converts.
- Trend smoothing and the slope live in `engine/trend.ts`, not `model/trend.ts`. Why: the check-in needs the slope and the engine imports nothing outside itself.
- Unit conversions (7, 60, 100) live in `constants.ts` as `U`. Why: the gate's check is simplest as "no literal but 0 and 1 in engine files".
- Exercise, template and template session names are data in `src/lib/data/`, not catalog strings. Why: like food names, they become the user's data once a program exists. Each template's "who it suits" line is M7's, in `en.ts`.

## M1

- No Figma link and no images in `design/references/`, so `docs/DESIGN.md` and `design/` are used as they stand. Why: nothing to reconcile.
- Unselected dock tabs use `--ink-2`, not `--ink-3`; DESIGN.md section 7 now says so. Why: their labels are text and need 4.5 to 1 (section 12). Settles the M0 open item.
- The compact button and the chip are 44 high to tap, with the 36 high pill drawn inside. Why: section 7 asks for 36, the rubric for 44 px targets.
- Segmented options are 44 high, so the control is 52. Why: 44 px targets.
- The gallery picks the text size with chips, not a segmented control. Why: four options at the largest text clip in a segmented control on the SE.
- New tokens: `--scrim` behind an open sheet, and `--t-key` (24, scaling like Display) for keypad numerals. Why: section 7 asks for both and tokens.css had neither.
- Sheets are `--surface` with no shadow, over the scrim. They keep watermelon's 44 px close button beside the title. Why: section 4 puts sheets on surface; only the dock and toasts float; the button is a visible, named way to dismiss.
- Reference spacings off the 4 px grid (2, 6, 10, 14, 18) are rounded to the grid, in the composed Today and in the dock (plus button gap 12, icon to label 4). Why: rubric 6.
- The composed Today lists meals newest first, not in the reference's order. Why: SCREENS.md section 6 says newest first.
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
