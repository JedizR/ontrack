# R2: the whole app, organised again (17 November)

Branch `app-research-onboarding-polish`, local only. The owner: no commit, no PR, no long CI; changes show live on localhost. Opus owns the product decisions on this branch. Research is in `/Users/admin/destination/ontrack-design/research/r2/`: `strava-ia`, `strava-activity` and `ai-analytics`, each with a `NOTES.md` and contact sheets.

## How the app is organised

| Place | Answers | Above the fold at 390 by 664 (Safari with toolbars) |
| --- | --- | --- |
| Today | Where do I stand, and what is next? | Day strip; **one card with small boxes** (the owner's pick, 17 November): the haze panel (kcal left big, eaten beside it, the track), three grey macro boxes, then the session box (Start or Done; a tap on its name opens its menu) and the weigh-in box; the meals |
| Train | What is my workout, and am I getting stronger? | One card: the featured panel (next session, the week's ring, Start), then the muscle map box and two boxes (sets and kg lifted this week); best lifts under it |
| Progress | Is it working? | **The chart is the page** (the owner, 17 November). Above it, pick what it shows: Weight, Calories, Protein or Training. One card: the figure on the haze (weight with Weigh in; calories eaten with calories burned beside it; protein against target; sessions done with kg lifted), the chart (4 weeks: one bar a day; calories add the burned line, living plus the day's exercise, with exercise as a lavender band; protein adds its target band; 3 months and All: weekly bars), the range under it, then three boxes (weight: 7 and 30 day change and the goal; calories: in, out, balance; protein: average, target, days in range; training: strength and cardio a week, kg lifted). Under the card: the AI week recap with Ask Ontrack, then the chosen metric's detail (the goal; by week and maintenance; the training meters), consistency, check-ins, History |
| The plus | Log anything | What did you eat (photo, scan, search, quick add, describe, speak), then Weigh in and Start today's session; Recent and Saved |
| Header | | Title, the food map, the avatar (profile and settings) |

- **Three tabs plus the plus.** Strava has five slots. Ontrack has three jobs: eat, lift, see results. Friends are thin, so the map stays in the header.
- **No bell.** It was empty, and its notices already show where they act. A check-in waiting is a dot on the Progress tab (Strava's 8 pt dot, no count). A new account's first steps are the Up next weigh-in row and a "Log your first meal" row.
- **Today leads with what is left** (Cal AI). The eaten figure stays beside it, so tests and habits that read "eaten" still find it.

## The layout rule (the owner, 17 November)

Every page leads with **one card holding small boxes**: a white shell (radius 48, 8 inside) with the page's one gradient panel on top and grey boxes under it, 8 apart. The boxes at the shell's corners take its corner less the gap (40), the rest radius 24. The aim is that the page's main content fits one screen height at 390 by 664, and at 375 by 548 with short-screen padding (`[@media(max-height:620px)]`), so the user scrolls only for detail. The owner tried separate bento tiles on the canvas and chose this compact version.

## Joy

- **The finished workout** gets a full screen in the style of Strava's "Nice work", until Continue. It shows:
  - lavender, peach and coral ribbons that draw in;
  - the week's ring;
  - time, sets and kg lifted, counting up;
  - each new best with what it beat;
  - the muscles worked.
- **Muscle map:** Strava's strength view, with the three violet steps Strava lacks (S11 volume bands) and a legend. It appears on Train (this week) and on the finish screen. The path data is from react-native-body-highlighter (MIT), vendored as data in `src/lib/data/body-*.ts`.
- **Week ring:** Strava's goal ring. Sessions done of planned, green with a check when the week is done.

## AI that explains, never decides (`/api/coach`)

Numbers are slots. The model writes `{{slot}}`, the server rejects any digit outside a slot, and the app fills the slots from the engine. So the model cannot change a number, and the AI-never-decides-a-target invariant holds. Each feature has a deterministic template when offline or over quota. Real AI text is labelled "Written by AI".

1. **Week recap** on Progress: a headline and 2 or 3 lines.
2. **Why this target** in the check-in: two sentences.
3. **Session summary** on the finish screen: one line.
4. **Close the gap** on Today: 3 foods from the food table that close the protein gap, each with a reason.
5. **Ask Ontrack:** questions about your own last weeks, answered from the facts. It refuses targets and medical advice.

## Built so far (R2)

- **Today:** the hero rebuilt; Up next without the eyebrow; the weigh-in shrinks to one line once done; the first-meal row; a compact week strip.
- **Header and dock:** the bell, notices sheet, notices store and `prefs.noticesRead` are removed; the dock has an attention dot.
- **Add:** Weigh in and Start today's session under the composer.
- **Train:** Up next with the ring and the exercises; the muscle map card; Best lifts moved here from Progress.
- **Workout:** the finish screen (`WorkoutDone.svelte`) replaces the in-sheet summary.
- **Progress:** Log weight sits beside the trend; the goal is one quiet line until set; the glance tiles are gone.
- **New components and data:** `MuscleMap`, `WeekRing`, `data/body*.ts`, and `muscleSets`, `weekLevels` and `sessionLevels` in `model/workout.ts`.

## Also built

- **Check-in:** a full-screen story on the landing sky, with three bars at the top and Back and Close. The steps and test ids are the check-in sheet's. The middle frame carries the AI "why this target".
- **Ask Ontrack:** a sheet from the week recap. It offers three suggested questions and a field, and answers from `weekFacts` only.
- **Calories out per day:** `DayStats.living` (the plan's baseline) plus `DayStats.exercise` (the energy of the sessions done), in `model/progress.ts`.

## The owner's second round (17 November)

- **Today**
  - The hero leads with kcal eaten. What is left is the counterpart; on track, "On track" with its check, and the amount in its caption.
  - **Done:** the session box turns the action's ink, spreading from the button. The words turn after a quarter second, the check becomes a filled green circle with a burst of dots, and Done becomes a grey Undo of the same size. "Done" leaves the line.
  - **Undo** plays it backwards, faster: the words and the check go at once, then the ink closes into the button.
  - **Suggestions:** the featured lavender card, "62 g protein to go". The user's own logged foods come first, ranked by how often they are logged, then the table's.
- **Progress**
  - The chart is always there; with nothing to show, "No data yet" in its middle.
  - The boxes sit under the figure (64 high, radius 24); the range is small pills at the chart's head.
  - Before a trend, the last weigh-in is the figure, with "1 of 8 weigh-ins for your first check-in".
- **Train**
  - **The week:** a 7-column grid. An icon per session (lifting ink, cardio lavender, done green), the day's minutes, a plus on an empty day; the session's name and facts are in hidden text for screen readers and tests.
  - **The session sheet:**
    - "Cardio after" on a lifting session: a linked session `<key>-c` on the same day, with minutes, intensity and setup;
    - cardio and walk sessions carry `setup` (machine, speed km/h, incline percent, level), a new optional field on `Session` in `shared/records.ts`.
  - Program changes apply **from today**, using tomorrow's plan's numbers (a check-in accepted today is kept).
  - The store's `updatedAt` is now later than any record it holds, so two plans saved the same day order by when they were written (`db/store.svelte.ts`).
- **Shell**
  - **Header:** at rest it is the page; scrolled, the landing's glass capsule. A fade sits at the very top edge.
  - **Dock:** clearer (30 percent tint).
  - **Week strip:** taller, with more padding (small phones unchanged).
- **Add:** whey and creatine pinned at the top in one line, with a plus for any other supplement.
- **Review:** an item that may hide fat starts at 1 tsp of oil.
- **Onboarding:** a goal weight step after height and weight, for lose and gain. It holds a wheel and the healthy range for the height (the BMI bounds the engine already uses, S15) as a band with today and the goal, plus Skip.
- **Done by agents (R2):**
  - **Thai food table:** 983 foods, 313 more: 139 from INMU, 97 Thai dishes computed by recipe from sourced ingredients (`recipe:` rows, data/thai/recipes), 74 USDA and 3 owner rows. Every common pad kra pao protein comes with rice, and with rice and egg; the other dish families have their protein variants. Gaps: 7-Eleven meals, jok variants, beef and pork khao soi, garlic pepper stir fries.
  - **Thai recognition (`docs/AI-THAI.md`):** each item carries `dish`, `protein` and `extras`, and `server/vision/thai.ts` resolves a Thai plate to its exact variant, so a correction ("duck, not pork") beats a stale id. Table items never carry hidden fat, since their oil is in the table. The live text eval scored 30 of 30 before and after once the variants were in the table; the resolver also reaches all 30 without the model's ids. Rejected, with reasons in the doc: aliases in the prompt, enums, BM25 and Orama (Thai has no spaces), embeddings.
  - **AI program adjust:** a coach kind `program` (two tries of 25 s, a 55 s client wait, 60 s on Vercel). In Train, "Adjust with AI" proposes the whole week and applies it with Undo.

## Next

1. Wire the coach (above) into Progress, the finish screen, the check-in, Today and an Ask sheet.
2. Turn the check-in into a three-frame story: what happened, the numbers, the new target with Accept. This is Strava's Month in Sport format, tap to advance, never automatic.
3. Review: put the Time field behind a tap; show Saved without the switch.
4. Onboarding in dark mode: a dark sky.
5. Fit pass at 375 by 548, then the owner's eye on the phone.
