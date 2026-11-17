# Ontrack: screens and flows

Each screen lists what it contains from top to bottom, its states, and its words. Layout values come from `docs/DESIGN.md`. `/gallery/today` is the worked example of how a spec here becomes a screen. Strings shown are the seed for `src/lib/i18n/en.ts`.

## 1. Map

~~~
First run:  Landing page > Onboarding (up to 9 questions) > Your plan > Sign in > Today
Returning:  Landing page > Sign in > Today

Tabs:       Today | Train | Progress           Dock: plus button opens Add
Sheets:     Add, Review, Search, Describe, Quick add, Meal, Supplement, Weigh in, How it is calculated,
            Session, Exercise picker, Templates, Check-in, Settings and its pages
~~~

## 2. Shell

- Header, content, dock. The header title is the tab name, or the date when viewing a past day.
- Signed in, the header carries a round map button beside the avatar on every tab: one tap opens the food map and friends (section 13, S1).
- Swipe left and right moves between tabs with the watermelon behaviour. Sheets and horizontal scrollers do not trigger it.
- The dock hides while the keyboard is up and while a sheet is open.
- **The keyboard (R1).** iOS overlays the keyboard on the layout viewport instead of resizing it, so `keyboard.ts` publishes `--kb` (how much it covers) and `--vvh` (the visible height) while a field has focus; sheets sit `--kb` above the bottom and stay inside `--vvh`, and the onboarding bar sticks `--kb` above it. Not typing, both are unset.
- **The bell (R1).** Every tab's header has a bell beside the map and the avatar. A red dot shows while anything in it is unread (a notice is read once the sheet has shown it; a new day's notice turns the dot on again). It opens the notification sheet: the starting checklist (it left Today), "Check-in ready" and "Time to weigh in", each one tap from what it asks for; empty it says "Nothing new". Nothing is pushed.
- On screens wider than 480 px the app is a centred column.

## 3. Landing page

L1 (PRD F18). The first screen in a browser that is signed out, with no onboarding draft; it replaced Welcome. It also shows when a visitor comes back from the first question, and for a signed in account that has no plan yet (as Welcome did: its Sign in is the way to switch accounts). A returning user (the phone knows its last user) and a visitor with a draft skip it. Ontrack runs in the browser tab; nothing mentions installing. A lazy chunk of its own; onboarding loads beside it, so Build your plan answers at once. Style from the owner's picks, DESIGN.md section 13. Words in `t.landing`.

From the top:
- **Bar.** Fixed, 8 below the safe area: a Liquid Glass capsule 52 high across the page's width (the owner took L4's 430 cap back), with the ONTRACK wordmark and "Sign in" (`primary`, `sm`, a round pill nested 8 inside: the ink pill, the owner's call in L3), which opens the sign in sheet titled "Welcome back". Over the hero's sky it has no glass; once content scrolls under it the glass grows out of Sign in, dark over the dark sections.
- **Hero.** On the sky gradient: "Eat for the body you are training for." in Poster capitals, "you are training for." in violet; the line "Your daily calories and protein, from published equations and how you train. Raised on training days, and checked against your weigh-ins every week."; the primary "Build your plan" with "No account until you save it." in Caption under it. Below (beside it on a wide screen), Today in a phone, cut by the next section, with two tilted white chips flying in: "Training day" and "On track".
- **Statement.** On a white sheet that rises over the hero at radius 48: "Ontrack builds your target from [how you train], logs a meal from [one photo], and corrects it from [your own weigh-ins] every week." in Statement size, the bracketed words in pills (the last one ink), four tilted violet icon tiles around it.
- **01 Logging.** Sticker eyebrow, "One photo logs a meal.", a lead on where calories come from. Four cards, each a title, a line and a real screen: Snap the plate (the photo review; the one solid violet card), Scan the barcode (a product from Open Food Facts), Thai food by name (search in Thai script), Shakes by the scoop (the whey sheet).
- **02 Training.** A dark rounded section with a violet glow: "Your training sets the target." Two dark cards with flat lavender panels, a violet icon tile and a number badge: More food on training days (Train), A floor for lifters who struggle to gain (Progress on vector F).
- **03 Check-in.** "Corrected every week." A lavender panel with rings, the check-in's proposal in a phone and two tilted white cards in the check-in's own words. Beside it a 1-2-3 stepper: Weigh in, Log your meals, Choose your next target; each number turns ink as it comes into view.
- **04 Friends.** "Your friends' meals, on a map." The food map in a phone, whole so its friends panel shows, beside three points with violet icon tiles: friends by request, off until you share, rounded and never tracked.
- **05 Sources.** The dark run to the end starts here. "Every number shows its work." Four colour-washed cards, each a part of the target and its source, read from the engine's constants: resting energy (Mifflin and St Jeor), training energy (the Compendium), gain pace (Iraki and others), Thai dishes (the Thai Food Composition Database).
- **Closing call.** "Plan. Log. Adjust." in Poster capitals, then a violet panel with the mark, "Your calories and protein for training days and rest days, from how you train.", the white "Build your plan" and its Caption. Under it, "Already have an account? Sign in".
- **Footer.** A normal footer (L4), the lanes of a running track on the dark run: the wordmark and "Eat for the body you are training for." with a round Back to top; then four numbered lanes, each number big in outline: 1 Start (Build your plan, Sign in), 2 Learn (Logging, Training, Check-in, Friends, Sources: each scrolls to its section and focuses it), 3 Good to know (the wellness disclaimer from screening; "A proof of concept for a product management class, for adults who train."), 4 Contact and legal (team.ontrackapp@gmail.com, Privacy, Terms). The last line: "Ontrack 2026" and "Version 1.2.0".
- **Floating action.** Once the hero's Build your plan has scrolled away, the same ink pill floats 16 above the bottom (L4: no tray, and never at the edge, where Safari 26 would take its colour for its bar); it stays away from the closing call to the end of the page.

Every phone shows a real screen of the app, made by `tests/e2e/landing-shots.spec.ts` (the alt text says what each shows). No testimonials, ratings, counts, logos, prices or claims beyond what the app does.

States: the only state is the page; images load lazily below the hero, with their alt text until then. With reduced motion everything shows at rest at once.

## 4. Onboarding

Redesigned in O1 from `ontrack-design/onboarding/RESEARCH.md` and `COPY.md`: ask only what moves the number or a guardrail, default the rest in the open, build the number in front of the user.

Full height flow on the landing page's sky (O2: `--grad-sky` behind the page, scrolling with it so nothing fixed meets an edge, a light island in both themes, Safari's top edge tinted with it). A thin track at the top with "Step n of N", where N counts only the questions this route asks (it can shrink as answers drop a question, never grow). **Back is at the bottom**, a white button, a small 56 square white button with an ink chevron to the left of it, both inside the landing page's Liquid Glass capsule (the floating action's own: `liquid`, with the light that follows the finger; corners the button's plus the 8 gap; inset 12 each side so it stays under WebKit's 90 percent width, L4). Everything arrives in order with the landing page's blur settle (`rise`, 70 ms apart). One question per screen, the question in Title and its caption in Lead, the answers in the middle. A tap selects an answer and never moves on (the owner's call in U1a, over O1's advance on tap): the picked card fills ink and its icon tile turns light lavender with an ink glyph (the others' tiles are dark violet with a white glyph, the owner's swap in O2), a ring at its right fills with a white check that pops in, and the answer is saved, so the number so far grows on that tap. Every question pins "Continue". Until there is an answer it has a faint ink tint that lets the glass show through (aria-disabled, not `disabled`), and a tap on it shakes the answers above it, left right left, with a buzz and no words (R1); Continue moves on once there is one.

