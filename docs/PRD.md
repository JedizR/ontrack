# Ontrack: product requirements

## 1. The product in one paragraph

Ontrack tells you how much to eat for the body you are training for, and keeps that number honest. You tell it how you train and what you want. It sets a daily calorie and protein target from published equations, raises it on training days, and corrects it at a weekly check-in from your own weigh-ins and food log. Logging a meal takes one photo, a barcode, a sentence or a search. It is built first for people who struggle to gain weight: for them the target is a floor to reach, not a ceiling. Thai food is the main reason it exists. The AI names foods, estimates grams and explains; the engine decides every number.

Ontrack is a phone browser app (Safari on iPhone first, Chrome on Android too) and a proof of concept for a product management class, built as close to a real product as we can. It will not be launched publicly. The interface is English only, because the class is taught in English; Thai dishes have English names, with Thai script as search aliases.

## 2. Who it is for

| Person | Situation | What they need from Ontrack |
| --- | --- | --- |
| The hardgainer (primary) | 18 to 35, lifts 3 to 5 times a week, lean or underweight, has tried to bulk and stalled because he eats less than he thinks | A floor to hit, proof that he is hitting it, easy calories when he is behind, and a target that rises when the scale does not move |
| The cutter | Lifts, wants to lose fat and keep muscle | A moderate deficit, high protein, no crash diets |
| The maintainer | Trains for health or performance | Confirmation that eating matches training |

Everyone trains or intends to. Ontrack is not for people under 18, during pregnancy, with a medical condition that affects diet, or with a history of disordered eating (section 7).

## 3. Principles

1. **Every number shows its work.** Tap any target to see how it was computed and which paper the equation comes from.
2. **Ten seconds to log.** A meal that takes longer will not get logged.
3. **The plan adapts to the person.** Targets move with training days and with measured results.
4. **No guilt.** No red for food, no streaks to break, no rankings, no moral words about eating.
5. **The AI explains, the engine decides.** The model never sets or changes a target, and nutrition comes from the food table whenever a match exists.
6. **Works without signal.** Logging, training and Progress work offline and sync later. Photo and text analysis, new barcodes, the coach and friends need a connection, say so, and offer another way.
7. **Private by default.** Photos are analysed and discarded. Only a thumbnail is kept. Nothing is shared unless the user shares it, one photo at a time, with friends they accepted.

## 4. The three differentiators

| Differentiator | What ships |
| --- | --- |
| Camera logging, better for Thai food | One camera for a meal, a label or a barcode. Photo to itemised meal in one step: the model identifies components and grams, and a bundled table of 983 foods supplies nutrition when there is a match (USDA and Singapore tables, the Thai Food Composition Database and recipe-computed Thai dishes, every protein variant its own row). Values the user corrected are remembered. Everything else is labelled an estimate. Every analysis is kept so it can become an evaluation set |
| Your training makes the target accurate | A weekly program (days, type, duration, intensity, optional exercises). Exercise energy is computed per session from Compendium MET values and added to that day's target. Every session is marked Done. Program analysis with recommendations from the literature. A weekly check-in measures real maintenance and corrects the target |
| Works for skinny people building muscle | Gain mode: the target is a floor, going a little over is still on track. Evening "easy adds" when behind. A protein floor. A faster pace for lean people, labelled as still being checked. The target rises when weight is flat |

## 5. Features and acceptance criteria

IDs are stable. Tests and commits refer to them.

### F1 Sign-in
- Sign in with Google, or with a 6 digit code sent by email. No passwords, no magic links.
- Works in a normal browser tab: Safari on iPhone and Chrome on Android. The session survives closing the tab and restarting the phone. Saving the onboarding plan is what asks for sign-in; its answers survive the Google redirect.
- An expired session says so and keeps what was logged. Another account cannot take over a phone that holds unsent changes.
- Signing out waits for unsynced changes (or signs out anyway, after saying they will be lost), then wipes local data on the device.
- Deleting the account (confirmed by typing the email) removes all rows, photos and the auth user, and says so.

