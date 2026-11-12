# For the owner

Everything that needs you, in one place. Newest first within each section.

## Needs your action

Each entry: what is blocked, what Claude tried, the exact steps for you, and what to tell Claude afterwards.

None open. Resolved items are at the end of this file.

## Needs your eyes

Each entry: what to look at (URL or screenshot paths), what to look for, and which milestone it belongs to.

### D1: your OneFin template licence

- **Question:** does your licence for the OneFin template (N!nh Studio, single use) cover reusing its artwork in Ontrack: the 3D coins and stars, the phone mockups, the app screen images and videos?
- **Until you say so, none of it ships.** D1 adopted the identity only (colour, type, components, effects, motion); every decoration in the app is drawn in CSS or SVG, and OneFin's logo and wordmark are not used. The artwork is in `/Users/admin/destination/ontrack-design/onefin/framer/assets/` and `onefin/site/assets/` for reference.
- **Then tell Claude:** "The licence covers the OneFin artwork" (L1's landing page could use it), or "Keep it out".

### D1: the new look and the wheels on your iPhone, in Safari

- **Where:** the pull request's Vercel preview in Safari on the iPhone (not added to the home screen), `/` for the app and `/gallery` for every component; or `pnpm dev` on the Mac against the mock (code 123456). Screenshots: branch `pr-assets`, folder `d1/` (before, after and the OneFin reference for Today, an onboarding wheel step, Add and Search, Review, Weigh in and Train), and after `pnpm screenshots` every screen in `screenshots/` (light and dark at 390 by 664, the SE at 375 by 548 and the Pro Max at 430 by 739; `screenshots/xl/` for the largest text).
- **Look for, by thumb:** the wheels. Birth year (step 4), height and weight side by side (step 5), Weigh in from Today's card, and Your plan's Body fat and Goal weight. Flick a column: does it glide and land on a row, and is the value right after it settles? Tap a row above or below the band: it should come to the band. Tap the row on the band: a field opens with the number pad; type and press Done. Steppers (grams in Search and Review, minutes and sets in Train): tap the number and type 125. Quick add: does the number pad come up for calories when the sheet opens?
- **Look for, by eye:** the violet 3D buttons and their press, the condensed capital titles, the lavender hero, the dock's glass and the sheet's blurred backdrop (the test browser draws no blur), fonts that load without a flash on a second visit, and both themes. With Safari's toolbars showing and collapsed: is Continue on screen at first paint in onboarding, does the dock clear Safari's bar, and do sheets sit above it? On an SE, if you have one: check that nothing is cut off; the tests assume Safari gives it 375 by 548.
- **Decide:** Welcome's drawn decoration (the track on a tilted glass tile and an "On track" chip), and the green fill being 1.8 to 1 on white (the words carry the state; a darker green would pass but is less OneFin).
- **Decided for you:** the D1 list in `docs/DECISIONS.md`, notably the 16 px gutter, radius 20 on the large button rather than a capsule, darker green for "On track" words, one field for typing a whole wheel value, and Lucide icons kept.

### M7: your real program on your iPhone

- **Where:** the pull request's Vercel preview or, once merged, `https://ontrack-black.vercel.app`, installed; or `pnpm dev` on the Mac against the mock (code 123456). Screenshots: `screenshots/train/` after `pnpm screenshots -- --grep train` (no exercises, the Session sheet with an exercise open, the picker, recommendations with a source, Templates and the confirm, a template's analysis, no program; light and dark, 390, SE and Pro Max), and `screenshots/stress/*/training/` and `screenshots/fonts/*-xl/training/` for every device and the largest text. A few are on branch `pr-assets`, folder `m7/`.
- **Enter your real program:** Train, then each day: tap Rest to add a session, or a session to edit it. Name, day, type, minutes, intensity, then Add exercise for each lift with its sets and reps. Or start from Change program and edit the template.
- **Look for:** are the recommendations right for you? Each names a muscle or the week and says what to add or remove; "Why" shows the study. Does the muscle balance match how you think about your split (a set counts 1 for each main muscle and 0.5 for each helper)? Does "Adds N kcal a day on average" look plausible? Drag a session by its handle (the six dots) to another day: on the phone only, the feel of the drag, and whether you can reach Sunday from Monday on a small screen without the list scrolling (the Day chips in the Session sheet do the same job). After any change Today keeps today's target, and tomorrow follows the new program.
- **Decide:** the Session sheet saves with a Save button instead of saving every tap; intensity is three chips (as in onboarding) instead of a segmented control.
- **Decided for you:** the M7 list in `docs/DECISIONS.md`, notably plans keeping the week's sessions so past days never change, the week as one row per session with a weekday tile, templates as sections in the sheet, and a new exercise starting at 3 sets of 8 to 12.

### M6: photo logging on your iPhone

