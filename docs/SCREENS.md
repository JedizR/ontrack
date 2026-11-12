# Ontrack: screens and flows

Each screen lists what it contains from top to bottom, its states, and its words. Layout values come from `docs/DESIGN.md`. `/gallery/today` is the worked example of how a spec here becomes a screen. Strings shown are the seed for `src/lib/i18n/en.ts`.

## 1. Map

~~~
First run:  Welcome > Onboarding (9 steps) > Your plan > Sign in > Today
Returning:  Welcome > Sign in > Today

Tabs:       Today | Train | Progress           Dock: plus button opens Add
Sheets:     Add, Review, Search, Describe, Quick add, Meal, Supplement, Weigh in, How it is calculated,
            Session, Exercise picker, Templates, Check-in, Settings and its pages
~~~

## 2. Shell

- Header, content, dock. The header title is the tab name, or the date when viewing a past day.
- Swipe left and right moves between tabs with the watermelon behaviour. Sheets and horizontal scrollers do not trigger it.
- The dock hides while the keyboard is up and while a sheet is open.
- On screens wider than 480 px the app is a centred column.

## 3. Welcome

The first screen in a browser that is signed out. Ontrack runs in the browser tab; nothing mentions installing. (L1's landing page replaces Welcome for visitors later.)

**Welcome.**
- On the brand gradient: the wordmark (D2: the frozen ONTRACK file), then "Eat for the body you are training for." in Title, "you are training for." in violet.
- Three short lines, each one sentence beside a violet icon tile: a target built from how you train, a photo to log a meal, a weekly correction from your own results.
- Primary: "Get started". Plain: "I already have an account".

## 4. Onboarding

Full height flow. A thin track at the top shows progress. Back is top left. One question per screen, the question in Title and its caption in Lead, the answers filling the middle of the screen, one primary button "Continue" pinned to the bottom, disabled until answered. Single choice screens advance on tap.

| Step | Question | Control | Notes |
| --- | --- | --- | --- |
| 1 | What are you working toward? | Three large choices: Build muscle, Lose fat, Maintain | Each with a one line description |
| 2 | Before we set any numbers | Checklist: pregnant or breastfeeding, a medical condition or medication that affects diet, a current or past eating disorder. And "None of these" | Follows the PRD guardrails. Any tick leads to a calm advisory screen before continuing or exiting |
| 3 | Which equation should we use? | Male, Female, Prefer not to say | Caption: "Energy equations differ by sex. This is only used for the calculation" |
| 4 | What year were you born? | A wheel starting at this year minus 30. Tapping the selected row types it | Under 18 ends here with a kind message |
| 5 | Height and weight | A units switch, then two wheels side by side: height (cm, or feet and inches) and weight (whole and tenths), starting at 170 cm and 70 kg | Weight becomes the first weigh-in |
| 6 | Outside of workouts, how much do you move? | Four choices with the step ranges from the science spec | |
| 7 | How do you train? | Days per week stepper, session type, minutes, intensity. Or "Choose a program" opening Templates. Or "I will set this up later" | Creates the program |
| 8 | How long have you trained consistently? | Under a year, 1 to 3 years, Over 3 years | Skipped when there is no strength training |
| 9 | How fast? | The pace options for the goal, each showing its daily calories and weekly change, updating live | Options removed by a guardrail are absent, with one line saying why |

**Your plan.**
- Hero: the training day target in Hero style, "kcal on training days", and beneath it "2,220 on rest days". In even mode, one number.
- Protein in Display with "g protein a day".
- A sentence: "Expect about 0.3 kg a week. This is a starting estimate. Ontrack corrects it from your results after two weeks."
- A card, "How this was calculated", listing resting energy, daily movement, training today, and the goal adjustment, summing to the target. Each line opens its source.
- "Fine tune": body fat percent and goal weight, each opening a wheel sheet with Clear, and same target every day.
- Any flag is explained in one line with the attention colour ("We limited the deficit to 25 percent of your maintenance").
- Primary: "Save my plan".

## 5. Sign in

Sheet over the plan, or over Welcome for returning users.
- Title "Save your plan" or "Welcome back". One line: "Your data stays on this phone and backs up to your account."
- "Continue with Google" as a neutral button with the Google mark.
- A hairline with "or", then an email field and "Send code". Then six code boxes with numeric keyboard and auto advance. "Send again" after 30 seconds.
- States: sending, wrong code (shake, clear, "That code did not match"), expired, offline, rate limited.
- Small print linking to Privacy and Terms.

## 6. Today

Matches `/gallery/today`.

1. Header: "Today", sync mark, avatar opening Settings.
2. Week strip. Tapping a day shows that day. Viewing a past day changes the title to its date and adds a "Back to today" chip.
3. Hero card (D2: OneFin's "Withdraw" card): on its haze panel, calories eaten in Hero style, "of 2,460 kcal", and on the right the counterpart. Under it the track, then "Training day" or "Rest day" as a glass chip on the left and "On track from 2,340" on the right. Below the panel, protein, carbs and fat as three grey stat tiles with small tracks. Tapping the card opens How it is calculated.
4. Cards that appear when relevant, at most one at a time, in this priority: weekly check-in ready, easy adds (gain mode in the evening), weigh-in prompt, update notice.
5. Training card: session name, "Strength, 60 min. Adds 240 kcal", and a "Done" button. After Done: a check mark and "Undo". A long press or the row's menu offers "Skip today". On a rest day: "Rest day" with no button. With no program: "Add your training to sharpen your target".
6. "Meals" heading with the count, then the list, newest first. Each row opens the Meal sheet. Swipe left to delete, with an undo toast.
   - A supplement with calories (N2, F21) is a row like a meal: the shaker tile, its name, "07:30, 2 scoops with milk", and its calories. An entry logged on typical values ends its caption with the source label Typical (B1).
   - A scanned product (B1, F22) is a row with the barcode tile, the product's name, "12:40, Open Food Facts" (or Label, or Yours), and its calories. It opens the Meal sheet, like any meal. The row opens the Supplement sheet's amount step in edit mode; swipe left deletes it with an undo toast, "Whey protein deleted".
   - Supplements with no calories (creatine) are not rows and show no 0 kcal. At the end of the card, under a hairline, the word "Taken" in Caption and one chip per supplement taken that day, a check before its name. A chip opens the same edit step. The count beside the heading counts rows only.
7. At the end of the list after 20:00, a plain button: "Finish day".

Counterpart on the right of the hero, by goal: gain shows "620 to go" until the zone, then "On track". Lose and maintain show "620 left" until the zone, then "On track". Past the zone all goals show "240 over" in plain ink.

States: first day (hero at zero, a row saying "Log your first meal with the plus button"), no plan (cannot happen after onboarding, guard anyway), offline (everything works, sync mark hollow).

## 7. Add flow

**Add sheet** from the plus button.
- "Supplements" (N2, F21), first when the user has any: one row per supplement, by name, with the shaker tile, the last amount as its caption ("2 scoops with milk", or "1 scoop" with no calories) and the calories of that amount on the right (none for a supplement with no calories). A row opens the Supplement sheet's amount step. Under the rows a plain "Add a supplement".
- The ways to log (B1 added Scan): "Photo" first, the full width violet featured card (the sheet's main way), then four quiet tiles in a two by two grid: "Scan" ("Barcode on the pack", B1, F22), "Search", "Describe", "Quick add".
- With no supplements yet: under the tiles, one row, the shaker tile, "Supplements", caption "Set up once, log by the scoop", and a chevron. It opens the Supplement sheet's first step.
- "Recent": the last five distinct meals as rows with a trailing plus that logs them again at once, with an undo toast. Logged supplements are not repeated here: they sit at the top.
- "Saved": saved meals in the same form.

**Photo.** The tile opens the camera directly. First use shows one screen before the camera: "Your photo is sent to Google's Gemini to identify the food, then discarded. Ontrack keeps only a small thumbnail." with "Continue" and "Not now".
After capture: the Review sheet opens immediately with the photo at the top and skeleton rows, and the line "Looking at your meal".

**Review sheet.**
- The photo, full width, radius 24. The title, editable.
- One row per item: name, grams with a stepper, calories, and the source label (Database, Estimate, or Yours). Tapping a row expands it: portion chips (Half, Same, One and a half, Double), protein, carbs and fat, "Replace" opening Search, "Correct", "Remove".
- "Correct" (N1, F15) shows calories, protein, carbs and fat as labelled rows of typed steppers in one column, and "Ontrack remembers your numbers for this food." The item then reads Yours. Saving the meal remembers the numbers per 100 g for that food; the next photo, description or search of it uses them.
- An item that reads Yours, opened, offers a plain "Use default values": the table's or the model's numbers come back at the same grams and the remembered ones are forgotten.
- If any item is flagged for hidden fat: a control "Cooked with oil?" with None, 1 tsp, 1 tbsp.
- "Add an item" opening Search.
- Pinned at the bottom: totals for calories and protein, a "Save meal" toggle, and the primary button "Add 720 kcal".
- Errors replace the skeleton with a message and two buttons: "Try again" and "Add by hand". Not food: "We could not find food in that photo". Limit: "You have used today's 40 photo analyses. Search and quick add still work". Offline: "Photo analysis needs a connection".

**Search.** A field with focus, results as rows with kcal per default portion. Thai script finds Thai foods. Tapping a result opens a portion step, with a back chevron to the results: calories in Display, macros, the source label, portion chips from the table, grams on a stepper of 10 whose number can be typed, the table's citation ("Values from SG FoodID, Health Promotion Board, Singapore, read on 12 November 2026. Terms of use"; for a food read from a Thai FCD page, "Values from Thai Food Composition Database, INMU, Mahidol University, read on 12 November 2026. Source page", linking to that page), "Add". A food with remembered numbers shows them, labelled Yours, with "Use default values" above the chips and no citation. With an empty field, show Recent foods.

**Describe.** A text area: "What did you eat?" with the hint "Two eggs, toast with butter and a latte". "Analyse" leads to the same Review sheet without a photo.

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
   - Scan the tub: the Scan sheet's camera and typing, with its states. A product found in the user's products or Open Food Facts fills the Label step: the scoop is the serving divided by the scoops in it ("2 scoops (60 g)" gives 30 g), and the values per scoop follow the scoop. Not found or without nutrition: "This tub is not in Open Food Facts yet. Photograph its label instead." with pinned primary "Photograph the label" and a plain "Type the numbers". Offline: "Finding it needs a connection. Type the numbers, or use typical values for now."
   - Photograph the label: "Reading the label", then the Label step filled: the scoop is the serving divided by the scoops per serving (a mass gainer's "4 scoops (165 g)" gives 41.3 g), the values per scoop likewise. Errors as in the Scan sheet's step 7, with "Try again" and "Type the numbers".
3. **Label.** Title: the kind's name; back returns to From your tub. From top to bottom:
   - "Name", a text field filled with the kind's name ("Something else" starts empty, with the hint "Name on the tub").
   - "Scoop" in grams on a typed stepper. A preset from the table starts at the table's scoop (whey 30 g, plant 45 g); the others at 0, which means not known.
   - Eyebrow "In one scoop", then calories, protein, carbs and fat as labelled rows of typed steppers in one column, as in Correct. A preset from the table starts at its values per 100 g scaled to the scoop, and follows the scoop until a value is changed. The others start at 0. Nobody is asked for a value per 100 g.
   - The zero calorie case, live, when the calories are 0: "No calories, so Today shows it as taken."
   - Error, in the attention colour, Save disabled: protein, carbs and fat weigh more than a known scoop, "Protein, carbs and fat add up to more than the scoop. Check the label." An empty name disables Save without a message; the field's hint says what goes there.
   - One line on where the numbers came from: typical values, "Brands differ, so the label on your tub is more accurate than this average from USDA FoodData Central, SR Legacy."; scanned, "From Open Food Facts. Check them against your tub."; read from a photo, "Read from your tub's label. Check each number."; otherwise "Copy the numbers from the label on your tub."
   - "Scoops you take" on a typed stepper in half steps, starting at 1: the user's own amount, the first one logged, so the common case needs no change on the amount step.
   - Pinned: primary "Save supplement". Saving shows the amount step for it. Saved with the typical values untouched, the supplement is Typical until it is set from the tub; any value changed, scanned or read makes it the user's own.
   - Opened from the amount step's "Edit supplement": the title is the supplement's name, the values and scoops are its own, the primary reads "Save changes" and goes back to the amount step, and a danger "Remove supplement" closes the sheet with an undo toast, "Whey protein removed". Meals already logged keep their numbers.
4. **Amount.** Title: the supplement's name.
   - Calories for the chosen amount in Display with "kcal", and under it "48 g protein, 6 g carbs, 3 g fat", both changing as the amount does.
   - "Scoops" on a typed stepper in half steps, from 0.5 to 10, starting at the last amount used (the scoops the user takes, the first time).
   - "Mixed with": chips, Water first, then the milks from the food table under short names ("Whole milk", "2% milk", "Skim milk", "Soy milk", "Almond milk"), starting at the last mix. A milk shows "Milk" in grams on a stepper of 50, starting at the last amount or the table's glass (250 g); its calories join the total and its row on Today reads Database. The milk values come from the food table, through the user's remembered numbers (F15) when there are any.
   - A supplement on typical values says so (B1): the source label "Typical" under the macros, and beside it a quiet plain "Set it from your tub", which opens From your tub; saving from there clears Typical, and the line is gone. The Add sheet's row ends its caption with "Typical" too. Nothing else nudges.
   - A plain "Edit supplement".
   - Pinned: primary "Add 240 kcal". The sheet closes, Today updates, and the toast "Added Whey protein" offers Undo, which also puts back the last amount.
   - No calories: no Display figure and no mix. The line "No calories, so Today shows it as taken." sits over the Scoops stepper, and the primary reads "Log as taken". The toast says "Creatine taken".
   - Edit mode, from a row or a chip on Today: the logged amount and mix, primary "Save changes" (toast "Changes saved"), and at the end a danger "Delete" with an undo toast. No "Edit supplement" here. Saving uses the supplement's current label, so a corrected label also corrects the entry. Correcting an entry leaves the next start, the last amount logged, alone.
   - States: the milk values not loaded (offline before the food table was cached) leave Water and say "The milk values did not load. Water still works."; a supplement removed on another device closes the sheet, and its logged entries open in the Meal sheet instead. Offline, everything works and syncs later.

## 8. Train

1. Header: "Train".
2. Summary card: "4 sessions, 240 minutes a week", "Adds 137 kcal a day on average", and the program name. A small neutral button "Change program" opens Templates.
3. The week, Monday to Sunday: each day is a row with its sessions (name, type, minutes) or "Rest". Today is marked. Tapping a day opens the Session sheet. A session row can be dragged to another day by its handle.
4. "Analysis" heading, then:
   - Muscle balance card: one row per muscle with a small track where the zone is 10 to 20 sets, and the number of sets. Rows under 10 come first.
   - Up to three recommendations as rows: one sentence each and "Why", which opens the source.
   - A cardio row: minutes this week against 150 to 300.
5. With a program that has no exercises: the muscle card is replaced by "List your exercises to see muscle balance" and a button.

**Session sheet.** Name, type as chips, minutes with a stepper in fives, intensity as a three way segmented control with one line describing each level, the calories this session adds, the exercise list with sets and reps steppers, "Add exercise", "Delete session".
**Exercise picker.** Search field, muscle chips, rows with primary muscles as a caption.
**Templates.** Four cards, each: name, days per week, who it suits, and the muscle balance it produces. "Use this program" replaces the current one after a confirm.

## 9. Progress

1. Header: "Progress". A segmented control: 4 weeks, 3 months, All.
2. Weight card, the screen's hero (D2): on its haze panel the current trend weight in Display with lighter decimals, "trend" as its caption, and "0.3 percent a week. Target 0.5"; below the panel the chart (weigh-ins as dots, the trend as a line, the target rate as a faint band) and a neutral button "Log weight".
3. Maintenance card, once measured: "2,120 kcal" in Display, "Measured from your last 3 weeks", and the formula estimate beside it for comparison.
4. Intake card: bars for weekly average calories with the target as a line, and average protein beneath.
5. Consistency card: the last four weeks as rows of seven dots, filled in `--success-ink` for on track days, with a count per week.
6. "Check-ins" list: date, the change made or kept, opening the stored check-in.
7. "History": opens a month list where any day opens in the Today view.

Empty states say what is needed: "Weigh in on 8 days across two weeks to see your trend and get your first check-in".

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

A sheet with grouped rows, each opening a page inside the sheet.

- **You:** profile (sex for the equation, birth year, height, body fat), goal and pace (re-runs the plan and shows the new target before saving), units.
- **Targets:** same target every day, check-in day, How it is calculated.
- **Display:** theme, text size.
- **Data:** export all data, export meals as CSV, sync status with "Sync now".
- **About:** The science, Privacy, Terms, Report a problem, version.
- **Account:** email, Sign out, Delete account (typed confirmation, in the danger style).

**The science** lists each equation and constant with its plain name, value, citation, and status.
**How it is calculated** is the plan breakdown for the day being viewed.

## 12. System states

- **Offline:** the sync mark is hollow. Nothing else changes except analysis, which explains itself.
- **Update ready:** a toast, "A new version is ready", with "Update".
- **Session expired:** a card on Today, "Sign in again to keep backing up", that opens the sign in sheet. Local data is untouched.
- **Storage refused or full:** a blocking message explaining that Ontrack cannot save on this device, with export if anything is in memory.
- **First load on a new device after sign in:** a skeleton of Today with "Bringing your data over".
- **Every destructive action:** an undo toast when it can be undone, a confirm sheet when it cannot.