| Step | Question | Control | Notes |
| --- | --- | --- | --- |
| 1 | What are you training for? | Three choice cards with lavender icon tiles: Build muscle (Gain steadily while you train), Lose fat (Keep the muscle you have), Maintain (Eat to match your training). Under them a small underlined violet link, "Not what you're looking for?", shows two more and moves focus to the first: Gain weight (Put on weight faster if you are lean) and Lose fat and build muscle (Eat just under maintenance, with more protein) | The two map onto the engine's goals (SCIENCE.md section 6, vectors J and K). Back on this step with one of them picked, all five show |
| 2 | Before we set any numbers | Caption "Tick any that apply." Three checkbox rows: pregnant or breastfeeding, a medical condition or medication that affects your diet, a current or past eating disorder. Then "None of these apply", last so the conditions are read first. The disclaimer in Caption | "None of these apply" or a tick enables Continue; with a tick it leads to the advice screen: it opens with "Thank you for telling us.", and offers "Track with a maintenance target" (eating disorder: "Leave setup" is the main action) |
| 3 | Which sex should the equation use? | Male, Female, Prefer not to say ("Uses the midpoint of the two") | Caption "Resting energy differs by sex. Used only for this calculation." |
| 4 | What year were you born? | A wheel starting at this year minus 25 (owner's decision). Tapping the selected row types it. Continue | Under 18 ends here with a kind message and Leave setup |
| 5 | Height and weight | Units (metric first, whatever the region, the owner's call in R1), then two wheels sharing one band, starting at the sex's median: men 175 cm and 67 kg, women 161 cm and 57 kg, prefer not to say 168 cm and 62 kg. Continue | Caption "Your weight becomes your first weigh-in. Only you see it." |
| 6 | Outside workouts, how much do you move? | Four choice cards with icon tiles and the step ranges | |
| 7 | How many days a week do you train? | Above the chips, a week of seven dots that light left to right, one after another, as the answer changes (O2). Eight large chips in a 4 by 2 grid, 64 high: Not yet, 1 to 7 | Caption "Lifting, cardio and sport all count." Not yet skips steps 8 and 9 |
| 8 | What do you train? | Lifting, Cardio, Both (owner's decision) | Caption "Sport counts as cardio." Sets the sessions: lifting an hour, cardio half an hour, Both taking turns with lifting first, all at a moderate effort |
| 9 | How long have you lifted consistently? | Under a year, 1 to 3 years, Over 3 years | Asked only with a gain goal, lifting or both, and no screening flag: it sets the gain paces and the surplus cap |

**Your number so far.** From step 6, the pinned footer holds a card above the capsule with Back and Continue: Eyebrow "Your number so far" and under it the latest row with what it added ("Daily movement +315 kcal"), in the breakdown's own words, with the value in Heading and "kcal" on the right, so the footer stays short. It shows resting energy on step 6, adds daily movement after it, then a training day's exercise energy once the days and the kind are known. Each value comes from the engine with the goal held at maintain, so it is the same number the breakdown later shows. It never appears before screening is answered and the weight is known, and never shows a number beside an answer. Not violet, not green; announced politely to screen readers.

**Building your plan** (U1a, the owner's call over O1's "no fake wait"; O2 rebuilt it as the show it is named for). After the last question's Continue, about 4 seconds: a 176 ring on the sky fills as a percent counts up in it, five rows tick off one a beat (640 ms) as the percent reaches each fifth, naming work the engine does for the plan ("Energy you use each day", "Targets for training days" or, with no training, "One target for every day", "Protein for this goal", "A pace inside the safe limits", "The source behind each number"), each tick with a haptic. Then the ring becomes a violet check, the title changes to "Your plan is ready", and Your plan follows. It plays once a visit: going back and returning shows Your plan at once. **It plays under reduced motion too** (O2, the owner asked to see it): the wait's pacing is not motion and a number changing is text; the pop, the slide and the blur are collapsed by the global rule.

**Your plan.** Computed before Building your plan shows.
- Any doctor card first (BMI under 16).
- Hero: the training day target in Hero style, counting up from **zero** over `--d-reveal` (1.4 s, ease out), "kcal on training days", and beneath it "2,220 on rest days". In even mode, one number. Beneath the panel, three grey stat tiles as Today's (O2): Protein, Carbs and Fat in grams, each counting up from zero 150 ms after the one before. A pace tapped later re-counts over 400 ms. The counts play under reduced motion (text, not motion).
- "Pace" (lose and gain, not for a screening flag): a segmented control of the paces the guardrails allow (Gentle, Steady, Faster, or Lean, Standard, Faster), the default from SCIENCE.md picked. Tapping one recomputes the plan; the hero tweens. Under it: "Expect to gain about 0.3 kg a week. This is a starting estimate. Ontrack corrects it from your results after two weeks." A missing pace has one line saying why (BMI limits; three years of lifting; for gain at BMI 20 or more, "The faster pace is offered below a BMI of 20."). The faster gain pace (F19) adds "A faster gain, with more of it as fat than at the lean pace." and the label "Being checked". Maintain and flagged plans show the sentence alone. Gain weight starts on the faster pace where it is offered. Lose fat and build muscle has no pace control: the sentence, then "The gentle pace with a cut's protein, so muscle can still grow while you lift."
- Under the pace, three disclosures in one card, closed until asked for (R1, the owner: not everything has to be read at once; a chevron that turns, the height and opacity moving over `--d-move`): "Your training" ("4 sessions a week" as its line, inside "Lifting 4 days a week, 60 min each. Edit in Train."), "How this was calculated" (inside: resting energy, daily movement, training today and the goal adjustment, summing to the target, each line opening its source and its status) and "Fine tune" (body fat and "Same target every day").
- "How this was calculated", listing resting energy, daily movement, training today, and the goal adjustment, summing to the target. Each line opens its source and its status (Working assumption, Being checked).
- **Goal weight (R1)**, its own section between the hero and the pace: a row with the goal on the right ("None yet" until set), a chevron and the wheel sheet with Clear; with a goal and a pace, its line says the day the pace reaches it ("About 3 Feb at this pace"). It moves no target.
- Each block below the hero settles in as it scrolls into view, with the landing page's blur and rise (`reveal` and `inview`); without motion it is just there.
- Any flag is explained in one line with the attention colour ("We limited the deficit to 25 percent of your maintenance").
- Primary: "Save this plan", in the capsule beside Back. Signed out, the Caption "Sign in next with Google or an email code. No password needed." ends the page.

**What the answers change after onboarding.**
- Today, first days: a "Getting started" card (its eyebrow, U3; the title is the status, "Two steps to go" then "One step to go", and the line "Your first check-in reads from your meals and weigh-ins.") with three rows: Plan saved (ticked), Log a meal (opens Add), Weigh in tomorrow morning (from the next day it opens the weigh-in). It shows on the plan's first two days, on the phone that saved it, until both are done. No streaks.
- Train: while the program has no exercises listed, a card "Suggested for your week" (its eyebrow, U3) names the template that fits the days, the kind and the experience as its title, "Upper lower 4 days", then "Fits 4 days a week." and who it suits, with "Use this program" and "Not now".
- Add: with no supplements yet, a lifter's entry row reads "Have a shake most days? Set up your tub once, then log it in three taps." The setup lists whey and mass gainer first for a gain goal. Ontrack never recommends a supplement.
- Search: when the phone's languages include Thai, Thai dishes rank first among equal matches, and Describe's example is a Thai meal.

## 5. Sign in

Sheet over the plan, or over the landing page for returning users.
- Title "Save your plan" or "Welcome back". One line: "Your data stays on this phone and backs up to your account."
- "Continue with Google" as a neutral button with the Google mark.
- A hairline with "or", then an email field and "Send code". Then six code boxes with numeric keyboard and auto advance. "Send again" after 30 seconds.
- States: sending, wrong code (shake, clear, "That code did not match"), expired, offline, rate limited.
- Small print linking to Privacy and Terms.

## 6. Today

Matches `/gallery/today`.

1. Header: "Today", sync mark, avatar opening Settings.
2. Week strip (R1). Today is a chip pinned at the right ("Today" over its date, an ink ring while another day is in view); the days before it, eight weeks of them, slide six at a time and lock to their slots when a finger lifts. Each shows its weekday in one letter (M T W T F S S), the date and a dot for an on track day. The three left slots lean left: tapping one slides it to the fourth slot, the middle of the row (as far as the ends allow); tapping Today slides to the newest days and picks today. Days leave under a soft fade before the Today chip. There is no Back to today. Viewing a past day changes the big title to its date with a three-letter day ("Tue, Nov 10").
3. Hero card (D2: OneFin's "Withdraw" card): on its haze panel, calories eaten in Hero style, "of 2,460 kcal", and on the right the counterpart. Under it the track, then "Training day" or "Rest day" as a glass chip on the left and "On track from 2,340" on the right. Below the panel, protein, carbs and fat as three grey stat tiles with small tracks. Tapping the card opens How it is calculated.
4. Cards that appear when relevant, at most one at a time, in this priority: weekly check-in ready, easy adds (gain mode in the evening), nothing logged yet. Each is a status card (U3, DESIGN.md section 7): its subject as an eyebrow, its status as the title, a line saying why, one action. The Getting started checklist left for the bell (R1).
   - **Easy adds** (F10, M9a): with a gain goal, after 18:00, while more than 25 percent of the day's target is left and the day is not finished. Title "620 kcal to go", line "These three cover it, about a third each." Three rows: the food, its grams as the caption, and "Add 210 kcal" (a small button) that logs it at once with an undo toast. The foods are the user's own calorie dense foods from recent meals first, then peanut butter, trail mix and a granola bar; oils never.
   - **Nothing logged yet** (F23): from the set time (13:00 by default) on a day with nothing logged. "Nothing logged yet today", "Log a meal with the plus button", and "Add a meal" opening the Add sheet.
4c. **Workout (R1, from Bevel).** A strength or circuit session whose program lists exercises shows **Start** instead of Done in its row (Mark done moves to the row's menu); a session with none keeps Done. Start opens the **Workout** sheet over the day: a clock (m:ss, h:mm:ss past an hour), then a card per exercise (its name, "3 sets of 6 to 8" and its primary muscles) with a row per set: the set number, kg (lb in imperial) and reps as typed fields that start from the last logged workout of that exercise (or empty and the top of the rep range), and a tick. Ticking a set buzzes and starts a rest bar over **Finish workout**: "Rest 2:00", -15, +15 and Skip, a buzz at zero; the clock follows timestamps. Add set copies the last row. Finish workout (needs a ticked set) goes to **How was it?**, ten chips 1 to 10 with a word under the pick (Very light, Light, Moderate, Hard, Very hard, All out), Save or Skip, then **Workout saved**: time, sets, reps and total lifted, and "New bests" for any lift heavier than before. Closing the sheet with sets ticked saves them (Undo in a toast); with none, nothing is kept. The row then says Done with its sets ("Done | 12 sets"). The sets ride on the day's session log (`slog.workout`, kg always), so no new collection.
4b. **To do (R1), one card.** What a lifter has left to do each day is one card, not two: eyebrow "To do", then the training rows (section 8 of the day: Start or Done, the row menu) and, under a hairline, the **weigh-in** row: a scale tile, the weight in the day's units with "Weighed in" and Edit, or "Time for a new one" ("Time for your first") with "Last one 4 days ago." and "Weigh in" opening the wheel; a past day with none says "No weigh-in". Reading order on Today: how am I doing (the hero), what is left (To do), what did I eat (Meals).
5. Training, inside To do (above).
6. "Meals" heading with the count, then the list, newest first. Each row opens the Meal sheet. Swipe left to delete as in iOS Mail (U1c, DESIGN.md section 10 rule 4): a short swipe leaves the row open on a red Delete button, a long one past half the row deletes; either way an undo toast follows.
   - A supplement with calories (N2, F21) is a row like a meal: the shaker tile, its name, "07:30, 2 scoops with milk", and its calories. An entry logged on typical values ends its caption with the source label Typical (B1).
   - A scanned product (B1, F22) is a row with the barcode tile, the product's name, "12:40, Open Food Facts" (or Label, or Yours), and its calories. It opens the Meal sheet, like any meal. The row opens the Supplement sheet's amount step in edit mode; swipe left deletes it with an undo toast, "Whey protein deleted".
   - Supplements with no calories (creatine) are not rows and show no 0 kcal. At the end of the card, under a hairline, the word "Taken" in Caption and one chip per supplement taken that day, a check before its name. A chip opens the same edit step. The count beside the heading counts rows only.
7. At the end of the list after 20:00, and on any past day, a plain button: "Finish day". It marks the day complete for the check-in (SCIENCE.md section 10) and turns into the line "Day finished. It counts toward your check-in." with a plain "Reopen". A finished day shows no easy adds or nothing logged card.

Counterpart on the right of the hero, by goal: gain shows "620 to go" until the zone, then "On track". Lose and maintain show "620 left" until the zone, then "On track". Past the zone all goals show "240 over" in plain ink.

States: first day (hero at zero, a row saying "Log your first meal with the plus button"), no plan (cannot happen after onboarding, guard anyway), offline (everything works, sync mark hollow).

## 7. Add flow

**Add sheet** from the plus button. R1, rebuilt from how often each way is used: re-logging what you usually eat comes right under the field, the supplements row only for people who use them.
- **The composer (Alma's, BitePal's and Cal AI's patterns), on the landing page's sky:** "What did you eat?", a pill field ("Two eggs, toast with butter and a latte", opening Describe) with a mic that opens Describe already listening, and under it four round actions: **Photo** (the ink one), Scan, Search, Quick add, the others as the landing's liquid glass.
- **Supplements** (N2, F21): for people who have set one up, rows under the composer; without, a single row "Supplements" at the foot of the sheet.
- **Recent and Saved are one list with a switch** (BitePal's clock and bookmark): Recent first; Saved shows five, then "All N saved meals".
The older description below still applies to the rows. Its groups (Supplements, Recent, Saved) are labelled with eyebrows, since the sheet's title is its one heading (U3).
- "Supplements" (N2, F21), first when the user has any: one row per supplement, by name, with the shaker tile, the last amount as its caption ("2 scoops with milk", or "1 scoop" with no calories) and the calories of that amount on the right (none for a supplement with no calories). A row opens the Supplement sheet's amount step. Under the rows a plain "Add a supplement".
- The ways to log (B1 added Scan): "Photo" first, the full width violet featured card (the sheet's main way), then four quiet tiles in a two by two grid: "Scan" ("Barcode on the pack", B1, F22), "Search", "Describe", "Quick add".
- With no supplements yet: under the tiles, one row, the shaker tile, "Supplements", caption "Set up once, log by the scoop", and a chevron. It opens the Supplement sheet's first step.
- "Recent": the last five distinct meals as rows with a trailing plus that logs them again at once, with an undo toast. Logged supplements are not repeated here: they sit at the top.
- "Saved" (R1): saved meals in the same form, the three most used; with more, a row "All 7 saved meals" opens **Saved meals**, a sheet over Add listing every one by use, a + logging it on the day in view with Undo, a swipe left deleting it with Undo. A meal is saved from the **bookmark button on the Meal sheet** ("Save meal", filled and "Saved" once it is; a second tap takes it out again, with Undo) or the Save meal switch in Review.

**One camera (R1).** In the Scan sheet's viewfinder a three-way switch, Barcode (the default), Meal and Label, changes what the camera is for without leaving it. Barcode reads by itself and has no shutter; Meal has no guide frame and the line "Frame the whole plate."; Label has a tall frame and "Fill the frame with the label.". Meal and Label show **Take photo**, which keeps the frame on screen as a JPEG, stops the camera and, after the first-photo notice if it has not been accepted, sends a meal to Review or reads a label as "Photograph the label" does. The Add sheet's Photo tile still opens the system camera.

**Photo.** The tile opens the camera directly. First use shows one screen before the camera: "Your photo is sent to Google's Gemini to identify the food, then discarded. Ontrack keeps only a small thumbnail." with "Continue" and "Not now".
After capture: the Review sheet opens immediately with the photo at the top under a sweeping lavender band, skeleton rows, and the wait in words, one step every 1.6 s: "Looking at your meal" ("Reading what you wrote" for Describe), "Finding each food", "Estimating the grams", "Looking up the food table", the last held until the answer (U1c).

**Review sheet.**
- **Time (R1, as Bevel's Date row).** Beside the name, a time field, starting from now on today and from the current time on another day; the meal is logged at it, so a meal eaten earlier is logged when it was eaten.
- **Something off? (R1, the owner's AI fix).** Under the items, a field ("It was brown rice, 2 eggs") and a Fix button. The photo, or the description, is read again together with the sentence (sent as the request's `hint`, or appended to the words as a correction), and the items, grams and numbers come back new, still from the food table where there is a match; a second sentence adds to the first. The estimate waits in words again while it runs. It counts toward the day's analyses.
- The photo, full width, radius 24. The title, editable.
- One row per item: name, grams with a stepper, calories, and the source label (Database, Estimate, or Yours). Tapping a row expands it: portion chips (Half, Same, One and a half, Double), protein, carbs and fat, "Replace" opening Search, "Correct", "Remove".
- "Correct" (N1, F15) shows calories, protein, carbs and fat as labelled rows of typed steppers in one column, and "Ontrack remembers your numbers for this food." The item then reads Yours. Saving the meal remembers the numbers per 100 g for that food; the next photo, description or search of it uses them.
- An item that reads Yours, opened, offers a plain "Use default values": the table's or the model's numbers come back at the same grams and the remembered ones are forgotten.
- If any item is flagged for hidden fat: a control "Cooked with oil?" with None, 1 tsp, 1 tbsp.
- "Add an item" opening Search.
- Pinned at the bottom: totals for calories and protein, a "Save meal" toggle, and the primary button "Add 720 kcal".
- Errors replace the skeleton with a message and two buttons: "Try again" and "Add by hand". Not food: "We could not find food in that photo". Limit: "You have used today's 40 photo analyses. Search and quick add still work". Offline: "Photo analysis needs a connection".

**Search.** A field with focus, results as rows with kcal per default portion. Thai script finds Thai foods. Tapping a result opens a portion step, with a back chevron to the results: calories in Display, macros, the source label, portion chips from the table, grams on a stepper of 10 whose number can be typed, the table's citation ("Values from SG FoodID, Health Promotion Board, Singapore, read on 12 November 2026. Terms of use"; for a food read from a Thai FCD page, "Values from Thai Food Composition Database, INMU, Mahidol University, read on 12 November 2026. Source page", linking to that page), "Add". A food with remembered numbers shows them, labelled Yours, with "Use default values" above the chips and no citation. With an empty field, show Recent foods.

**Describe.** A text area: "What did you eat?" with the hint "Two eggs, toast with butter and a latte". "Analyse" leads to the same Review sheet without a photo. R1: where the browser has speech recognition (Safari does), a Speak button beside the label turns speech into the sentence, to be read and fixed before it is sent; it becomes Stop while listening. Nowhere else is it shown. The browser, not Ontrack, hears the audio.

**Quick add.** Calories typed on the number pad, in Display, focused on open. Optional protein, carbs and fat as three small fields on the decimal pad, optional name. "Add".

**Meal sheet** for a logged meal: the Review layout in edit mode, with the time editable, "Save changes", "Save as a meal", "Delete".

**Scan sheet** (B1, F22). Packaged food logged exactly from its barcode. One sheet with steps and a back chevron between them. The common case: plus, Scan, hold the pack up (it reads by itself), Add. Three taps, and the camera does the rest.

1. **Camera.** Title "Scan a barcode". The rear camera opens at once in a dark viewfinder the width of the content, 4 by 3, radius 24, with a wide framing guide drawn in white and the area outside it dimmed by the scrim. Under it: "Hold the barcode inside the frame. It reads by itself." A 44 icon button for the light sits on the viewfinder's lower right corner, only where the camera can light, "Turn on the light" and "Turn off the light". Then a neutral "Type the number" button.
   - Reads EAN-13, EAN-8, UPC-A and UPC-E, checks the check digit, and moves on with a light haptic. Chrome's own `BarcodeDetector` reads where it exists; Safari loads a WebAssembly reader the first time the camera opens, a skeleton viewfinder with "Starting the camera" meanwhile.
   - After 8 seconds without a read, a line replaces the caption: "Still looking. Move closer, hold steady, or type the number."
   - The camera stops whenever the step changes or the sheet closes.
2. **Type the number.** A text field on the number pad, label "Barcode number", hint "The 8 or 13 digits under the bars", focused, and right under it the primary "Find product" (the number pad has no return key, so the button sits by the field rather than pinned under the keyboard). Back returns to the camera. Digits that do not make a barcode (wrong length or check digit), in the attention colour: "Those digits do not make a barcode. Check them against the pack." Reached from "Type the number", or at once when the camera cannot open, under the reason:
   - Denied: "Camera access is off for Ontrack. Type the number, or allow the camera for this site in your browser's settings."
   - No camera, a page that is not secure, or no camera support: "This browser cannot open a camera here. Type the number instead."
   - Camera in use: "Another app is using the camera. Close it and try again, or type the number." with a neutral "Try again".
   - The reader did not load (offline before the first scan): "The scanner needs a connection the first time. Type the number instead."
3. **Finding.** Skeleton rows in the product step's layout with "Finding the product". Products this user saved come first, at once and offline too; then Open Food Facts.
4. **Product.** Title: the product's name. From top to bottom:
   - The brand in Caption when known.
   - Calories for the amount in Display with "kcal", "8.6 g protein, 54.4 g carbs, 17.6 g fat" under it, then the source label: Open Food Facts, Label (read from the photo and confirmed) or Yours (numbers the user typed or changed).
   - Chips: "1 serving" (when the serving is known), "Whole pack" (when known and different), "100 g" (or "100 ml").
   - The amount on a typed stepper of 10, in g or ml as the product is measured, starting at the last amount logged for it, else one serving, else the pack, else 100.
   - A plain "Correct the numbers", which opens the Label step with this product's numbers; saving makes them Yours.
   - With Open Food Facts numbers, its credit in Caption: "Values from Open Food Facts, open data under the ODbL." and "Terms of use".
   - Pinned: primary "Add 260 kcal". The sheet closes, Today updates, the toast "Added Mama tom yum" offers Undo. The product is kept in the user's products, so the next scan is instant and works offline.
5. **New product.** Title "New product". Not in Open Food Facts: "This barcode is not in Open Food Facts yet. Photograph the nutrition label and Ontrack keeps it for your next scan." In Open Food Facts without nutrition: "Open Food Facts has this product without its nutrition. Photograph the label and Ontrack keeps it for your next scan." Then "Barcode 8850999220017" in Caption, a plain "Type the numbers instead", and pinned primary "Photograph the label", which opens the camera for one photo.
   - The first photo of a label, like the first meal photo, shows the photo notice first: "Your photo of the label is sent to Google's Gemini to read its numbers, then discarded. Ontrack keeps only the numbers." with "Continue" and "Not now". One notice covers both.
6. **Lookup failed.** Offline: "Finding a new product needs a connection. Products you scanned before work offline." Open Food Facts slow or down: "Open Food Facts did not answer. Try again, or type the numbers from the label." Each with a neutral "Try again" and a plain "Type the numbers instead".
7. **Reading the label.** Skeleton rows with "Reading the label". It reads only what is printed: per serving and per 100 g when printed, and the serving size; it never estimates. Errors replace the skeleton, each with a neutral "Try again" (another photo) and a plain "Type the numbers instead": not a label, "We could not read a nutrition label in that photo. Take it straight on and close enough to read."; limit, "You have used today's 40 photo analyses. You can still type the numbers."; offline, "Reading a label needs a connection. You can still type the numbers."; failed, "Could not read the label. Try again or type the numbers."
8. **Label.** Title "Check the label" ("Correct the numbers" from the product step). One column, as in Correct:
   - "Name", a text field (from the label or Open Food Facts; empty with the hint "Name on the pack").
   - "Serving" in g or ml on a typed stepper, from the label; a label that prints only per 100 g starts at 100.
   - Eyebrow "In one serving", then calories, protein, carbs and fat as labelled rows of typed steppers in one column.
   - "Check each number against the pack." in Caption.
   - Errors, in the attention colour, Save disabled: protein, carbs and fat weigh more than the serving, "Protein, carbs and fat add up to more than the serving. Check the label."; values with no serving, "Add the serving size from the label." An empty name disables Save without a message.
   - Pinned: primary "Save product" ("Save changes" when correcting). The product is saved under its barcode, labelled Label when the read numbers were kept and Yours when any was typed or changed, and the Product step follows.

**Supplement sheet** (N2, F21). One sheet with three steps, a back chevron between them. Ontrack logs what the user takes; it never suggests a supplement or an amount.

The common case, the morning shake: plus, the Whey row, Add. Three taps when the amount is the last one used; one more on the stepper when it is not. Everything sits in the lower half of the sheet, in thumb reach, and the main action is pinned at the bottom.

1. **Kind**, from "Add a supplement". Title "Add a supplement". Six rows with a chevron, each one tap: "Whey protein", "Plant protein", "Casein", "Mass gainer", "Creatine" and "Something else", each captioned "Set from your tub's label". Under them, in Caption: "Ontrack logs what you take. It does not recommend supplements or amounts."
2. **From your tub** (owner, during B1: brands differ a lot, so the setup leads with the user's own tub). Title: the kind's name; back returns to Kind. "Brands differ a lot. Copy your tub's numbers in seconds." Two tiles side by side, as on the Add sheet: "Scan the tub" (the violet featured card, line "Barcode on the tub") and "Photograph the label" (quiet, line "Nutrition panel"). Under them a plain "Use typical values for now" for whey and plant protein (USDA's average), or "Type the numbers" for the others.
   - Scan the tub: the Scan sheet's camera and typing, with its states. A product found in the user's products or Open Food Facts fills the Label step with its serving, the values in it, and the scoops in it read from the serving text ("2 scoops (60 g)"). Not found or without nutrition: "This tub is not in Open Food Facts yet. Photograph its label instead." with pinned primary "Photograph the label" and a plain "Type the numbers". Offline: "Finding it needs a connection. Type the numbers, or use typical values for now."
   - Photograph the label: "Reading the label", then the Label step filled with the serving as printed, a mass gainer's "4 scoops (165 g)" included. Errors as in the Scan sheet's step 7, with "Try again" and "Type the numbers".
3. **Label.** Title: the kind's name; back returns to From your tub. From top to bottom:
   - "Name", a text field filled with the kind's name ("Something else" starts empty, with the hint "Name on the tub").
   - The label as printed (owner's call after N2, built in O1): "Serving" in grams on a typed stepper, then "Scoops in a serving" in half steps from 1 (mass gainer tubs list several). A preset from the table starts at the table's scoop (whey 30 g, plant 45 g) as one serving of one scoop; the others at 0, which means not known.
   - Eyebrow "In one serving", then calories, protein, carbs and fat as labelled rows of typed steppers in one column, as in Correct: the "per serving" column copied as printed. A preset from the table starts at its values per 100 g scaled to the serving, and follows the serving until a value is changed. The others start at 0. Nobody is asked for a value per 100 g. Ontrack keeps the scoop and the values in one scoop (the serving divided by its scoops); editing later shows them as a serving of one scoop.
   - The zero calorie case, live, when the calories are 0: "No calories, so Today shows it as taken."
   - Error, in the attention colour, Save disabled: protein, carbs and fat weigh more than a known serving, "Protein, carbs and fat add up to more than the serving. Check the label." An empty name disables Save without a message; the field's hint says what goes there.
   - One line on where the numbers came from: typical values, "Brands differ, so the label on your tub is more accurate than this average from USDA FoodData Central, SR Legacy."; scanned, "From Open Food Facts. Check them against your tub."; read from a photo, "Read from your tub's label. Check each number."; otherwise "Copy the numbers from the label on your tub."
   - "Scoops you take" on a typed stepper in half steps, starting at 1: the user's own amount, the first one logged, so the common case needs no change on the amount step.
   - Pinned: primary "Save supplement". Saving shows the amount step for it. Saved with the typical values untouched, the supplement is Typical until it is set from the tub; any value changed, scanned or read makes it the user's own.
   - Opened from the amount step's "Edit supplement": the title is the supplement's name, the values and scoops are its own, the primary reads "Save changes" and goes back to the amount step, and a danger "Remove supplement" closes the sheet with an undo toast, "Whey protein removed". Meals already logged keep their numbers.
4. **Amount.** Title: the supplement's name.
   - Calories for the chosen amount in Display with "kcal", and under it "48 g protein, 6 g carbs, 3 g fat", both changing as the amount does.
   - "Scoops" on a typed stepper in half steps, from 0.5 to 10, starting at the last amount used (the scoops the user takes, the first time).
   - "Mixed with": chips, Water first, then the milks from the food table under short names ("Whole milk", "2% milk", "Skim milk", "Soy milk", "Almond milk"), starting at the last mix. A milk shows "Milk" in millilitres on a stepper of 50 (owner's call after N2), starting at the last amount or a 250 ml glass, and is kept in grams through the milk's own cup in the table (USDA: a cup of whole milk, 236.6 ml, weighs 244 g); its calories join the total and its row on Today reads Database. The milk values come from the food table, through the user's remembered numbers (F15) when there are any.
   - A supplement on typical values says so (B1): the source label "Typical" under the macros, and beside it a quiet plain "Set it from your tub", which opens From your tub; saving from there clears Typical, and the line is gone. The Add sheet's row ends its caption with "Typical" too. Nothing else nudges.
   - A plain "Edit supplement".
   - Pinned: primary "Add 240 kcal". The sheet closes, Today updates, and the toast "Added Whey protein" offers Undo, which also puts back the last amount.
   - No calories: no Display figure and no mix. The line "No calories, so Today shows it as taken." sits over the Scoops stepper, and the primary reads "Log as taken". The toast says "Creatine taken".
   - Edit mode, from a row or a chip on Today: the logged amount and mix, primary "Save changes" (toast "Changes saved"), and at the end a danger "Delete" with an undo toast. No "Edit supplement" here. Saving uses the supplement's current label, so a corrected label also corrects the entry. Correcting an entry leaves the next start, the last amount logged, alone.
   - States: the milk values not loaded (offline before the food table was cached) leave Water and say "The milk values did not load. Water still works."; a supplement removed on another device closes the sheet, and its logged entries open in the Meal sheet instead. Offline, everything works and syncs later.

## 8. Train

R1, rebuilt from what a lifter opens Train to do, in this order: 1. what is next and can I start (and am I on track this week), 2. the week, 3. the program in one row, 4. the analysis, collapsed.

1. Header: "Train".
2. **Up next** (the big card, the feature gradient; the owner's brief, Nike Training Club's next workout): eyebrow "Today" or the weekday, the session's name, "Strength | 70 min | 5 exercises", and the one action: **Start** when it is today and lists exercises (the Workout sheet), Done when it has none, otherwise "View session". Under a hairline, this week as a pill for each planned session, ticked once done, and "1 of 4 this week" (Fitbit's weekly goal). With no program, choosing one comes first.
3. The conditional cards: Suggested for your week (section 4), and the lifting experience question.
4. "Your week", Monday to Sunday: each day is a row with its sessions (name, type, minutes) or "Rest". Today is marked. Tapping a day opens the Session sheet. A session row can be dragged to another day by its handle.
5. **Program**, compact: the program name as an eyebrow, "4 sessions a week | 280 minutes a week", under a hairline "Adds 137 kcal a day" and a small "Change program" opening Templates; a change made today shows "Targets follow it from tomorrow." in Caption.
6. "Analysis" heading, then: Muscle balance (a disclosure, closed: "3 of 10 muscles at 10 to 20 sets a week"; inside, "Below the range" then "In the range"), Suggestions (up to three, each with Why; with none, a green check and "Nothing to change."), Cardio (minutes this week against 150 to 300), and Lifting and cardio when a day has both.
7. With a program that has no exercises: the muscle card is replaced by "List your exercises to see muscle balance" and a button.

**Session sheet.** Name, type as chips, minutes with a stepper in fives, intensity as a three way segmented control with one line describing each level, the calories this session adds, the exercise list with sets and reps steppers, "Add exercise", "Delete session".
**Exercise picker.** Search field, muscle chips, rows with primary muscles as a caption.
**Templates.** Six cards, each (U3): the days per week as its eyebrow, the name as its title, who it suits, and the muscle balance it produces. The two that mix lifting and cardio (Full body and cardio 3 days, Upper lower and cardio 5 days) add their cardio minutes a week against 150 to 300. "Use this program" replaces the current one after a confirm.

## 9. Progress

R1, rebuilt from what a lifter asks of Progress, in this order: 1. am I moving toward my goal, 2. am I eating and training consistently, 3. am I getting stronger, 4. detail for the curious.

1. Header: "Progress". A segmented control: 4 weeks, 3 months, All.
2. **Weight, the hero** (OneFin's stats card): on its haze panel the current trend weight in Display with lighter decimals, "trend" as its caption, what the trend moved over 7 and 30 days when there is data that far back, "0.3 percent a week | Target 0.5", and **Goal weight** (BitePal's and Fitbit's goal inside the weight card): the goal on the right ("Set" until there is one) with a chevron opening the wheel (Clear removes it), the day the pace reaches it ("About 3 Feb at this pace", "Reached" once it has) and a track from the first weigh-in to the goal. Below the panel the chart (weigh-ins as dots, the trend as a line, the target rate as a faint band) and a neutral "Log weight".
3. **At a glance** (Cal AI's top tiles, on the landing page's washes): three tiles, on track days of the last four weeks, sessions done of planned, average intake; a tap jumps to its card. A tile with no data is not shown.
4. **Intake**: the weekly average in Display, bars per week with the target as a line, and under a hairline the average protein against its target.
5. **Training** (PRD F20): sessions done in Display with "of 16 planned sessions done"; under a hairline **this week** as a pill for each planned session, ticked once done; bars for sessions done each week with what was planned as a line; two rows with a small track: "Strength sessions", "Cardio".
6. **Best lifts** (WHOOP's personal records), once a workout has sets: the heaviest weight and reps per exercise, the five most recent.
7. **Consistency**: the on track days of the last four weeks in Display, and "Week by week" behind a chevron (four rows of seven dots).
8. **Maintenance**, once measured, behind a chevron: "2,220 kcal a day, measured" as its line; inside, the measured number beside the formula's.
9. "Check-ins" list: date, the change made or kept, opening the stored check-in, with a chevron. "History" opens a month list where any day opens in the Today view.

Empty states say what is needed: "Weigh in on 8 days across two weeks to see your trend and get your first check-in". With no program, the training card says "Plan your week on Train to see your sessions here" with a button "Plan your week" that opens Train.

**Weigh in sheet.** A wheel in the user's unit (whole and tenths) starting at the last weigh-in, the hint "One a day. A new one replaces it.", "Save 82.4 kg".

## 10. Check-in

Opens from the card on Today or from Progress. Three steps in one sheet, each with a single "Next".

1. **Your last three weeks.** Rate of change in Display against the target rate. Average intake against average target. Days logged and weigh-ins, as plain counts.
2. **What it means.** One sentence chosen by the reason, and the measured maintenance when available.
   - on track: "You are gaining at the pace you chose. No change needed."
   - raise: "You are gaining slower than planned while eating to your target. Your body uses more than we estimated."
   - lower: the mirror of raise.
   - adherence: "Your target looks right. You averaged 310 under it. Reaching it comes first."
   - need data: "We need a few more weigh-ins to be sure. Keep going and we will check again next week."
3. **Next.** The proposal in Display: "Raise to 2,560 on training days and 2,320 on rest days". Primary: "Use the new target". Plain: "Keep my current target". For on track, adherence and need data there is a single "Done".

## 11. Settings

A sheet from the avatar (M9a), the rows on the sheet itself in groups, each under an eyebrow (U3, as the Friends panel's groups). A switch, a segmented choice or a time sits in its row and saves on the tap, so most settings take one tap; only edits that need room open a page inside the sheet (a back chevron returns). Nothing advances on its own: picking a choice on a page selects it, and the page's pinned action, or Back, finishes.

- **You:** Profile (page), Goal and pace (page), Units as a segmented control (Metric, Imperial).
  - **Profile page:** sex for the equation, then birth year, height and body fat (rows that open the wheel sheet; body fat has Clear; imperial height is one wheel of inches), daily movement and lifting experience, each choice as rows with a check (the onboarding words, too long for a segmented control). Under them the new target, "From tomorrow: 2,460 kcal on training days, 2,240 on rest days" (or "2,300 kcal every day"), and the pinned "Use the new target", disabled until something changed. A change that moves no number saves with "Save changes".
  - **Goal and pace page:** the goal (Lose fat, Maintain, Build muscle; the guardrails of section 4 decide which show, and a screening answer leaves "Your plan keeps your weight steady" instead), the pace for it as a segmented control with its line ("About 0.3 kg a week"; the faster gain pace adds "A faster gain, with more of it as fat" and Being checked). A faster gain pace chosen earlier stays offered while it is the plan's, so stepping down is one tap. The same new target line and pinned action as Profile.
- **Targets:** "Same target every day" (a switch; off, training days get more), Check-in day (a row with the day, opening a page of seven rows with a check), How it is calculated (opens the breakdown for the day in view).
- **Reminders** (F23), with the line "Cards on Today when you open Ontrack. No notifications.": Nothing logged yet (a switch, and when on a Time row, 13:00 by default), No weigh-in for 3 days, Check-in due, Evening easy adds (caption "From 18:00 when gaining"). All on by default. Off hides the card on Today; the check-in stays on Progress.
- **Food:** "Thai dishes first" (a switch; caption "In search results". It starts on when the phone's languages include Thai).
- **Display:** theme (System, Light, Dark) as a segmented control, and text size (System, Default, Large, Larger) as rows with a check, since four do not fit a segmented control at the largest text on the SE.
- **Data:** Export all data (caption "Every record, as JSON"), Export meals (caption "One line per food, as CSV"), each through the share sheet or a download. Backup: its state as the caption and "Sync now" beside it while changes wait.
- **About:** The science (page), Privacy and Terms (open the pages in `public/` in a new tab), Report a problem (an email with the version and device filled in), and the version as a caption.
- **Account:** email, Profile for friends (opens the friends profile, S1b), Sign out, and Delete account as a quiet danger link opening its page (typed confirmation, in the danger style).

**The science** (page): a line saying where the numbers come from, then each group of `src/lib/data/science.ts` under an eyebrow (U3), one row per constant: its plain name, and as its caption its value with the unit (a constant with several values lists them, one per line, when opened), the source's short name and its status, each on its own line (no two facts joined by a comma) (Verified, Working assumption, Being checked). A row opens its full citation in place. Then the food tables, each credited (INMU's Thai FCD, SG FoodID with its terms link, USDA SR Legacy and FNDDS, Open Food Facts under ODbL).
**How it is calculated** is the plan breakdown for the day being viewed.

States: offline (exports and every setting work; Sync now waits and the backup caption says offline), nothing to export (the files still hold the profile and plan), a failed share (the file downloads instead).

## 12. System states

- **Offline:** the sync mark is hollow. Nothing else changes except analysis, which explains itself.
- **Update ready:** a toast, "A new version is ready", with "Update".
- **Session expired:** a card on Today, "Sign in again to keep backing up", that opens the sign in sheet. Local data is untouched.
- **Storage refused or full:** a blocking message explaining that Ontrack cannot save on this device, with export if anything is in memory.
- **First load on a new device after sign in:** a skeleton of Today with "Bringing your data over".
- **Every destructive action:** an undo toast when it can be undone, a confirm sheet when it cannot.

## 13. Friends and the food map

PRD F16 and F17 (S1): friends by request, an optional program on the profile, and meal photos on a map where they were taken. Strava's friends and Instagram's story map in Ontrack's look. Friends see a shared meal's photo, title, its own calories and macros, the place rounded to about 100 m and the time, and the program while its switch is on. Never a weight, a target, a day's total, a streak or a ranking (PRD section 7). Words get the tap without guilt: nothing says "you have no friends" or "don't miss out".

**Where it lives.** A 44 round map button in the header, left of the avatar, on every tab once signed in. One tap opens the food map full screen over the tab and the dock; Back returns to the tab. A violet badge on the button counts friend requests waiting ("2 friend requests" to assistive tech). The dock keeps three tabs and the plus. Why: `docs/DECISIONS.md`, S1b.

**Food map.** The common cases: map button, tap a pin (two taps to a friend's meal); map button, the search field, a handle, Add (four taps to a request).
- The map fills the screen: MapLibre GL JS with OpenFreeMap's Positron style in light and its Dark style in dark, quiet grey grounds so the photos carry the colour. The attribution sits at the lower right above the panel: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap", MapLibre's own control.
- Top left, a 48 round glass button with a back chevron, "Back". Top right, two stacked 48 round glass buttons: "Go to where I am" (a crosshair) and "Show all shared meals" (four corners), which fits every pin.
- Pins: a shared meal is its photo in a rounded square (56, radius 16) in a white frame with the floating shadow and a short point under it at the place, and the person's avatar (24, a violet ring) on its lower left corner. Pins closer than 48 px on screen merge: the newest leads, and a glass chip under it says "+3 more". Your own pins carry your avatar.
- It opens fitted to every shared meal (newest first, at most 500). With none, a world view over the phone's part of the world (from its time zone), and the panel's line says what will appear.
- A pin opens the meal photo sheet with its meals.
- "Go to where I am" reads the phone's position once and moves the map there, with a small ink dot. Nothing is sent or kept. The first time, before the browser asks, a white card under the buttons: "Ontrack reads where you are once, to move the map there. It is not sent or kept." with "Continue" and "Not now". Refused: the card says "Location is off for Ontrack. Allow it in your browser's settings to use this."
- States, each a white card under the top buttons, the panel still working where it can: no connection, "The map needs a connection. Meals you share go on it when you are back online."; no WebGL, "This browser cannot draw the map. Your friends are still below."; the map or the shared meals did not load, "The map did not load. Check your connection and try again." with "Try again"; the session gone, "Sign in again to see your friends." with "Sign in".

**Friends panel.** A bottom sheet on the map that does not block it: the grabber, then a "Search for friends" field with a search icon. Lowered, it shows only those, plus "2 friend requests" as a plain link when any wait. Tapping the field or the link, or dragging the grabber up, raises it to about three quarters of the screen; dragging it down or tapping the grabber lowers it. Raised, from the top:
1. **You:** your avatar, name and "@handle", opening Your profile. Before you have a profile, instead: "Set up your profile" in Body 600, "Pick a handle so friends can find you." and a neutral "Set up profile".
2. **Requests**, when any: a row per person (avatar, name, "@nan_eats wants to be friends"), a neutral "Accept" and a quiet X, "Decline". Accept toasts "You and Nan are friends"; Decline removes the row.
3. **Friends:** a row per friend (avatar, name, "@handle"), opening the friend sheet. None yet: "Search for a friend's handle to add them. They see the meals you share once they accept."
4. **Sent**, when any: a row per request (avatar, name, "Request sent") with a plain "Withdraw".
- Typing searches handles that start with the text, after a short pause; a leading @ and capitals are ignored, at most 20 people, never you. A result shows where you stand on the right: a neutral "Add", "Requested", a neutral "Accept", or "Friends". Add toasts "Request sent to Nan". Add before you have a profile opens Your profile and sends the request once it is saved. No match: "No one has a handle starting with nan."
- States: loading, three skeleton rows; offline, "Friends need a connection. Meals you share go on the map when you are back online."; failed, "Could not reach your friends." with "Try again". A request refused because the other person removed their profile: toast "That profile is gone".

**Your profile sheet.** Title "Your profile", or "Set up your profile" the first time.
- The photo: a 96 avatar (the name's first letter on lavender when there is none), and beside it a neutral "Add a photo" ("Change photo") that opens the photo library or camera, and a plain "Remove photo" when there is one. The picture is cut to a square and saved without its location.
- "Name", a text field, hint "Your first name", 1 to 40 characters.
- "Handle", a text field with "@" before it, hint "nan_eats", caption "3 to 20 letters, numbers or underscores. Friends find you by it." A changed handle is checked after a pause: "Available", or in the attention colour "That handle is taken. Try another." Other characters: "Use letters, numbers and underscores only." Offline: "Choosing a handle needs a connection. Your name, photo and program switch save offline."
- A switch row, off unless turned on: "Show my program to friends", caption "Friends see your training days and sessions, never your weight or targets."
- Caption: "Anyone signed in to Ontrack can find your handle, name and photo. Only friends see what you share."
- Pinned primary "Save profile", disabled until the name and handle are valid and the handle is free. Toast "Profile saved". A picture that cannot be read: "That picture could not be read. Try another."

**Friend sheet.** Title: the friend's name.
- A 72 avatar and "@handle".
- Eyebrow "Program". Shown: the program's name when it has one, then a row per training day, the weekday as the title and "Upper A", "Strength" and "60 min" as the caption, apart by small dividers. Not shown: "Nan keeps their program to themselves." Loading: skeleton rows. Offline or failed: "The program needs a connection." or "Could not load the program." with "Try again".
- At the end a danger "Remove friend", which steps to "Remove Nan?" with "You stop seeing each other's shared meals and program. You can send a request again later." and a pinned danger "Remove friend" (no undo: a new request needs their yes). Toast "Nan removed".

**Meal photo sheet** (a pin). Title: the meal's title, or "Shared meal" when it has none.
- The photo, full width, 4 by 3, radius 24. Loading, a skeleton; not uploaded yet, a lavender tile with a camera icon and "The photo is on its way".
- Who and when: a 40 avatar, the name ("You" for yours) and "Today, 12:40", "Yesterday, 12:40" or "Nov 9, 12:40".
- Its nutrition in neutral words: calories in Display with "kcal", then "32 g protein", "70 g carbs" and "18 g fat" apart by small dividers, protein in ink and the rest one step lighter. Nothing about targets or the day.
- A pin with several meals: "2 of 4" between previous and next buttons under the photo.
- Yours: a neutral "Take off the map", at once, toast "Taken off the map".

**Share to map, Review sheet.** For a photo, after the items and Cooked with oil:
- A row "Share to map" with a switch, off for every photo, and the caption "Friends see the photo and its nutrition where it was taken."
- On, with a location in the photo: "Placed where the photo was taken, rounded to about 100 m." Without one, the phone's position, read once. The first time, before the browser asks, the caption is the one sentence "This photo has no location, so Ontrack asks for yours once, rounded to about 100 m and never live." with a neutral "Use my location"; after that the switch asks at once. Reading: "Finding where you are". Then "Placed where you are now, rounded to about 100 m."
- Refused: the switch turns off, and in the attention colour "Location is off for Ontrack. Allow it in your browser's settings to share to the map." Not found: "Could not find where you are." with a neutral "Try again".
- "Add 720 kcal" logs the meal with its place, waiting for a position still being read. Offline it is saved and goes on the map when it syncs.

**Share to map, Meal sheet.** For a logged meal with a photo, a row "On the map" with a switch under the items. The original photo is not kept, so turning it on uses where the phone is now, read once as above: "Placed where you are now, rounded to about 100 m." It acts at once, without Save changes: toast "Shared to the map" or "Taken off the map".