- **Where:** the pull request's Vercel preview once sign in works there (Gemini is set up: `gemini-3.6-flash` with the development key); or `pnpm dev:live` on the Mac, which uses the key in `~/.config/ontrack/gemini-api-key`; or `pnpm dev` against the mock (code 123456), where every photo is answered by fixtures. Screenshots: `screenshots/photo/` after `pnpm screenshots -- --grep photo` (the first photo notice, the review loading and loaded, the oil control, Today with the thumbnail, the Meal sheet, not food, the daily limit, Describe; light and dark, 390, SE and Pro Max), `screenshots/today/add-*` for the Add sheet's four tiles, and `screenshots/stress/*/logging/review.png` and `screenshots/fonts/*-xl/logging/review.png` for every device and the largest text.
- **Your ten meals:** photograph ten real meals over two days, at least five of them Thai, put them in a folder outside the repository and tell Claude "The meal photos are in <folder>". Claude runs `pnpm eval:vision` on them and adds the results to `docs/EVAL-NOTES.md` (this run used ten Wikimedia Commons photos instead). The development key allows only 20 analyses a day per model on the free tier, so production needs the billed key (M9).
- **Look for:** in the installed app, the plus, then Photo: the notice once, then the camera opens straight away (not a menu). Does the review come back in under 8 seconds on 4G? Are the items, grams and the Database or Estimate labels believable for Thai dishes? Try "Cooked with oil?", the stepper and the portion chips, Save meal, then the thumbnail on Today. Turn on airplane mode and take a photo: the message, then Try again once back online. On the phone only: the camera handoff, a portrait photo's orientation, the review photo's crop, and how soft the 320 px thumbnail looks at the top of the Meal sheet.
- **Decide:** the Review photo is cropped to 4 by 3 so the items show above the fold; at the largest text on the SE the photo still fills most of the sheet. Options: accept, or a shorter photo on small phones. The design critic also noted that the undo toast can sit over a sheet opened within five seconds of logging (as in M5); left as it is.
- **Decided for you:** the M6 list in `docs/DECISIONS.md`, notably `gemini-3.6-flash` with minimal thinking (3.8 Flash was overloaded and refuses minimal; `docs/EVAL-NOTES.md`), the quota counting on the server's UTC day (it resets at 07:00 in Thailand), Add by hand keeping the photo, the limit error offering only Add by hand, and the alcohol limit of the calorie check.

### M5: a full day of logging on your iPhone

- **Where:** the pull request's Vercel preview on the iPhone once sign in works on the live backend (the two M3 entries above); until then `pnpm dev` on the Mac against the mock (code 123456). Screenshots: `screenshots/today/` after `pnpm screenshots -- --grep today` (typical, past day, empty day, every logging sheet, light and dark, 390, SE and Pro Max), and `screenshots/stress/*/logging/` and `screenshots/fonts/*-xl/logging/` for every device and the largest text.
- **Look for:** use it for a full day with Search and Quick add only, and note every moment of friction. Logging a recent meal is the plus, then the plus on its row. Swipe a meal left to delete it and try Undo. Tap the hero for How it is calculated. Mark the training session Done, then Undo, then Skip today from the row's menu: the target drops to the rest day number. Pick yesterday in the week strip and log something there. On the phone only: the swipe feel, the keyboard over the search field, the time field in the Meal sheet.
- **Decide:** with three meals the third sits under the dock at 390 by 844, as in the M1 reference (`/gallery/today`), so F3's "fits without scrolling" is not met. Options: accept, or tighten the hero and week strip.
- **Decided for you:** the M5 list in `docs/DECISIONS.md`, notably the week strip showing the last seven days instead of Monday to Sunday, the Add sheet with two tiles until photo logging, Skip today behind a menu button instead of a long press, and the food list (512 USDA foods, names and portions drafted by Claude).

### M4: onboarding on your iPhone, twice

- **Where:** the pull request's Vercel preview in Safari on the iPhone for the install guide, then the installed app. Saving the plan needs sign in, so the last step waits for the two M3 entries above; until then `pnpm dev` on the Mac runs the whole flow against the mock (code 123456). Screenshots: `screenshots/onboarding/` after `pnpm screenshots -- --grep onboarding` (every step, light and dark, 390, SE and Pro Max), and `screenshots/stress/*/onboarding/` for every device and text size.
- **Look for:** run it once as yourself (Build muscle) and once as someone losing weight. In Safari: do the install steps match the menu on your iOS version (the button beside the address bar, Share, View More, Add to Home Screen)? Time each run with a stopwatch from Get started to Save my plan: under 90 seconds. The keypad opens by itself for the birth year and for height then weight; is that welcome or abrupt? Do the numbers on Your plan look right for you, and does tapping a line of "How this was calculated" show its source? Close the app on any step and reopen: it should come back to the same step. Then Save my plan, sign in, and land on Today.
- **Decided for you:** the M4 list in `docs/DECISIONS.md`, notably the eating disorder screen's main action being Leave setup, the typed week's weekdays, the training day hero being an average training day, and no Privacy and Terms line until M9.

### M3: sign in and sync on your iPhone