### F2 Onboarding and plan
- Engaging and as little effort as possible, while still personalizing the app (owner's rule). One question per screen, large controls, a step count, Back beside Continue. A tap selects and enables Continue; nothing moves on by itself, and Continue before an answer shakes the choices. Completable in under 90 seconds.
- At most ten questions: goal (Build muscle, Lose fat, Maintain; "Other goals" adds Gain weight and a gentle cut); screening (section 7); sex for the equation; birth year; height and weight on wheels, metric first; goal weight (F25); daily movement outside workouts; training days; what you train (lifting, cardio or both); lifting experience, for a gain goal that lifts. Body fat is optional, under "Fine tune". Session length and effort are defaults changed in Train; the pace is chosen on Your plan.
- From the movement question on, the number builds in the footer as each answer lands. "Building your plan" plays once, then "Your plan": the target counts up (training and rest days) with protein, carbs and fat, the paces the guardrails allow with what to expect, and "How this was calculated", which sums exactly to the target. The wait and the count-up always play, even with reduced motion.
- Answers survive a reload. After saving, Today asks for a first meal and Train suggests a program built from the answers.
- The screening step in section 7 runs before any target is shown.

### F3 Today
- The day's card: calories eaten of the target (tap for how it is worked out), what is left ("to go" when gaining) or "On track" with a check, a Training day or Rest day chip, and a track; protein, carbs and fat; each session in its own box (F8); the weigh-in box (F6). Over the target, the amount shows in neutral ink. It sits above the dock at 390 by 664 and at 375 by 548.
- Meals follow, newest first, with photo or icon, time, calories and source label. A supplement with no calories is a chip under "Taken". Swipe to delete, with Undo for 5 seconds.
- At most one card between them, on today only: the check-in when due (F9), else the evening easy adds (F10), else the protein suggestions (F24), else "Nothing logged yet" (F23). A one-time card offers the two styles (F27).
- "Finish day" shows from 20:00 and on past days; it marks the day finished so it counts toward the check-in, and can be reopened.
- The week strip slides back eight weeks with Today pinned; a dot marks a day on track. A past day opens in the same view and can be edited; older days are in Progress, under History.
- Every edit shows at once, offline included.

### F4 Log by photo
- The plus opens one camera: Meal, Label, or a barcode, read in any mode. Photos picks one already taken. It works like the phone's own camera (R7): a white shutter, a light, zoom from 1x to 3x by chips, a drag or a pinch, and a macro toggle for close-ups where the phone has an ultra-wide lens. Before the first photo, one sentence says it goes to Google's Gemini to be read and is discarded.
- From shutter to a reviewable list in under 8 seconds on 4G for a typical plate, the wait shown in words.
- The review sheet lists each component with grams, calories and a source label (Database, Estimate or Yours). Grams are editable with a stepper and portion chips (Half, Same, One and a half, Double). Items, the name and the "Eaten at" time can be changed; items can be removed or added.
- "Cooked with oil?" appears when an item may hide fat, starts at 1 tsp, and is its own item. Table items carry no hidden fat.
- "Something off?" takes a few words ("It was brown rice, 2 eggs"); the photo or description is read again with the note.
- Not food, offline, over the daily limit, busy and failed each have a specific message and another way to log.
- The original photo is never stored. A 320 px thumbnail is.

### F5 Log without a photo
- Describe: the field at the top of the plus, typed or spoken, gives the same review sheet. Speaking takes Thai, English or both (R7): up to 15 seconds, written down into the field to be read and fixed first.
- Search the bundled food table (works offline; Thai script and romanised names find Thai dishes), pick a portion, add.
- Quick add: calories, optional protein, carbs and fat, optional name, on the phone's number pad.
- Recent and Saved meals log again in one tap from the plus, with Undo. Recent shows five, then every meal ever logged, with a search (R7). Any logged meal can be saved from its bookmark.

### F6 Weigh-ins
- Log weight in one sheet on a wheel that starts at the last weigh-in and takes typing. One value per day; logging again replaces it.
- Today holds a weigh-in box: "Weigh in" with the days since the last one, or the weight with a check and Edit once done.
- Progress shows weigh-ins as dots, a smoothed trend line and the target rate band.

### F7 Training program
- Build a week: zero or more sessions a day, each with type (strength, circuit, cardio, sport, mobility, walking), name, day, minutes and intensity. The week is a row of seven days with an icon per session.
- Start from one of six programs (Full body 3 days, Upper lower 4 days, Push pull legs 6 days, Minimal 2 days, and two with cardio, F20), from scratch, or from a sentence (F24). After onboarding, Train suggests the one that fits the answers.
- Optionally list exercises with sets and a rep range from a bundled library. A lifter who is not gaining is asked once how long they have lifted.
- Analysis shows weekly sets per muscle group against the evidence band, sessions per muscle group, weekly cardio minutes against the WHO range, and rest days. Recommendations are specific ("Back gets 6 sets a week. Add 4 to reach the range linked with better growth"), each with a "Why" that opens its source.
- A changed program moves the target from today; earlier days keep theirs. Every change has Undo.

### F8 Training-day targets
- By default calories are higher on training days by that session's estimated energy cost and lower on rest days, with the same weekly total. "Same target every day" in Settings switches it off.
- Each session has its own box on Today with Done (F26). Its name opens a menu with Done and Skip. Skipping returns the day to its rest target; Undo clears either mark. A session's energy shows as a negative number, never as calories to earn back.

### F9 Weekly check-in
- On the chosen weekday (Settings; the day the plan was saved by default), once the target has stood for 14 days, Today shows a card and the Progress tab a dot.
- A sheet of three steps, none advancing by itself: the last three weeks in plain numbers (rate against target rate, intake against target, days fully logged, weigh-ins); what it means in one sentence, with measured maintenance when there is one and the coach's "why this target" (F24); then the proposal.
- It needs at least 8 weigh-ins across 14 days, and says so when short. With fewer than 10 fully logged days (two items and half the target, or a finished day) it steers by weight alone, and says so.
- It proposes a change of at most 200 kcal, or none, with the reason in one sentence. "Use the new target" starts tomorrow; "Keep the current target" changes nothing. Nothing changes silently.
- It separates "you ate under your target" from "your target was wrong": a gainer averaging under 90 percent of target, or a cutter over 110, keeps the target and is told reaching it comes first.
- Past check-ins stay on Progress with what was decided.

### F10 Gain mode
- With a gain goal, Today counts up toward the target and shows what is left to eat. Reaching 95 percent or more is on track. Going over by up to 15 percent is still on track.
- From 18:00, if more than 25 percent of the target remains, Today offers three calorie dense foods sized to close the gap, the person's own first, each loggable in one tap.
- A gain goal with fewer than two strength sessions a week produces one clear recommendation to add them.

### F11 Progress
- Two hero boxes: the weight trend with its change over the range (a tap weighs in), and consistency, the days on track in the last four weeks.
- The chart is the page. Pick Weight, Calories, Protein or Training, and a range from 1W to 1Y or All (longer ranges show as the account ages). With nothing to show, "No data yet" sits in the chart. Calories shows what was eaten against what living and training took. Three boxes under it change with the pick.
- Under the card: the AI week recap and "Ask about your week" (F24); the pick's detail, including measured maintenance against the equation's; week by week consistency; check-ins; History, where any past day opens as Today and can be edited.

### F12 Settings and data
- Reached from the header's person button: Profile (F16), then Settings. Cards of grey boxes, never a gradient; each row says what it is now, and a switch is the whole box.
- Style (F27), units, theme (system, light, dark), text size (system, Default, Large, Larger), reminders (F23), Thai dishes first (F14), body details, goal and pace, same target every day, check-in day. A change to body details or goal shows the new target before saving and starts tomorrow.
- Export everything as JSON and meals as CSV through the share sheet (a download where the browser cannot share files). Backup status with Sync now.
- "The science" lists every equation and constant with its citation and status (Verified, Working assumption, Being checked). Privacy, Terms, Report a problem, sign out, delete account.

### F13 Offline and updates
- Runs in a browser tab. Once loaded, the app works offline, from a cold start.
- Cold start to an interactive Today in under 1.5 seconds on an iPhone 12 with a year of data.
- When a new version is ready, a toast offers to update. No silent reloads.
- A small mark in the header shows when changes are backing up, the phone is offline, or something needs attention, and nothing when all is well.

### F14 Thai food table
- The table has 983 foods, Thai dishes and ingredients among them, with nutrition per 100 g from the Thai Food Composition Database, recipes computed from sourced ingredients, or USDA and Singapore tables. Every row cites its source. Thai script and romanised names are searchable. "Thai dishes first" follows the phone's languages unless set.
- In a photo or a description, a Thai plate resolves to its exact row from its dish, protein and extras (pad kra pao with chicken, with rice, with a fried egg) and reads Database. A correction such as "duck, not pork" picks the other row. The model names the dish and estimates grams.
- The 30 Thai text cases in `tests/fixtures/vision/thai-eval.json` all land on the right row (`pnpm eval:vision --text tests/fixtures/vision/thai-eval.json`).

### F15 Remembered nutrition
- Correcting an item's calories or macros, in the review sheet or on a logged meal, remembers those values for that food for this user, across devices.
- The next time that food is logged by photo, description or search, the remembered values are used and the source label says Yours. "Use default values" forgets them.

### F16 Friends and profiles
- The header's person button opens Profile: photo, name, handle, friends, days logged (days with a meal), goal and pace, Edit profile, Settings. The header's friends and map button opens the map (F17) with the friends panel, and counts requests waiting.
- A profile has a display name, a unique handle (3 to 20 letters, numbers or underscores) and an optional photo. Find people by handle, send a request, accept or decline. Either side can remove the friendship. A request that arrives while the app is open shows without a reload.
- "Show my program to friends" is off by default.
- Friends see only what was shared with them. Weight, targets and the food log are never shared. Friends need a connection and say so.

### F17 Food photo map
- Share to map is off by default for every photo, in the review sheet and on a logged meal.
- A shared photo is placed where it was taken: the location saved in the photo, or the phone's position read once after the user turns sharing on. Never live location and never a track. The position is rounded to about 100 m before it leaves the phone, and one sentence explains this before the first location prompt.
- The map shows the user's and friends' shared meals as photo pins with the person's avatar, and groups nearby pins with a "+N more" count, in the manner of Instagram's map. A pin opens the photo, title and nutrition. The user's own pins come from the phone, so they show at once and offline. No connection and no WebGL each say so.
- Unsharing or deleting the meal, or removing the friendship, removes the photo from the map and from friends' reach at once. The photo is the meal's own thumbnail and goes with the account.

### F18 Landing page
- A signed-out visitor with no onboarding in progress sees a landing page that says what Ontrack does, in the OneFin style of the owner's picks, with glass and scroll animations. It is always Tray (F27). Each feature it names (photo, barcode, Thai foods, supplements, training-day targets, gain mode, the check-in, friends and the map) shows a real app screen in an iPhone frame.
- "Build your plan" starts onboarding at the first question; "Sign in" opens the sign-in sheet. A returning user, or a visitor with a draft, never sees it.
- Its words follow the voice guide: no testimonials, ratings, user counts, press logos, prices or claims the app does not keep, and no mention of installing the app.
- It respects reduced motion and loads as its own chunk within the initial JavaScript budget.

### F19 Faster gain pace
- With a gain goal, a lean person (BMI under 20) who has lifted less than three years can choose a faster pace next to the lean and standard paces; "Gain weight" under "Other goals" leads with it. The words say what to expect: a faster gain, with more of it as fat than at the lean pace. No moral words. Where it is not offered, a line says why.
- No source recommends more than 0.5 percent of body weight a week (`docs/SCIENCE.md`), so the faster rate (0.75) is labelled "Being checked". The surplus cap, the protein floor and the strength recommendation in F10 still apply, and the check-in measures against the chosen pace.

### F20 Strength and cardio together
- Two of the six programs mix strength with cardio. A lifting session can carry "Cardio after", a linked session on the same day. Cardio and walking sessions carry a setup (machine, speed, incline, level); a session named Cardio shows its machine.
- When a week has both, the analysis says how to arrange them (lift before cardio, 6 hours or more between, cycle rather than run on a leg day), each point with its source.
- Progress's Training view shows sessions done against planned per week, strength sessions, and cardio minutes against the WHO range, for the selected range.

### F21 Supplements
- Whey sits at the top of the plus, with a plus for any other (plant protein, casein, mass gainer, creatine or something else); creatine is logged from there once set up (R7). Brands differ a lot (owner's call), so setup leads with the user's own tub: scan its barcode (F22) or photograph its label, and the values per scoop are filled in for the user to confirm. "Use typical values for now" comes second; it is labelled Typical wherever its numbers show, with one quiet way to set it from the tub.
- Logging takes three taps from the plus: the supplement, the scoops (half steps, from the last amount used), Add. The sheet shows calories and protein for the chosen amount as it changes. Optionally mixed with water or milk, remembered for next time.
- A logged supplement counts toward the day like any meal item: it can be edited or deleted with undo, works offline and syncs.
- A supplement with no calories, such as creatine, is logged as taken and shown compactly, without a 0 kcal line.
- Ontrack does not recommend supplements or doses.

### F22 Barcode scanning
- A main feature (owner's call). The plus camera reads EAN-13, EAN-8, UPC-A and UPC-E barcodes by itself in any mode. If the camera cannot read it, the number can be typed on the phone's number pad.
- Lookup order: products this user saved before (synced, works offline), then Open Food Facts. A found product opens a sheet with serving choices (servings, whole pack or grams) and live calories, then Add.
- If the product is unknown or has no nutrition, "Photograph the label" lets the model read the nutrition panel (it reads printed values, it does not estimate). The user confirms the values, and the product is saved for that barcode, so the next scan is instant, offline included.
- Source labels say Open Food Facts, Label or Yours. Open Food Facts is credited where its data is shown.
- Camera denied, offline, not found and unreadable each have their own wording and a way forward.

### F23 In-app reminders
- Gentle cards on Today when the app is opened: nothing logged by a set time (13:00 by default), a check-in due, and the evening easy adds (F10). Each can be turned off in Settings. A waiting check-in also marks the Progress tab with a dot.
- No push notifications and no inbox, for the reason in section 6. No streaks, no guilt words.

### F24 AI coach
- The model writes `{{slot}}` placeholders, the server rejects any digit outside a slot, and the app fills each slot from the engine's own value. It never names or changes a target ("Your weekly check-in sets that") and gives no medical advice.
- Each text use has a plain template, filled from the same numbers, for when the coach is offline or over its daily limit (shared with photo analysis). AI text is labelled "Written by AI".
- Week recap on Progress: a headline and two or three lines, once a day is fully logged. "Ask about your week" opens Ask Ontrack: three suggested questions and a field, answered from the week's logged numbers only.
- Why this target, in the check-in (F9): two sentences.
- Close the gap on Today: from 12:00, with a meal logged, 15 g or more of protein short and 150 kcal or more left, three foods that close it, each with a short reason and one tap to log, the person's own most logged first. It folds to its title line.
- Adjust with AI on Train: say how you train or what to change. The coach proposes the whole week, the person sees all of it before anything changes, and applies it with Undo. The result passes the same checks as a hand-built program, and the engine works out its energy. When the coach cannot answer, it says why and the week can be changed by hand.

### F25 Goal weight
- Optional, for lose and gain goals. Onboarding asks it as its own step: a wheel starting at a suggested weight, the healthy range for the person's height as a band marked with today and the goal, and "Skip for now".
- Changed or cleared later from Your plan or the Goal box on Progress. A goal weight below BMI 18.5 is refused, with the reason.
- It never changes the target. Progress shows the goal, how much is "to go" and a track from the first weigh-in. Reaching it reads "Reached" in neutral ink: no banner, no confetti.

### F26 Done and the muscle map
- Every session, lifting or cardio, is marked Done from its box on Today or from Train's Up next card. There is no set by set logging, workout timer or rest timer (owner, 18 Nov): Ontrack is a calorie tracker first.
- Done turns the box ink, spreading from the button; a green check carries the session's energy as a negative number, counting down, with a short burst; the button becomes Undo, which plays it back. Under reduced motion it lands at once.
- Train's Up next card shows the next session, the week ring (sessions done of planned, green when the week is done) and the one action. Under it: the muscle map, and Burned and Sets this week, counted from sessions marked Done.
- The muscle map is a body with three violet steps by weekly sets per muscle (under 5, 5 to 9, 10 or more), a legend and a text description. Before anything is done this week it shows the planned week.

### F27 Two styles
- Tray is the default: white shells holding grey boxes, nested corners, glass on the header, the dock and sheet backdrops. Bento is flat: no card inside a card, one corner radius, no glass, a black selected-tab pill. Everything else is the same in both.
- Picked on Today's one-time "Pick your style" card (a tap restyles the app at once, "Use" keeps it) or in Settings, at the top. It is a per-device choice. The landing page is always Tray.

### F28 First-week guide
- Problem: new users do not know what to do first, and many never log a second day. Metric: activation, new users who log food on 3 of their first 7 days.
- In the plan's first 7 days, Today shows "Your first week" under the hero: three steps (log a meal, weigh in, mark a workout done), how many are done, and the first check-in's date as the reason they matter.
- Each step is read from the account's records, so it matches on every device. A step that can be done now has Add; the workout points at Done on the hero instead of repeating it. Day one's weigh-in is tomorrow's, since onboarding saved that day's.
- All three done shows "You're all set" for that day, then the guide is gone. A cross hides it on this phone, with Undo. No streaks, no deadlines, no guilt words.

## 6. Not in scope

Ruled out by the owner:
- Push notifications. An iPhone browser tab cannot receive them without installing the app, and a native app needs a paid Apple developer account.
- Apple Health, Apple Watch, widgets and anything else that needs the operating system; a paid Apple developer account, and with it Sign in with Apple and native wrappers.
- A Thai language interface. The app is English only.
- Set by set workout logging and a workout timer, removed on purpose (F26).
- A dietitian's review of the guardrails, and a public launch. Ontrack is a class proof of concept: no real payments (R5's freemium runs through Stripe in test mode with a 0 THB bill), ratings, referrals or store listing.
- Streaks, badges, rankings, a public feed, likes and comments, and a notification bell or inbox.
- An AI that decides a number.

Not built, and not planned: water and micronutrients, meal plans and recipes.

## 7. Guardrails

Ontrack gives general wellness guidance, not medical advice, and says so at onboarding, on the landing page and in the Terms. The numbers below live in `src/lib/model/engine/constants.ts`, each with its source or marked as a working assumption.

- Adults only. A birth year that makes the user under 18 ends onboarding with a kind explanation.
- A screening step asks whether any of these apply: pregnant or breastfeeding, a medical condition or medication that affects diet, a current or past eating disorder. If any applies, Ontrack recommends working with a clinician. For the first two it then offers tracking with a maintenance target only. For the third it advises against calorie tracking without professional support and offers to exit.
- No weight loss goal below BMI 18.5. Between 18.5 and 20 only the gentle pace is offered. A goal weight cannot be set below BMI 18.5.
- Daily targets never go below 1,200 kcal (female equation), 1,500 kcal (male equation) or 1,350 kcal (sex not given). A deficit never exceeds 25 percent of maintenance. A surplus never exceeds 20 percent, or 10 percent for advanced lifters (over three years).
- BMI under 16 shows a card suggesting a doctor's visit, without blocking a gain or maintain plan.
- Language is neutral. No "good" or "bad" foods, no "cheat", no "burn off". Going over a target is shown in neutral ink, never red.
- No before and after imagery, no body shape goals, no weight loss countdowns.
- Social features show no weights, targets, daily totals, streaks or rankings. No leaderboards. A shared meal shows its nutrition in neutral words.
- The AI coach never writes a number outside a slot, names or changes a target, or gives medical advice (F24). An estimate says it is one.

## 8. Quality bars

| Measure | Bar |
| --- | --- |
| Initial JavaScript, gzip | 130 KB or less (`pnpm bundle`, run by `pnpm verify`). Supabase, charts, camera, settings, the map and the landing page load lazily |
| Cold start to interactive, iPhone 12 | 1.5 s or less |
| Tap to visible response | 100 ms or less. Every tap has a pressed state |
| Photo to review sheet | 8 s or less at the median |
| Layout | No horizontal overflow, no clipped text, tap targets 44 px or more, on iPhone SE, 15 and 15 Pro Max in Safari with its toolbars, at all three text sizes, light and dark. Each tab's main card fits one screen at 390 by 664 |
| Contrast | Text 4.5 to 1 or better. Large numerals, selected states and shape-only controls 3 to 1 or better |
| Offline | Every feature except photo and text analysis, new barcodes, the coach and friends works in airplane mode and syncs within 10 s of reconnecting |
| Tests | Every engine test vector passes. The sync conformance suite is green on both backends. Every feature has an end to end test, except the AI coach (F24), which has unit tests for its validation and fallbacks only |

## 9. Risks

| Risk | Response |
| --- | --- |
| Photo calories are wrong for mixed dishes and hidden oil | Label estimates honestly, resolve Thai plates to exact table rows, count oil by default, make correction fast ("Something off?", remembered values), and rely on the weekly check-in, which corrects the target from outcomes rather than logged calories alone |
| The AI coach says something wrong or off limits | Numbers are slots filled by the engine, a reply with a stray digit is rejected, targets and medical questions are refused, a template answers when the coach cannot, and AI text is labelled |
| Google sign-in misbehaves in Safari | Email code is the fallback |
| Free tiers change or pause | A daily keep-alive, a provider interface and a fallback model, a daily limit per person, portable handlers, a JSON export |
| The app nudges someone toward harmful restriction | The guardrails in section 7, each built from a checked source. Ontrack is a class proof of concept and is not launched publicly, so there is no dietitian review |
| A science constant is wrong | Nothing ships as verified without a checked primary source. Provisional values are labelled in the app |

## 10. North Star Metric

**Weekly on-track days:** the number of on-track days all users had in a week. A user adds at most 7. A day counts when it is over (past, by its local date), has food logged, and the engine's `dayCounts` passes for it. That is the same rule as the consistency count on Progress, so the metric is everyone's consistency added up. It was chosen in R5 (23 Nov 2026) against the tests in Amplitude's North Star Playbook.

- **Why this one:** an on-track day is the promise of section 1: you ate right for the body you are training for. The number rises with more users, more logged days and better targets, and only when a user gets that value. It stays a count of good days, never a streak, in keeping with principle 4. A day off the target in the goal's direction still counts, so the metric does not reward eating to the exact number. It is measurable from the synced records without a tracking SDK.
- **Not chosen:**
  - Daily or weekly active users: activity says nothing about value.
  - Logged days: these reward logging, not eating right.
  - AI logs: they are the paywall's lever.
  - Pro subscribers or revenue: they lag, and they belong with the business metrics below.
- **Inputs, the levers a team works on:**

  | Input | Measure | Moved by |
  | --- | --- | --- |
  | Breadth | Weekly logging users; activation: a plan saved and a meal logged within 24 hours | The landing page, onboarding, the first log |
  | Frequency | Logged days per logging user per week | Ten seconds to log: camera, scan, saved meals, the top row |
  | Fit | The share of logged days that are on track | The adaptive target and the weekly check-in, the target raised on training days, protein suggestions, easy adds |
  | Efficiency | Median time from opening the plus to a saved meal; the share of AI logs kept without a correction | The resolver, the food table, alternatives in Review |

- **Guardrails, watched beside it:**
  - Days below the intake floor. These never count, and the number should stay near zero.
  - Users losing more than 1 percent of body weight a week: the top of the source band for `losePace` (S9).
  - The logging gap: logged intake against the maintenance the check-in measures. A widening gap means partial logs are counting as on-track days.
  - "Something off?" corrections per AI log.
- **Business metrics, kept apart from the North Star:**
  - Trial starts per view of the plans sheet.
  - Trial to paid conversion.
  - 4-week retention.

  Free users count fully in the North Star: in freemium their good days are what lead to Pro.
