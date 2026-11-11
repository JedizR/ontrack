# Ontrack: product requirements

## 1. The product in one paragraph

Ontrack tells you how much to eat for the body you are training for, and keeps that number honest. You tell it how you train and what you want. It sets a daily calorie and protein target from published equations, raises the target on training days, and corrects itself every week from your own weigh-ins and food log. Logging a meal takes one photo. It is built first for people who struggle to gain weight: for them the target is a floor to reach, not a ceiling to stay under.

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
4. **No guilt.** No red for food, no streaks to break, no moral words about eating.
5. **Works without signal.** Everything except photo and text analysis works offline and syncs later.
6. **Private by default.** Photos are analysed and discarded. Only a thumbnail is kept.

## 4. The three differentiators in v1

| Differentiator | What v1 ships | What comes later |
| --- | --- | --- |
| Camera logging, better for Thai food | Photo to itemised meal in one step. The model identifies components and grams. A bundled USDA table supplies nutrition when there is a match. Everything else is labelled an estimate. A one tap "cooked with oil" correction. Every analysis is kept so it can become an evaluation set | A Thai food table, Thai dish aliases, and an accuracy loop measured on real photos |
| Your training makes the target accurate | A weekly program (days, type, duration, intensity, optional exercises). Exercise energy is computed per session from Compendium MET values and added to that day's target. Program analysis with recommendations from the literature. A weekly check-in that measures real maintenance from weigh-ins and intake and corrects the target | Set by set logging, strength trends, wearable import through a native shell |
| Works for skinny people building muscle | Gain mode: the target is a floor, progress fills toward it, going a little over is still on track. Evening "easy adds" when behind. A protein floor. Gain rate tracked against a lean bulk band. The target rises when weight is flat | Push reminders, meal plans |

## 5. Features and acceptance criteria

IDs are stable. Tests and commits refer to them.

### F1 Sign-in
- Sign in with Google, or with a 6 digit code sent by email. No passwords, no magic links.
- Works inside the installed home screen app on iPhone. The session survives closing the app and restarting the phone.
- Signing out waits for unsynced changes, then wipes local data on the device.
- Deleting the account removes all rows, photos and the auth user, and says so.

### F2 Onboarding and plan
- At most nine screens, one question each, large controls, a visible step count, back always available. Completable in under 90 seconds.
- Collects: goal, sex used for the equation, birth year, height, weight, daily movement outside workouts, training (days, type, length), experience, pace. Optional: body fat, goal weight.
- Ends on "Your plan": calories for training and rest days, protein, the expected rate of change, and a "how this was calculated" breakdown that sums exactly to the target.
- In Safari on iPhone, the first thing shown is how to add Ontrack to the home screen. The installed app has separate storage, so setup belongs there.
- The screening step in section 7 runs before any target is shown.

### F3 Today
- Shows calories eaten against today's target, protein, carbs and fat, today's training session and today's meals. With up to three meals it fits a 390 by 844 screen without scrolling.
- The week strip moves to any of the last 7 days. Earlier days are reachable from Progress.
- The target reflects whether today is a training day and whether the session was marked done or skipped.
- Every edit shows immediately, offline included. Delete offers undo for 5 seconds.

### F4 Log by photo
- From the plus button to the camera in one tap. From shutter to a reviewable list in under 8 seconds on 4G for a typical plate.
- The review sheet lists each component with grams, calories and a source label (Database or Estimate). Grams are editable with a stepper and portion chips (half, same, one and a half, double). Items can be removed or added.
- A "cooked with oil" control adds 1 teaspoon or 1 tablespoon of oil as its own item.
- Not food, blurry, offline, over the daily limit, and provider failure each have a specific message and a path to another way of logging.
- The original photo is never stored. A 320 px thumbnail is.

### F5 Log without a photo
- Search the bundled food table (works offline), pick a portion, add.
- Describe a meal in a sentence and get the same review sheet as a photo.
- Quick add: calories, optional protein, carbs and fat, optional name, on a custom keypad.
- Recent and saved meals can be logged again in two taps. Any logged meal can be saved.

### F6 Weigh-ins
- Log weight in one sheet with the keypad. One value per day. Logging again replaces it.
- Progress shows raw weigh-ins as dots and a smoothed trend line.
- A quiet prompt on Today when there is no weigh-in in the last 3 days.

### F7 Training program
- Build a week: for each day, zero or more sessions with type, name, minutes and intensity.
- Start from a template (Full body 3 days, Upper lower 4 days, Push pull legs 6 days, Minimal 2 days) or from scratch.
- Optionally list exercises with sets and a rep range, chosen from a bundled library.
- Analysis shows weekly sets per muscle group against the evidence band, sessions per muscle group, weekly cardio minutes against the WHO range, and rest days.
- Recommendations are specific ("Back gets 6 sets a week. Add 4 to reach the range linked with better growth"), each with its source.