- **Where:** after both entries above are done, the pull request's Vercel preview or `https://ontrack-black.vercel.app` once merged, installed to the home screen. Until then, `pnpm dev` on the Mac shows the same flow against the mock (code 123456). Screenshots: `screenshots/signin/`, `screenshots/account/`, `screenshots/today/session-expired-*` and `bringing-*` after `pnpm screenshots`.
- **Look for:** in the installed app: tap the avatar, Continue with Google, and check it comes back into the app (not Safari) signed in. Close the app fully and reopen: still signed in. Avatar, Sign out. Then sign in with an email code: the code arrives, iOS offers it above the keyboard, and it signs in. Report anything that opens Safari or loses the session. Also look at the sign in sheet with the keyboard up, the six code boxes, and the shake on a wrong code.
- **Decided for you:** the M3 list in `docs/DECISIONS.md`, notably the account sheet on the avatar until Settings, typing your email to delete the account, and no Privacy and Terms line until M9.

### M2: three science calls kept against their source (optional)

- **Where:** `docs/SOURCES.md`, the rows marked Working assumption, and the M2 list in `docs/DECISIONS.md`. Nothing to see in the app yet.
- **Look for:** whether you agree with keeping these. (1) Movement factors 1.20 to 1.60: FAO/WHO/UNU puts even a sedentary office worker at 1.53, but that includes all activity, and Ontrack adds workouts separately. If the seated start feels low, 1.40 is the alternative. (2) 7,700 kcal per kg: Hall (2008) says it overstates the energy of weight change for leaner people; the weekly check-in corrects from your weigh-ins. (3) The 1,200 and 1,500 kcal floors are not stated in the NHLBI guide, which gives 1,000 to 1,200 (women) and 1,200 to 1,600 (men) for low calorie diets; the floors are the safer end. Corrections that changed behaviour: moderate walking is 3.8 MET, low weekly volume is under 5 sets, advanced lifters gaining get the lean pace and a 10 percent surplus cap.
- **Then tell Claude:** "Keep the science as is", or which value to change.

### M1: the design system on your iPhone

- **Where:** the pull request's Vercel preview (it asks for your Vercel login), at `/gallery` for every component and `/gallery/today` for Today built from them. The gallery is not in production builds. Screenshots: branch `pr-assets`, folder `m1/`, and after `pnpm screenshots` in `screenshots/gallery/`, `screenshots/today/` (composed and the reference mock side by side) and `screenshots/xl/` (largest text on the SE).
- **Look for:** does it look like Ontrack to you: the lime, the type, the spacing, the track bar. On `/gallery/today`, compare with `design/reference-today.html`. Then on the phone only: the dock's blur (the test browser does not draw it), the press feel of buttons, chips and keypad keys, a light haptic on chips, the theme control and the keypad's save, holding the stepper's plus, dragging a sheet down to close it, and the sheet staying above the keyboard. Switch Theme and Text size at the top of `/gallery`.
- **Decided for you:** every choice is listed under M1 in `docs/DECISIONS.md`, for example unselected tabs in `--ink-2` and macro values on two lines. Approve, or tell Claude what to change.

### M0: the installed shell on your iPhone

- **Where:** `https://ontrack-black.vercel.app` once M0 is merged to `main`. Previews (each pull request's Vercel link) ask for your Vercel login. Screenshots: branch `pr-assets`, folder `m0/`, and `screenshots/shell/` after `pnpm screenshots`.
- **Look for:** open it in Safari, Share, Add to Home Screen. The icon is the lime track on an ink tile. It opens full screen with no Safari bars. The header reads Today with the round avatar on the right. The floating dock shows Today, Train, Progress and the lime plus. Tapping or swiping changes the tab and its title. Switch the phone to dark mode and back. The plus and the avatar do nothing yet.

## Resolved during the run

- **Google sign in (M3):** done by Claude after Yab came back (through the `yab` command; the MCP link stayed refused). Google Cloud project `ontrack` (`ontrack-514502`): consent screen "Ontrack", External, in Testing, test user `teenday.jedi@gmail.com`; Web client "Ontrack Supabase" with the Supabase callback. The client JSON is at `~/.config/ontrack/google-oauth-client.json` (mode 600). The Supabase Google provider is on (pushed with the CLI from a scratch config, so `supabase/config.toml` does not declare it and pushes leave it alone). Google linked the new project to your billing account on its own; you disabled billing on it.
- **Email codes (M3):** you set Gmail SMTP in Supabase; Claude pushed the code template (`supabase/config.toml`, `supabase/templates/code.html`) and sent one test code to `teenday.jedi@gmail.com` (HTTP 200).
- **Gemini key (M6):** made by Claude in a new AI Studio project "Ontrack Gemini" (`gen-lang-client-0967924647`), Free tier, no billing. File `~/.config/ontrack/gemini-api-key`; in Vercel as `GEMINI_API_KEY` for production and preview.
- **Supabase MCP (M0):** you connected it. It is at user scope with account tools, not limited to this project; the project scoped command was `claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=sbexrpzbzkzofnbpaauu"`. It loads in new sessions.
