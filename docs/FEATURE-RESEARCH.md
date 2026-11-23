# Feature research for Ontrack: Cal AI, Strava, Alma

Researched on 15 Nov 2026 with the Mobbin MCP (iOS captures), then re-cut for Ontrack; Bevel was added on 16 Nov (section 5). The first pass listed 107 features the three apps ship, with how each works. This version filters them through what Ontrack is, keeps the ones that fit with their status, and lists the rest in their own section with the reason they are not taken. Everything marked **Built, R1** is on the branch `app-research-onboarding-polish`, for the owner to review and keep or roll back.

> **Status, 22 Nov 2026 (v2.3.0).** This is research from 15 and 16 Nov. Its Status cells (Has, Built R1, Next, Owner call) are R1's: R1 shipped with R2 as v2.0.0 on 17 Nov, and the branch it names is merged. Later rounds (R2 to R4b) removed some of what R1 built and added things the research did not list. Section 4 gives where every feature taken stands today; trust it over a Status cell. What Ontrack is now is in `docs/PRD.md`.

## 1. What Ontrack is (the filter)

- **A calorie and lifting tracker in a phone browser** (Safari on iPhone first). No install, no push notifications, no native sensors: no Apple Health, widgets, GPS or heart rate.
- **A proof of concept for a product management class.** Not launched: no payments, ratings, referrals or store claims, and the landing page and app make no claim they cannot keep.
- **For lifters, the hardgainer first.** The target is built from how the user trains: more food on training days, a floor to reach when gaining, corrected by weekly check-ins from weigh-ins and meals.
- **The AI names foods and estimates grams; the food table gives the numbers** (a calorie target is never the model's call).
- **No guilt.** No streaks to break, no good or bad foods, no red for food, no rankings. Friends see only what is shared to the map.
- **Fewest taps, least text.** Ten seconds to log a meal; secondary information sits behind a chevron.
- **Style:** the landing page's sky, ink pill actions, violet brand, liquid glass on floating bars.

## 2. Features that fit

**Status:** `Has` already in Ontrack. `Built, R1` built on this branch. `Partial` there but weaker than the reference. `Next` fits and is not built yet. `Owner call` fits only if the owner wants it.

| # | Feature | Type | Seen in | How it works there | Fit for Ontrack | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | Profile page | Account | Cal AI | Premium badge, name and username, Refer a friend, Account (Personal Details, Preferences, Language, Upgrade to Family Plan), Goals and Tracking (Manage Apple Health, Goals and current weight). | Settings. | Has | Seen [CA-ONB1] |
| G1 | Plan from the answers, editable | Goals and plan | Cal AI | The reveal gives four targets, each with a pencil that opens a number field. Health Score is shown as a bar (7/10) with four "how to reach your goals" cards. | Your plan with fine tune and a breakdown. | Has | Seen [CA-ONB2] [CA-PLAN] |
| G2 | Plan sources cited | Goals and plan | Cal AI | A list under the plan of linked sources (Basal metabolic rate, Calorie counting Harvard, ISSN, NIH). | Every number opens its source. | Has | Seen [CA-PLAN] |
| G3 | Goal chips by category | Goals and plan | Alma | "Maintain weight" chip with a scale glyph sits above the macro circles; tapping opens the goal sheet; "Track nutrients with goals" groups goals by type (Weight related first). | Goal weight is a dedicated section, with the pace and what to expect. | Built, R1 | Seen [AL-HOME] [AL-GOALS] |
| T16 | Edit a goal number on its own screen | Goals and plan | Cal AI | "Edit Calories" / "Edit Step Goal": a ring with the current value and "Previous goal: 10,000 steps", one big numeric field with the number pad open, and "Revert" next to "Done". | Goal weight edits on its own wheel; targets change through the weekly check-in, by design. | Built, R1 | Seen [CA-PLAN] |
| M4 | Badges | Motivation | Cal AI, Strava | Cal AI: eight round medals in a card on Progress. Strava: challenge finisher badges in a Trophy Case; PR and QOM medals on segments. | Neutral milestones ("20 sessions done") would not break the no-streaks rule; not built. | Owner call | Seen [CA-PROG] [ST-CHAL] [ST-ANA] |
| P11 | Goal reached banner | Motivation | Strava | On the activity: "Congrats! You accomplished your weekly activities goal." with a green badge. | The goal weight card reads "Reached" in neutral ink. No banner, no confetti. | Built, R1 | Seen [ST-SAVE] |
| N1 | Tab bar with a separate action button | Navigation | Cal AI | A glass pill tab bar (Home, Progress, Groups, Profile) and a separate round black + at its right; the active tab has a filled grey capsule. | Dock with a separate plus. | Has | Seen [CA-SCAN] |
| T4 | Plus button opens four action tiles | Navigation | Cal AI | A round black + (bottom right, beside a glass tab bar) opens a scrim with four tiles: Log exercise, Saved foods, Food Database, Scan food. The + turns into an X. | The plus button opens Add. | Has | Seen [CA-SCAN] |
| N2 | Tab badges | Notifications | Strava | A red count on Home (4, 2, 1), a red dot on Groups, a bell with a count. | A bell on every tab with a red dot while anything is unread; it holds the starting checklist (moved off Today), the check-in and the weigh-in prompt. In-app only, nothing pushed. | Built, R1 | Seen [ST-ACT] |
| O1 | Intro screen with a looping demo | Onboarding | Cal AI | First screen after the splash shows a phone with a looping scan video, the line "Calorie tracking made easy", a black "Get Started" pill and "Already have an account? Sign In" beneath. | The landing page shows the product on a phone before sign up. | Has | Seen [CA-ONB2] |
| O2 | One question per screen, thin progress line, round back button top left | Onboarding | Cal AI | Each question fills the screen under a thin segmented progress line with a circular back button at its left. The grey "Continue" pill turns black once an answer is picked. Picked cards turn solid black with white text. | One question a screen on the landing sky; Back moved to a white button beside Continue; Continue before an answer shakes the answers. | Has, R1 | Seen [CA-ONB1] [CA-ONB2] |
| O3 | Gender, workouts per week, where did you hear about us | Onboarding | Cal AI | Gender is three stacked buttons. Workouts per week is three cards (0 to 2, 3 to 5, 6 plus) each with a dot glyph that grows with the amount and a one line hint. Source is a list with real brand icons (Instagram, TikTok, TV, Friend or family, Facebook, YouTube). | Sex and training days are asked because they move the number. The source question and brand icons are not. | Has | Seen [CA-ONB1] [CA-ONB2] |
| O4 | Height and weight wheels with a unit switch | Onboarding | Cal AI | An Imperial/Metric toggle sits above two or three iOS wheels (ft, in, lb or cm, kg). Flipping the toggle swaps wheel contents in place. Birth date is three wheels (month, day, year) with the middle row highlighted. | Wheels, typeable; metric is the default now, imperial one tap away. | Has, R1 | Seen [CA-ONB1] [CA-ONB2] |
| O6 | Goal, then desired weight, then speed slider | Onboarding | Cal AI | Goal is three rows (Lose, Maintain, Gain). Desired weight uses the ruler. "How fast do you want to reach your goal" is a three stop slider with a sloth, a rabbit and a cheetah icon, a big "1.0 kg" readout that follows the thumb (0.1 to 1.5 kg) and a "Recommended" tag under the middle. | Goal weight is its own section on Your plan with the day the pace reaches it ("About 3 Feb"), and its own card on Progress. The pace stays a segmented control with only the paces the guardrails allow. | Built, R1 | Seen [CA-ONB2] |
| O14 | Fake wait: percent counter and ticking checklist | Onboarding | Cal AI | After "All done! Time to generate your custom plan!", a screen shows a huge percentage counting up ("18%"), "We're setting everything up for you", a two colour progress bar, a status line ("Customizing health plan...") and a card "Daily recommendation for" listing Calories, Carbs, Protein, Fats, Health Score that tick off one by one as the number rises. About 5 to 8 seconds in all. | About 4 s: a percent ring and five rows that tick, then a check. Plays under reduced motion too (pacing is not motion). | Built, R1 | Seen [CA-ONB2] |
| O15 | Plan reveal | Onboarding | Cal AI | "Congratulations, your custom plan is ready!" with a check badge, a pill "You should gain: 6 kg by October 13", then "Daily recommendation, you can edit this anytime": four rings (Calories 2583, Carbs 300 g, Protein 184 g, Fats 71 g) each with a pencil. Below: "How to reach your goals" (four cards), a Health Score 7/10 bar and "Plan based on the following sources" (BMR, Harvard, ISSN, NIH as links). CTA "Let's get started!". | Target counts up from zero over 1.4 s, with protein, carbs and fat counting in behind; goal weight and its date below; the working behind the number is in closed disclosures. | Built, R1 | Seen [CA-ONB2] [CA-PLAN] |
| O18 | Sign in to save progress | Onboarding | Cal AI | After the plan, "Save your progress" with Sign in with Apple, Sign in with Google and a small "Skip" for later. | Save this plan, then Google or an email code. | Has | Seen [CA-ONB2] |
| O19 | Username with live check | Onboarding | Cal AI | "Create a username" with suggestion chips ("alexsmith1", "alexsmith3") under the field. Picking a chip fills it and a green tick says "This username is available". | Friends use a handle; it is set in the profile, not in onboarding. | Has | Seen [CA-PROF] |
| O20 | First log inside onboarding | Onboarding | Alma | "Let's try tracking some food. What's the last thing you ate?" with a dotted arrow to a big + button over a warm blurred gradient. After one entry, "It's that easy." shows the logged card (Fried Chicken And Rice, 316 cal, P/C/F chips) and the sign in sheet slides up. | A guided first log on Today (the plus button pulses once), not inside onboarding, so the plan is saved first. Owner call. | Next | Seen [AL-ONB] |
| O26 | Account, birthday and gender with the reason stated | Onboarding | Strava | Email or Google or Apple on one screen, then "When's your birthday?" with the reason ("performance analysis, filtering leaderboards, keeping younger users safe") and "What's your gender?" with its reason ("which leaderboards you appear on"). | Every question that needs a reason says it in its caption. | Has | Seen [ST-ONB] |
| O29 | First activity celebration | Onboarding | Strava | After the first saved activity, a full screen orange and black "1" mark and "Congrats on your first activity!", "Your activity is uploading. Just complete a few more steps." | A quiet first-meal moment on Today with no streak and no count. Owner call. | Next | Seen [ST-REC] |
| O30 | Coach marks on first use | Onboarding | Strava | On Save activity, orange tooltip cards "2/4 Bring your activities to life with photos and videos" with an action and "Next", pointing at the control they explain. | One-time tooltips on the first visit to Train and Progress. Owner call. | Next | Seen [ST-SAVE] |
| P1 | Progress tab layout | Progress | Cal AI | Top pair: Day Streak (flame, S M T W T F S ticks) and Badges Earned. Then Current Weight with a bar from Start to Goal and a "Log weight" pill; Weight Progress chart with "% of goal"; Progress Photos card; Daily Average Calories with a week switch (This wk, Last wk, 2 wk ago, 3 wk ago); Weekly Energy (burned, consumed). | Progress: weight trend, goal weight, maintenance, intake, consistency, training. | Has | Seen [CA-PROG] |
| P2 | Weigh-in sheet with a ruler | Progress | Cal AI | A sheet over the history: last weigh-in big, a horizontal ruler to set the weight, a Date row ("Today >"), "Log Weight". History rows can carry a photo. | Wheel sheet. | Has | Seen [CA-WEIGH] |
| P4 | Empty states with the reason | Progress | Cal AI | "No data to show. This will update as you log more food." with a chart icon. | Every empty state says what is needed. | Has | Seen [CA-PROG] |
| P8 | Training log | Progress | Strava | "See patterns in your training history": a weekday grid with dots per day; filled green for days trained. | Consistency card. | Has | Seen [ST-GOAL] |
| P9 | 12 week chart | Progress | Strava | "This week" (distance, time, elevation gain) over a line chart of the past 12 weeks with a dot per week and a shaded current week, and "See more of your progress". | Range switch with a trend chart. | Has | Seen [ST-GOAL] |
| S1 | One camera, three modes | Scanner and AI | Cal AI | The camera opens on "Scan Food" (photo of the plate). A three segment control at the bottom (Scan Food, Barcode, Food label) switches mode in place: the viewfinder brackets change shape (square for food, wide for barcode, tall for a label) and a one time card names the mode ("Barcode Scanner. Align the barcode within the frame. Got it"). | Barcode, Meal and Label in one viewfinder, switched in place; Take photo keeps the frame (Meal goes to Review, Label is read). The Add sheet's Photo tile still opens the system camera, so the photo path and its tests are unchanged. | Built, R1 | Seen [CA-SCAN] |
| S2 | Camera controls | Scanner and AI | Cal AI | Bottom row: flash toggle (left), big white shutter (centre), gallery picker (right). Above the modes: 0.5x and 1x zoom pills. Top: close (left) and "?" help (right). | Shutter and gallery exist in Scan; flash and zoom are Next. | Partial | Seen [CA-SCAN] |
| S3 | Barcode that reads on its own | Scanner and AI | Cal AI | In Barcode mode there is no shutter: the camera reads the code when it lands in the frame and opens the product on the food detail screen. | Scan reads the barcode on its own. | Has | Seen [CA-BAR] [CA-SCAN] |
| S4 | Label scan | Scanner and AI | Cal AI | In Food label mode the user photographs the Nutrition Facts panel; the model reads the printed values into the same food detail screen. | Photograph the label, printed values only. | Has | Seen [CA-SCAN] |
| S5 | Pre-scan tips | Scanner and AI | Cal AI | A four page card stack before the first use: "Get the best scan: hold still, use lots of light, ensure all ingredients are visible", then "For highest accuracy: scan the barcode, or take a photo of the food label, or search the database". "Next", then "Scan now". A longer version "Any doubt? Barcodes..." explains which mode is most accurate. | A short first-use tip card on the camera: hold still, light, all foods in frame. | Next | Seen [CA-TIPS] |
| S6 | Result with thumbs and Fix Issue | Scanner and AI | Cal AI | The result sheet shows the food name, servings stepper, Calories and P/C/F cards, an ingredients row with "Add", a card "How did Cal AI do?" with thumbs down and up, and two pills: "Fix Issue" (sparkle icon) and "Done". | Review has Something off? with a field; the numbers are re-read from the photo or words plus your sentence. No thumbs (no feedback loop behind them). | Built, R1 | Seen [CA-FIX] |
| S7 | AI fix: type what is wrong, numbers recalculate | Scanner and AI | Cal AI, Alma | Tapping "Fix Issue" (Cal AI) or "Fix it" (Alma) opens a text box where the user says what is wrong ("it was brown rice, not white", "two eggs not three"); the model re-reads the original photo and text together and returns new items, grams, calories and macros, replacing the numbers. Mobbin shows the entry points and the result, not the middle step. | The owner's example: "It was brown rice, 2 eggs" re-reads the photo or description with that note and replaces items, grams and numbers; a second sentence adds to the first. Food table values still win over the model's. | Built, R1 | Inferred [CA-FIX] [AL-MEAL] |
| S9 | Speak or type a meal | Scanner and AI | Cal AI, Alma | "Voice Log" (Cal AI) and the mic button (Alma) turn speech into a described meal, then run the same estimate as typing. | Speak in Describe, then Find the foods. | Built, R1 | Seen [CA-SUG] [AL-COMPOSE] |
| S11 | Source label on every estimate | Scanner and AI | Alma | Meal detail names where the numbers came from ("Source: Alma Estimate"); Cal AI shows ingredients as hidden with "Learn why". | Database, Estimate or Yours on every item. | Has | Seen [AL-MEAL] [CA-FIX] |
| T6 | AI fallback inside search | Scanner and AI | Cal AI | When the database rows do not fit, a pill "Generate results using AI" is pinned below the list; it turns the typed text into an estimate. | Describe: a sentence becomes items, grams and numbers from the food table. | Has | Seen [CA-LOG] |
| SO3 | Follow and requests | Social | Strava | Follow button per athlete; a private athlete shows "Requested". | Friends and requests. | Has | Seen [ST-ONB] |
| SO9 | Activity privacy | Social | Strava | On Save: "Who can view" sheet (Everyone, Followers, Only You, each with a sentence of what it means), "Hide stats", "Mute Activity: Don't publish to Home or Club feeds", "Discard Activity". | Friends see only what you share. | Has | Seen [ST-REC] [ST-SAVE] |
| SO10 | Share a meal | Social | Alma | A "Share" button pinned under the meal detail and a share icon on the photo. | Share to the food map. | Has | Seen [AL-MEAL] |
| T1 | Home dashboard: calories left plus macro rings | Tracker | Cal AI | A week strip (each day a dotted ring), then one big card "2583 Calories left" with a ring, then three small cards (Protein left, Carbs left, Fat left) each with its own ring. Rings fill as food is logged. Dots under the cards show more pages. | Today hero with track, protein, carbs and fat tiles. | Has | Seen [CA-ONB2] [CA-SCAN] |
| T2 | Recently uploaded list | Tracker | Cal AI | Cards with a photo thumbnail on the left, name, time, bold calories and three coloured P/C/F chips. Water is a plain row (96 fl oz). Exercise rows sit in the same list. | Meals list with thumbnails, kcal and source label. | Has | Seen [CA-SCAN] [CA-LOG] |
| T5 | Log Food with tabs | Tracker | Cal AI | Tabs All, My foods, My meals, Saved foods. A search field ("Describe what you ate") over a "Suggestions" list; each row has name, calories, unit, and a + that logs it. A barcode icon top right. Bottom pills "Manual Add" and "Voice Log". | Search, Recent, Describe and Saved meals; Describe has a mic where the browser can listen. | Built, R1 | Seen [CA-SUG] [CA-LOG] [CA-DB] |
| T7 | Food detail with measurement and servings | Tracker | Cal AI | "Selected food": name and brand, Measurement chips (Container, G, Oz), "Number of Servings" with a pencil, a Calories card (420) and P/C/F cards, "Other nutrition facts" (expands), bookmark to save, and a pinned "Log". | Portion step with chips, grams stepper and the source line. | Has | Seen [CA-SEL] |
| T8 | My meals: combine foods | Tracker | Cal AI | "Create meal": editable name, totals card, a list of items with a bin, "Add items to this meal", then "Create Meal". Quick re-log later from My meals. | A bookmark on the Meal sheet saves or unsaves it; a Saved meals sheet lists them with swipe to delete. Creating one from scratch is Next. | Built, R1 | Seen [CA-DB] [CA-LOG] |
| T9 | My foods: custom foods | Tracker | Cal AI | An empty state with a pantry icon, "Add a custom food to your personal list" and an "Add food" button. | Correct remembers your numbers per food. A custom food form is Next. | Has | Seen [CA-LOG] |
| T12 | Composer with Track and Ask | Tracker | Alma | The + opens a sheet with a Track/Ask switch. Track: a text field "Track what you ate" with camera, mic and saved buttons, and a "Previous foods" list with a + per row. Ask: same field for questions. Keyboard opens at once. | Speak or type in Describe. The Ask tab is out (see excluded). | Built, R1 | Seen [AL-COMPOSE] |
| T13 | Meal timeline on home | Tracker | Alma | "Today's food": rows per meal (Lunch 12:00 PM, Dinner 6:00 PM, Snack) with calories and P/C/F chips; the open one shows a photo and a count badge; "View full meal timeline". | Group Today meals under Breakfast, Lunch, Dinner by time. Owner call. | Next | Seen [AL-HOME] |
| T14 | Meal detail | Tracker | Alma | Photo header with a share button, a "Saved food" tag, a serif name, rows for Meal (Lunch pill), Portion (0.5 serving), Macros (271 cal, P/C/F), Source ("Alma Estimate"), then "Something look off? Fix it" and a "Share" button. | Meal sheet with source labels. | Has | Seen [AL-MEAL] |
| T11 | Exercise as a log entry | Training | Cal AI | An exercise row in the same list: icon tile, "Run", "384 calories" in bold, "Intensity: Medium, 30 Mins". The calories add to the day's budget if "add calories burned back" is on. | A session marked Done adds its energy to the day; it is not a log row. | Has | Seen [CA-EX] |
| TR3 | Save activity form | Training | Strava | Title (auto "Lunch Run"), description with @ tags, sport dropdown, media tile, map type, then Details: type (Long Run, Workout, Race, Commute), "How did that activity feel?" (slider Easy to Max Effort), private notes, gear, visibility, mute, Discard. Save Activity is pinned. | Session sheet: name, type, minutes, intensity, exercises. | Has | Seen [ST-SAVE] [ST-REC] |
| TR5 | Manual activity | Training | Strava | A "+" on You opens Post, Photos, Manual Activity. The form: title, description, sport, media, date and time, duration (00:35:00), distance (6.00 km), pace (5:50 /km), tag, feel, private note. | Add a session; mark Done on Today. | Has | Seen [ST-SAVE] |
| TR8 | Instant workouts | Training | Strava | A carousel on the feed ("Recovery Run, 6.0 km, Keep the legs moving without adding stress") with "See all". | Templates and the suggested week. | Has | Seen [ST-ACT] |

### Found in the second round (Mobbin, 15 Nov)

| # | Feature | Seen in | How it works there | Fit for Ontrack | Status |
| --- | --- | --- | --- | --- | --- |
| R1 | Notification inbox | Public, WHOOP, Strava | Rows with a small category tag, a line and a date, newest first; a badge or dot on the bell or tab. | A bell on every tab, red dot while unread, in-app only. | Built, R1 |
| R2 | Quick workout log with duration chips | BitePal | A workout row opens a sheet with 15, 30, 60 min and Custom chips and the kcal per minute, then Log. | Training is planned, not logged; Done on Today adds the session's energy. | Owner call |
| R3 | Weight changes table | Cal AI | A card listing the change over 3, 7, 14, 30, 90 days and all time. | One more row on the weight card; the trend rate is already shown. | Next |
| R4 | Manage goal with a ring | Neo Financial | A ring with the percent, rows for amount and timeline, a destructive row at the foot. | The goal weight card shows the track from the first weigh-in to the goal and the date; Clear is on its wheel. | Built, R1 |
| R5 | Milestone badges | Nike Training Club | "3x in a Week", "3 Workouts": earned tiles. | Neutral milestones only, never a streak. | Owner call |
| R6 | Disclosure (chevron) for secondary information | Strava, Alma | A heading with a chevron that opens the detail. | "How this was calculated", "Your training" and "Fine tune" on Your plan start closed. | Built, R1 |
| R7 | A not-yet button that still answers | Cal AI | The grey Continue is tappable and the screen reacts. | Continue shakes the answers above it, with a buzz and no words. | Built, R1 |
| R8 | A day strip you can slide, with Today pinned | Cal AI | Days in a row with today anchored. | Three-letter weekdays, six sliding slots that snap, a left tap pulls the day to the middle slot, Today pinned with a fade, a standing weigh-in card on Today. | Built, R1 |

## 3. Features not taken, and why

| # | Feature | Type | Seen in | How it works there | Why Ontrack does not take it |
| --- | --- | --- | --- | --- | --- |
| C1 | Coaching style preference | Coaching | Alma | A sheet "Make Alma your kind of coach": whether the user wants encouragement, straight facts or deep dives; "Set preferences". A home card "Personalize your coaching style" with "Learn more". | No coach (see S10). |
| C2 | Feedback on every meal | Coaching | Alma | After logging, one line of feedback on the meal in the home card, tied to the score. | No coach (see S10). |
| S10 | Ask questions about food | Coaching | Alma | The "Ask" tab takes free text ("What foods do you recommend for improving my gut health?") and answers with a structured note ("Practical starting point", "One small win to aim for") that uses the user's taste pills and targets. A follow-up field and the line "Alma is not a medical professional and can make mistakes". | Coach features are not in v1 (PRD section 6), and a coach that answers health questions needs medical guardrails the PoC does not have. |
| G5 | Goal builder | Goals and plan | Strava | "Add a New Goal": sport picker, time frame chips (Weekly, Monthly, Annual), goal type chips (Activities, Distance, Time, Elevation), a number field "Moment of truth, what's your goal?", Save Goal. Existing types show in grey. | Targets come from the program; a second goal system (distance, time) would compete with it. Ontrack's only goal is the body weight direction and the training week. |
| G6 | Goals card with rings | Goals and plan | Strava | On You, "Goals": rings with "This week, 1 run to go, 1/2 runs completed", Add Goal and See All Your Goals. | See G5. |
| G7 | Performance predictions | Goals and plan | Strava | "Log 5 runs in 24 weeks to see how fast we think you could run the 5K, 10K, half, and full marathon." A locked state shows what is needed ("You need 5 more runs"). | Predictions need run times. A lifting version needs set by set logging (PRD "later"). |
| I1 | Apple Health sync | Integrations | Cal AI | An onboarding step and a Profile row "Manage Apple Health": workouts and steps count toward the day, with the "add calories burned back" switch. | A browser tab cannot read Apple Health. |
| I2 | Widgets | Integrations | Alma | Large widget (calorie circle with macro circles and mic, keyboard, camera quick buttons), medium (streak message), small (a count). | Widgets need a native app. |
| I3 | Device and music | Integrations | Strava | Device name on each activity and a Spotify control on the record screen. | No devices or music in a lifting and food app. |
| O25 | Trial paywall | Monetization | Alma, Cal AI | Alma: "Get the full Alma experience", 4.9 stars, five checked benefits, a Yearly card (17% OFF tag) and a Monthly card, "Get started for free", Restore, Terms, Privacy. Cal AI: phone mock, "No Payment Due Now", "Just $29.99 per year ($2.49/mo)". | Proof of concept: no payments. |
| M1 | Streak counter | Motivation | Cal AI, Alma | A flame with a number (top right on home; Alma shows a coconut count). Logging any meal keeps it. | PRD: no streaks to break. |
| M2 | Streak lost modal | Motivation | Cal AI | A card "1 Day streak lost" with a grey flame, week dots, "Don't give up. Log your meals today to get back on track!" and Continue. | PRD: no streaks, no guilt words. |
| M3 | Streak progress bar | Motivation | Alma | A banner over home: "Track one item to keep your streak" with a bar that fills orange to green and ends in a check. Widget text "Streak secured! Nice work." | PRD: no streaks. |
| M5 | Kudos on your own activity | Motivation | Strava | A card "Kudos on your third activity!" with a View button. | There is no feed to give kudos on (PRD: no public feed, likes or comments). |
| O5 | Ruler scrubber for weight | Onboarding | Cal AI | "What is your weight?" shows the number large over a horizontal ruler; drag the ruler and the number follows. A lbs/kg segmented switch sits above it. The same ruler sets the desired weight, labelled "Gain weight" or "Lose weight". | Ontrack's wheels already work, take a typed number and are reachable by keyboard and screen reader; a ruler is faster to scrub but slower to land on an exact weight, and the wheel is already feasible. Goal weight gets its own section instead. |
| O7 | Affirmation after a hard choice | Onboarding | Cal AI | After the desired weight, a text only screen: "Gaining 6 kg is a realistic target. It's not hard at all!" with the number in colour and a line of proof ("90% of users say the change is obvious"). No input, one Continue. | "90% of users say..." is a claim the app cannot keep (PRD F18 allows none). The reveal says the day the user's own numbers reach their goal. |
| O8 | Interstitial charts that sell the method | Onboarding | Cal AI | Between questions: a line chart "Cal AI creates long-term results" (their line against "Traditional diet"), a bar pair "Gain twice as much weight with Cal AI vs on your own" (20% against 2X in black), a transition chart "You have great potential to crush your goal" (3 days, 7 days, 30 days). Each is one chart and one Continue. | Charts that sell the method (their line against "traditional diet") are claims without a source. The reveal shows the user's own plan instead. |
| O9 | Obstacles question | Onboarding | Cal AI | "What's stopping you from reaching your goals?" is a single list with an icon per row (Lack of consistency, Unhealthy eating habits, Lack of support, Busy schedule, Lack of meal inspiration). The answer tunes later copy. | Nothing in the engine uses it. Onboarding asks only what moves the number or a guardrail (O1 principle). |
| O10 | Permission priming before the system prompt | Onboarding | Cal AI | A screen explains the value first ("Reach your goals with notifications"), shows the real iOS alert mock with a hand pointing at Allow, then the Apple Health step has a "Continue" and a plain "Not now". The system prompt is asked only after the user agrees. | No push notifications (an iPhone browser tab cannot receive them, PRD section 6); Apple Health is not reachable from a browser. |
| O11 | Setting questions shown with a worked example | Onboarding | Cal AI | "Add calories burned back to your daily goal?" shows a card (Today's Goal 500 Cals, Running +100 cals). "Rollover extra calories to the next day?" shows two cards (Yesterday 350/500, Today 350/650, "+150 rollover"). Each has Yes and No pills. | Rollover and "add burned calories back" are against how Ontrack works: a training session adds to that day's target from the Compendium, and a gain target is a floor, not a budget. |
| O12 | Rating ask | Onboarding | Cal AI | "Give us a rating": a laurel with 4.8 stars, three avatars, one testimonial card, then the system rating prompt. | Proof of concept: not launched, no store listing to rate. |
| O13 | Optional referral code | Onboarding | Cal AI | A single field "Enter referral code (optional)" with a Submit button that stays grey until text is typed and the line "You can skip this step". | Proof of concept: no referral programme. |
| O16 | Macro presets with animated bubbles | Onboarding | Cal AI | "Set your daily goals" shows four soft bubbles (Calories, Carbs, Protein, Fats) sized by share, numbers counting up from 0, over a carousel of split cards (Balanced, Recommended; dots show more) and a text button "Enter custom values". | Macro presets (Balanced, High protein) are choices the science does not support: protein and fat come from published per kg values, carbs are what is left. |
| O17 | Thank you screen | Onboarding | Cal AI | After the commitment questions, an illustrated high five in a gradient ring, "Thank you for trusting us!" and a privacy line ("Your privacy and security matter to us"). | A screen with no information is a tap spent. The privacy line is under the weight question. |
| O21 | Profile card as the first step | Onboarding | Alma | "Welcome to Alma! Let's get you started." A white card with a photo upload tile, a large serif name line, and rows for sex at birth, age, height, weight. Ten dot progress at the top, back button round. | A photo and a name do not move the plan. They live in the friends profile. |
| O22 | Personalisation preview | Onboarding | Alma | "Alma learns about you over time too. Look for this notification." A toast "About you updated" drops over a card of the user's photo and coloured taste pills (Spicy, Savory, Salty, Umami, Comfort, Mediterranean, Japanese, Low Sugar, Gut Issues). | Needs taste data Ontrack does not collect. |
| O23 | Swipeable goal carousel | Onboarding | Alma | "Track nutrients towards the goals you care about": one big card per goal (Gain weight with a scale glyph) over collaged food cut-outs; swipe sideways to change it, Continue to pick. | Swiping hides options; three cards and "Other goals" show them all at once. |
| O24 | Tour of the main control | Onboarding | Alma | "Have a question? Easy, just ask Alma!" Quote cards (example questions) float over a phone mock with the green + button and an arrow pointing at it. CTA "Let's go!". | The plus is labelled and Today's empty state says what to do. |
| O27 | Welcome with social proof | Onboarding | Strava | Full bleed photo of three runners, "You're in good company", "150+ million runners ... are excited to move with you", "Let's go". | No counts, ratings or claims on the landing page or in the app (PRD F18). |
| O28 | Follow athletes during onboarding | Onboarding | Strava | "Follow Athletes": connect Facebook or search; a result list with Follow and "Requested" (private) states; a prompt "Following at least 1 person helps you discover routes, challenges, clubs" with Go back. | Friends are optional and need a profile; not worth a step before the plan. |
| G4 | Alma Score | Progress | Alma | A 0 to 100 score from food group balance (Nuts and legumes, Fruits, Vegetables, Whole grains, Fish...), drawn as a ring on home with one sentence of feedback ("You nailed Whole Grains, pair them with lunch"). Starts at 40, aim for 100. | A 0 to 100 food score reads as judging food. PRD: no "good" or "bad" foods, no guilt. |
| P3 | Progress photos | Progress | Cal AI | A card "Want to add a photo to track your progress?" with "Upload a Photo"; photos are tied to a weigh-in date. | Progress photos mean storing body photos; the PoC keeps only 320 px meal thumbnails. Owner call if wanted. |
| P5 | Weekly digest | Progress | Alma | A "Weekly Digest" card under today's food with seven day dots; opens a summary of the week. | The weekly check-in already is the digest. |
| P10 | Month recap card | Progress | Strava | A full width gradient card "Month in Sport, May 2026" with a play button, opening a story style recap. | A recap card is a story to build and a lot of data; later. |
| S8 | Background analysis with a notification | Scanner and AI | Cal AI | The photo is queued; the user is free to leave; a notification arrives when the card is ready and the placeholder fills in. | Same as T3: no push. |
| SO1 | Activity feed | Social | Strava | Home is a feed of followed athletes: avatar, name, device ("Garmin Forerunner 265S"), time and place, title, a stat row (Distance, Elev Gain, Time), a route map with the line in orange, then kudos count, comment and share buttons. | PRD section 6: no public feed, likes or comments. Friends see a map of shared meals only. |
| SO2 | Kudos, comment, share | Social | Strava | Three icons under each card; kudos is one tap (a thumbs up that fills); the count shows "3 gave kudos". | See SO1. |
| SO4 | Clubs | Social | Strava | Groups tab, Clubs: "Create Your Own Strava Club", Explore Local Events ("Find Your Crew"), Popular Clubs Near You with Join. A club page shows member count, public tag, location, a Join button that becomes "Joined", and Overview, Events, Share, Posts. | Clubs and events need moderation and a crowd; out of v1. |
| SO5 | Club events | Social | Strava | A date block (JUN 6 SAT), title "Easy run", tags (Social, Road), "1 person is going". | See SO4. |
| SO6 | Challenges | Social | Strava | Groups, Challenges: sport filter chips (Run, Ride, Swim, Walk), cards with a badge, name ("January 5K Challenge"), rule, dates, Join. Detail page: progress bar with "Completed" or "14 days left", dates, qualifying activities, the finisher badge, the organising club, "Invite Friends". "Recommended for you based on your activities". | Challenges are social competition; Ontrack has no ranking (PRD F16: never a streak or a ranking). |
| SO7 | Groups with chat and leaderboard | Social | Cal AI | Groups tab: a group ("Fitness & Workouts") with Chat and Leaderboard tabs; the leaderboard is ranked rows (avatar, name, @username, flame points). | See SO6: a leaderboard is a ranking. |
| SO8 | Refer a friend | Social | Cal AI | A profile card "Refer a friend and earn $10 ... with your promo code". | Proof of concept: no referral programme. |
| T3 | Background analysis banner | Tracker | Cal AI | While a photo is analysed the user can leave: a banner "You can switch apps or turn off your phone. We'll notify you when the analysis is done." and a placeholder card in the list. | Needs a push to say "done"; without push the Review sheet waits in place, with the steps in words. |
| T10 | Water | Tracker | Cal AI | Water is a row type in the list ("Water 96 fl oz") with a drop tile. | Water is not in v1 (PRD section 6). |
| T15 | Liquid macro circles | Tracker | Alma | Home shows four circles (Calories 316 of 2,100, Protein, Carbs, Fat) that fill from the bottom like liquid in each macro's colour, with "of 112" under the number. | Liquid fill circles are decoration; the tracks on Today already show progress and reaching. |
| P6 | Activity analysis | Training | Strava | One activity opens to a scroll of charts: Results (Best Efforts 10, Segments 37, Achievements 6), Workout Analysis (bars per interval against a dashed average), Pace with avg pace, moving time, elapsed time, fastest split, Pace Zones (Z1 to Z6 bars with % and ranges), Heart Rate (area chart, avg bpm), Cadence, Elevation. Tapping a bar shows a tooltip. | Per-session analysis needs set by set data, which Ontrack does not log yet (PRD "later"). |
| P7 | Heart rate zone donut | Training | Strava | A donut by zone (Moderate 48.5%, 50:03) over a coloured legend of bpm ranges (0 to 123, 123 to 153 ...). | No heart rate source in a browser. |
| TR1 | Record screen | Training | Strava | A map with a "GPS SIGNAL ACQUIRED" green bar, sport picker, route picker, heart rate sensor, live tracking, music; layers, 3D, locate buttons; one big orange START. | Ontrack plans and counts training; it is not a recorder. A browser tab cannot keep GPS running with the screen off. |
| TR2 | Live recording screen | Training | Strava | Huge numbers on a plain screen: time, split average pace, heart rate, distance, with a bar showing the last split; stop (square) and pause; paused shows RESUME and FINISH. | See TR1. |
| TR4 | Perceived exertion slider | Training | Strava | A sheet "Perceived Exertion" with a slider (Easy, Moderate, Max Effort) and "Show Details". Feeds the training log. | Intensity is already three levels per session and feeds the energy estimate; a perceived exertion slider would not change a number. |
| TR6 | Gear | Training | Strava | A gear row on the activity ("ASICS Kayano") picked from the user's shoes or bikes. | No gear to track in a lifting week. |
| TR7 | Route builder | Training | Strava | Maps tab: map with Length, Elevation, Surface, Difficulty filters; "Create Route": tap points and the line snaps to roads, with undo, distance, elevation, est. time, a profile chart and "74% Paved"; Save; a saved route offers Offline, Edit, Start. | Routes are a map product; out of scope for a calorie and lifting tracker. |
| TR9 | Segments and PRs | Training | Strava | A Results card lists segments with a PR medal, time and pace ("Got Wood? 3:09, 5:56 /km"). | Set PRs need set by set logging (PRD "later"). |

## 4. Status (v2.3.0)

Where each feature taken in R1, each item listed as next, and each Bevel feature stands in the app today (22 Nov 2026), checked against the code. In the app: shipped and live. Removed: shipped, then taken out on purpose. Not built: never built. The Status columns in sections 2 and 5 are R1's and are not updated.

| # | Feature | Now | Where it is, or why not |
| --- | --- | --- | --- |
| G3, T16, P11 | Goal weight as its own section, edited on its own wheel, "Reached" without a banner | In the app | A step in onboarding for lose and gain, a row on Your plan, and a Goal box and card on Progress (PRD F25). "Reached" reads in neutral ink |
| O6, O15 | Goal weight, pace and the plan reveal | In the app, changed | The target counts up with protein, carbs and fat; the pace is a segmented control of the paces the guardrails allow. The day the pace reaches the goal ("About 3 Feb") was not kept |
| O14 | Fake wait: percent counter and ticking rows | In the app | "Building your plan" plays once and always, even under reduced motion |
| N2, R1 | Bell, tab badges and notification inbox | Removed (R2) | A waiting check-in is a card on Today and a dot on the Progress tab. There is no bell and no notice store |
| S6, S7 | Something off? re-reads the photo or words with a sentence | In the app | In Review for photos and descriptions. No thumbs |
| S9 | Speak a meal | In the app | The mic on the Add field and Speak in Describe, where the browser can listen |
| T5, T12 | Log Food with tabs, the composer | In the app, reshaped | The plus is one sheet: whey and creatine on top, the camera, the Describe field, Photos, Search, Quick add, then Recent and Saved. The Ask tab stayed out |
| T8 | Saved meals | In the app, partly | A bookmark on the Meal sheet and Save meal in Review; a Saved meals sheet with swipe to delete. Creating one from scratch is not built |
| S1 | One camera for Meal, Label and barcode | In the app, extended | The plus opens it at once, a barcode is read in any mode, no guide frames |
| R4 | Goal card | In the app | The Goal box and a goal card with a track; Clear is on the wheel |
| R6 | Disclosures for secondary information | In the app | On Your plan, and on Progress for maintenance and week by week |
| R7 | A not-yet Continue that still answers | In the app | The choices shake, with a buzz |
| R8 | Sliding day strip with Today pinned | In the app, changed | One-letter days, six slots, eight weeks back. The weigh-in is a box in Today's card, not a standing card |
| O20, O29 | A guided first meal, a first-meal moment | Not built | Today's "Log your first meal" row is the quiet version: no pulse, no celebration |
| T13 | Meals grouped by time | Not built | Meals are newest first |
| R3 | Weight changes table | In part | A 7 day box and the change over the range on Progress; no table of 3, 7, 14, 30 and 90 days |
| S2 | Flash and zoom | In part | The light shows where the camera has one; zoom is not built |
| O30, S5, M4, R5 | Coach marks, pre-scan tips, badges, milestones | Not built | Owner calls that were never made |
| B1 to B6 | Strength log set by set, rest timer, values from last time, how was the workout, workout summary, closing saves what was done | Removed (R3) | The owner's call, 18 Nov: Ontrack is a calorie tracker first. Every session is marked Done, with no workout sheet, timer or set logging (PRD F26). Old set data stays readable but unused |
| B7 | Primary muscles of an exercise | In the app | Muscle chips and primary muscles in the exercise picker. Train also has a muscle map (R2, from MIT-licensed body data), which B18 had ruled out |
| B8 | Best lifts per exercise | Removed (R3) | It needed set logging |
| B9 | Review date row | In the app | "Eaten at" under the meal's name |
| B10 | Photo and a sentence in one sheet | In the app | Something off? (S6) |
| B11 | Metric or imperial as a question | In the app | Metric first on Height and weight, imperial one tap away |

Not taken in sections 3 and 5, but overtaken: an AI that answers questions (S10, C1, C2, B15). Ontrack has an AI coach since R2, built to explain and never to decide: a week recap, Ask Ontrack about your own logged weeks, "why this target" in the check-in, protein suggestions on Today, and Adjust with AI for the program (PRD F24). Where a row in this file says "PRD later" for set by set logging, read removed, not postponed.

## 5. Bevel (added 16 Nov)

Bevel is an all-in-one health app built on Apple Health and a Watch. Everything that needs an OS connection (Apple Health, Watch, sleep, recovery, strain, heart rate, HRV, SpO2, temperature, blood pressure, glucose, push) is cut: Ontrack is a phone browser and will not pay for an Apple developer account. What is left is its strength log and its food review.

### Taken

| # | Feature | How it works in Bevel | Fit for Ontrack | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| B1 | Strength workout log, set by set | A workout opens on a clock with each exercise as a card of set rows (kg, reps), a tick or play button per set, Add Set, and a Finish button. | The PRD's top "later" item, for lifters. Start on Today's training row when the session lists exercises; Mark done stays in the row menu. | Built, R1 | [BV-WORK] |
| B2 | Rest timer after a set | Ticking a set starts a countdown between sets (03:00) and a mini player at the foot. | A rest bar over Finish: 2:00 to start, plus and minus 15 s, Skip, a buzz at zero. It follows timestamps, so a locked screen does not lose it. | Built, R1 | [BV-WORK] |
| B3 | Set values start from last time | The template carries the weights; Progression opens a history per exercise. | Each set starts from the last logged workout of that exercise. | Built, R1 | [BV-WORK] |
| B4 | How was the workout? 1 to 10 | A dial with a word under it ("Tiring: exerting; heavy breathing, hard to talk"), then Save and end. | Ten chips with a word under the pick (Very light to All out), and Skip. No dial: chips are one tap each. | Built, R1 | [BV-WORK] |
| B5 | Workout summary | Duration, total reps, total weight, per exercise sets; Done, Update template, View activity. | Time, sets, reps and total lifted, plus "New bests" when a lift beats the heaviest before it. Today's row then shows "Done" and its sets. | Built, R1 | [BV-WORK] |
| B6 | Closing ends the workout and logs what was done | "End workout? Bevel will log what you have done up until now." | Closing with sets done saves them (with Undo); closing with none keeps nothing. | Built, R1 | [BV-WORK] |
| B7 | Exercise detail with primary muscles | A sheet with a muscle diagram, equipment, primary and secondary muscles, About and Guide. | The primary muscles under the exercise name on its card. The diagram needs licensed art: out. | Partial, R1 | [BV-WORK] |
| B8 | Progression per exercise | A link on each exercise to its history. | A "Best lifts" card on Progress (heaviest weight and reps per exercise, newest first). A chart per exercise is Next. | Built, R1 | [BV-WORK] |
| B9 | Review with a date row | Each food has a serving field, Remove and Edit; totals in kcal and macros; Date "Today at 2:19 PM"; Add to log. | Ontrack's Review already has the rest; it now has a Time field beside the name, to log a meal eaten earlier. | Built, R1 | [BV-FOOD] |
| B10 | Describe food with photos in the same sheet | "What are you eating?" with a text field and photos attached. | Photo plus a sentence is the AI fix (Something off?). Several photos at once: Next. | Has, R1 | [BV-FOOD] |
| B11 | Metric or imperial as a question | Two cards, with "can be readjusted later in Settings". | Metric first on Height and weight, imperial one tap away. | Built, R1 | [BV-ONB] |

### Not taken

| # | Feature | Why not |
| --- | --- | --- |
| B12 | Strain, Recovery and Sleep rings; Health Monitor (RR, RHR, HRV, SpO2, temperature, sleep); Stress and Energy; Biology (blood pressure, glucose) | They are computed from Apple Health or a wearable. A browser cannot read either, and the owner will not pay for the developer account. |
| B13 | Apple Health and Watch as the live data source, device pickers | Same: needs an OS connection. |
| B14 | "We'll notify you when your foods are ready" | Needs push. Review waits in place. |
| B15 | Ask Bevel (AI chat), Generate templates (AI) | Coach features are not in v1 (PRD section 6); Ontrack already has templates that fit the days and the experience. |
| B16 | Nutrition score ("51 fair") and the dot matrix of macros | A food score reads as judging food (PRD: no good or bad foods). The tracks on Today already show progress. |
| B17 | Tap-and-hold to edit the plus menu | Five fixed tiles are faster to learn and the order is the same on every phone. |
| B18 | Exercise animations and muscle diagrams | Licensed art Ontrack does not have. |
| B19 | Journal of daily habits and "What happened last night?" | Built to explain sleep and recovery, which Ontrack does not measure. |
| B20 | Weather chip, Bevel Pro upgrade card | Not part of a food and lifting tracker; the proof of concept has no payments. |

[BV-ONB]: https://mobbin.com/flows/0b6f9210-c215-4b32-872d-3fb66ab3ed28
[BV-WORK]: https://mobbin.com/flows/be713de3-2956-48c2-aefc-dd73108540df
[BV-FOOD]: https://mobbin.com/flows/7d599d56-4310-4cc1-8f75-be64fd180c72

## Sources

Mobbin, iOS captures. A key opens the flow or screen on Mobbin.

[CA-ONB1]: https://mobbin.com/flows/05ca2ff4-106a-4fda-a0dd-3cc9b73a83c1
[CA-ONB2]: https://mobbin.com/flows/579da5dd-453a-4e7c-9c11-d20708a4db82
[CA-PROF]: https://mobbin.com/flows/c35ddf72-63b5-4e53-84d3-ada7584724c9
[CA-HEALTH]: https://mobbin.com/flows/1bef5ad4-3eba-4428-9911-dcf58df7617f
[CA-SCAN]: https://mobbin.com/flows/6b462ef7-927a-45b8-87a3-ee3c3f2dd814
[CA-TIPS]: https://mobbin.com/flows/787289b6-39d6-4066-a8f9-d1f5e463bebe
[CA-DB]: https://mobbin.com/flows/cf6710b8-8118-4638-8cbe-e58d798dd981
[CA-BAR]: https://mobbin.com/flows/6e45732e-2fc3-4688-996a-67e9cd1c6553
[CA-FIX]: https://mobbin.com/screens/dc3170f8-ae6d-40b3-8659-497724c20367
[CA-PROG]: https://mobbin.com/screens/dc43f6be-c5f3-463f-9b39-1d7cb3fa3975
[CA-WEIGH]: https://mobbin.com/screens/e21f51fa-9009-4e82-b3ca-4b0e60a42a4c
[CA-STREAK]: https://mobbin.com/screens/f48da1ad-4de3-4900-9abd-6978316b5bb7
[CA-PLAN]: https://mobbin.com/screens/f082a02c-7c69-48e6-8eda-46a84f59bc21
[CA-GRP]: https://mobbin.com/screens/8f408b55-d7b9-4b7a-91f5-40c404edccae
[CA-LOG]: https://mobbin.com/screens/e614aecc-ad5b-4f61-86ef-7b52e1927031
[CA-SEL]: https://mobbin.com/screens/fca464bb-acce-40e0-9ce1-2a8aac0a530b
[CA-EX]: https://mobbin.com/screens/ed9935aa-defe-4656-907f-3cc18e44d067
[CA-SUG]: https://mobbin.com/screens/e363d6fb-4e38-49e3-996d-b3b6a9c5b67f
[AL-ONB]: https://mobbin.com/flows/6e3d85dd-e2ea-4747-93a7-1104b0e06c9e
[AL-PROF]: https://mobbin.com/flows/d483f878-758d-4672-90e7-3bc78581efb8
[AL-PAY]: https://mobbin.com/flows/afe2cc2a-7672-43f7-b75c-15c1ff369a52
[AL-WIDGET]: https://mobbin.com/screens/fe23c4a3-b043-432c-aa9f-9bb4db519889
[AL-STREAK]: https://mobbin.com/screens/fa71c558-018e-49cb-8301-8ff281c848b9
[AL-SCORE]: https://mobbin.com/screens/f38f6b7b-fd6d-4592-923a-91bc8d83ba98
[AL-COMPOSE]: https://mobbin.com/screens/e9a53abe-0ddd-4212-b16c-268cb18c2576
[AL-MEAL]: https://mobbin.com/screens/e7aa8468-f3cd-4617-8230-34c17f87da75
[AL-GOALS]: https://mobbin.com/screens/e07574ca-806f-47b5-a2ce-e686980ae116
[AL-HOME]: https://mobbin.com/screens/decbd1d7-a973-4d84-821d-a7dc1e83d85f
[AL-ASK]: https://mobbin.com/screens/da3670e3-53fd-4404-becb-04f4e301e6b0
[ST-ONB]: https://mobbin.com/flows/4f843ca4-a7d4-4ace-a924-613b749fcefe
[ST-REC]: https://mobbin.com/flows/17faedac-bd67-457c-b3ce-136a8573fbde
[ST-SAVE]: https://mobbin.com/flows/a5ac4455-5b84-443a-b0e3-4273865a507e
[ST-START]: https://mobbin.com/flows/e6356a85-1710-4b88-b329-e6d3df02d2b6
[ST-CHAL]: https://mobbin.com/flows/8dd734fc-b270-4299-9a51-f36e46bd9675
[ST-ACT]: https://mobbin.com/flows/067d8ea3-0e65-4728-afcc-295c7b2ccabd
[ST-ANA]: https://mobbin.com/flows/ee55413e-0ad6-40ae-a986-b3eb9b8667d7
[ST-ROUTE]: https://mobbin.com/flows/ebca51c4-50d1-418f-9224-7464d64e521f
[ST-CLUB]: https://mobbin.com/flows/bbf4e19d-e4a0-4894-9ae4-c899b80ef316
[ST-CLUBS]: https://mobbin.com/flows/5f2ecfd3-611a-4979-ad20-e28b5812b2aa
[ST-GOAL]: https://mobbin.com/flows/baee1b36-d299-497c-89c7-7dd3af5b0a96