### F8 Training-day targets
- By default calories are higher on training days by that session's estimated energy cost and lower on rest days, with the same weekly total. One setting switches to the same target every day.
- Mark a session done or skipped from Today. Skipping returns the day to its rest target.

### F9 Weekly check-in
- Appears once a week when there is enough data: at least 8 weigh-ins across 14 days.
- Shows the measured rate of change against the target rate, average intake against average target, and measured maintenance calories when intake logging is sufficient.
- Proposes a target change of at most 200 kcal, or none, with the reason in one sentence. The user accepts or keeps the current target. Nothing changes silently.
- Separates "you ate under your target" from "your target was wrong" and says which it was.

### F10 Gain mode
- With a gain goal, Today counts up toward the target and shows what is left to eat. Reaching 95 percent or more is on track. Going over by up to 15 percent is still on track.
- After 18:00, if more than 25 percent of the target remains, Today offers three calorie dense foods sized to close the gap, each loggable in one tap.
- A gain goal with fewer than two strength sessions a week produces one clear recommendation to add them.

### F11 Progress
- Weight trend with the target rate band, weekly average calories and protein, days on track per week, check-in history, and measured maintenance when known.
- Any past day opens in the same view as Today and can be edited.

### F12 Settings and data
- Profile, goal and pace, units, theme (system, light, dark), text size, calorie mode, check-in day.
- Export everything as JSON and meals as CSV through the share sheet.
- "The science" lists every equation and constant with its citation and status.
- Privacy explains photo processing in plain words before the first photo is taken.

### F13 Install, offline, updates
- Installable from Safari with a guided, illustrated flow that matches the current iOS share menu.
- Cold start to an interactive Today in under 1.5 seconds on an iPhone 12 with a year of data.
- When a new version is ready, a toast offers to update. No silent reloads.
- A small status mark shows synced, syncing, waiting for connection, or needs attention.

## 6. Not in v1

In priority order for later: Thai food table and Thai language. Barcode scanning. Set by set workout logging and strength trends. Push reminders. Apple sign-in. Water and micronutrients. Meal plans and recipes. Coach or social features. Payments. Native wrappers and Health data import.

## 7. Guardrails

Ontrack gives general wellness guidance, not medical advice, and says so at onboarding and in Settings.

- Adults only. A birth year that makes the user under 18 ends onboarding with a kind explanation.
- A screening step asks whether any of these apply: pregnant or breastfeeding, a medical condition or medication that affects diet, a current or past eating disorder. If any applies, Ontrack recommends working with a clinician. For the first two it then offers tracking with a maintenance target only. For the third it advises against calorie tracking without professional support and offers to exit.
- No weight loss goal below BMI 18.5. Between 18.5 and 20 only the gentle pace is offered. A goal weight cannot be set below BMI 18.5.
- Daily targets never go below 1,200 kcal (female equation) or 1,500 kcal (male equation). A deficit never exceeds 25 percent of maintenance. A surplus never exceeds 20 percent.
- BMI under 16 shows a card suggesting a doctor's visit, without blocking a gain or maintain plan.
- Language is neutral. No "good" or "bad" foods, no "cheat", no "burn off". Going over a target is shown in neutral ink, never red.
- No before and after imagery, no body shape goals, no weight loss countdowns.

## 8. Quality bars

| Measure | Bar |
| --- | --- |
| Initial JavaScript, gzip | 130 KB or less. Supabase, charts, camera and settings load lazily |
| Cold start to interactive, iPhone 12 | 1.5 s or less |
| Tap to visible response | 100 ms or less. Every tap has a pressed state |
| Photo to review sheet | 8 s or less at the median |
| Layout | No horizontal overflow, no clipped text, tap targets 44 px or more, on iPhone SE, 15 and 15 Pro Max, at all three text sizes, light and dark |
| Contrast | Text 4.5 to 1 or better. Large numerals 3 to 1 or better |
| Offline | Every feature except photo and text analysis works in airplane mode and syncs within 10 s of reconnecting |
| Tests | Every engine test vector passes. The sync conformance suite is green on both backends. One end to end test per feature |

## 9. Risks

| Risk | Response |
| --- | --- |
| Photo calories are wrong for mixed dishes and hidden oil | Label estimates honestly, make correction fast, and rely on the weekly check-in as the safety net, because it corrects the target from outcomes rather than from logged calories alone |
| Google sign-in misbehaves in the installed app | Test on a real iPhone at the M3 gate. Email code is the fallback |
| Free tiers change or pause | A daily keep-alive, a provider interface for vision, portable handlers, a JSON export |
| The app nudges someone toward harmful restriction | The guardrails in section 7, reviewed by a dietitian before public launch |
| A science constant is wrong | Nothing ships as verified without a checked primary source. Provisional values are labelled in the app |
