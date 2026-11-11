# Ontrack: the science

This file is the specification for `src/lib/model/engine/`. Engine version 1.

**Status of the numbers.** Every value is provisional until the `science-check` skill has confirmed it against its primary source in M2 and recorded the result in `docs/SOURCES.md`. Compendium codes and MET values in section 5 marked "seen" were read on pacompendium.com on 2026-11-11 and still go through the check. Values marked "assumption" are engineering choices, not findings. They are labelled as such in the app.

**Stance.** Equations give a starting estimate that is commonly within about 10 percent for most people (S18). The weekly check-in in section 10 is what makes a target accurate for one person. The app says so.

## 1. Inputs

Sex used for the equation (male, female, unspecified), age from birth year, height in cm, weight in kg, optional body fat percent, daily movement level, the training program, goal, pace, experience, calorie mode.

## 2. Resting energy (BMR), kcal per day

- With body fat percent between 5 and 60: `FFM = W * (1 - bf / 100)`, `BMR = 370 + 21.6 * FFM` (S2).
- Otherwise Mifflin-St Jeor (S1): `BMR = 10 * W + 6.25 * H - 5 * A + s`, with `s = +5` male, `-161` female, `-78` unspecified (the mean of the two, an assumption).

Do not round intermediate values. Round only what is shown.

## 3. Daily movement outside workouts

`baseline = BMR * factor`. The factor covers digestion and all movement except logged sessions. The step bands follow S3. The factors are assumptions (S4), chosen low because exercise is added separately, and corrected by the check-in.

| Level | Meaning shown to the user | Factor |
| --- | --- | --- |
| `seated` | Mostly sitting. Under 5,000 steps | 1.20 |
| `light` | Some walking. 5,000 to 7,500 steps | 1.30 |
| `moving` | On your feet much of the day. 7,500 to 12,500 steps | 1.45 |
| `physical` | Physical job. Over 12,500 steps | 1.60 |

## 4. Exercise energy per session

`EEE = (MET - 1) * W * minutes / 60`. One MET is subtracted because resting energy is already in the baseline.

## 5. MET values (S5, 2024 Adult Compendium)

| Type | Light | Moderate | Hard | Basis |
| --- | --- | --- | --- | --- |
| `strength` | 3.5 | 5.0 | 6.0 | Codes 02054, 02052, 02050. Seen |
| `circuit` | 3.5 | 5.0 | 7.5 | Codes 02034, 02035, 02040. Seen |
| `cardio` | 4.0 | 6.8 | 9.0 | Codes 01010, 01200, 02049. Seen |
| `mobility` | 2.3 | 2.8 | 4.0 | Codes 02175, 02105, 02160. Seen |
| `walk` | 2.8 | 3.5 | 4.8 | Find the matching walking codes in M2 |
| `sport` | 4.0 | 6.0 | 8.0 | Assumption: mid points of the light, moderate and vigorous bands |

`eeeByWeekday[d]` is the sum of `EEE` for that weekday's sessions. `weeklyEEE` is the sum of the seven.

## 6. Maintenance and the goal adjustment

- `tdeeAvg = baseline + weeklyEEE / 7`.
- Energy per kg of body weight change: 7,700 kcal (S6). One value in both directions is an assumption that slightly overstates the cost of lean gain. The check-in absorbs the error.
- Wanted change: `wanted = ratePctPerWeek / 100 * W * 7700 / 7`.

| Goal | Pace options, percent of body weight per week | Default |
| --- | --- | --- |
| `lose` | gentle 0.25, steady 0.5, faster 0.75 (offered only at BMI 25 or more) | steady |
| `maintain` | 0 | |
| `gain` | lean 0.25, standard 0.5 | standard for beginners and for BMI under 18.5, otherwise lean |

Sources for the bands: S7 for gaining, S9 for losing.

- `lose`: `delta = -min(wanted, 0.25 * tdeeAvg)`. Flag `deficitCap` if the cap applied.
- `gain`: `delta = +min(wanted, 0.20 * tdeeAvg)`. Flag `surplusCap` if the cap applied.
- `maintain`: `delta = 0`.

## 7. Daily targets

- `matched` mode: `raw(d) = baseline + eee(d) + delta`, where `eee(d)` is that weekday's value, or 0 when every session that day is marked skipped.
- `even` mode: `raw = tdeeAvg + delta`.
- Floor (S14): 1,200 for the female equation, 1,500 for male, 1,350 for unspecified. If `raw` is below the floor the target is the floor and the plan carries the `floor` flag.
- `target = round(raw / 10) * 10`.
- The effective rate shown to the user is recomputed from the delta actually applied after caps and floors.

## 8. Macros

- Protein per kg (S8, S9, S10): gain 1.8, lose 2.0, maintain 1.6. Reference weight is body weight, or the weight at BMI 25 for the user's height when BMI is over 30. `proteinG = round(perKg * refWeight)`.
- Fat (S7, S16): `fatG = round(max(0.25 * evenTarget / 9, 0.6 * W))`, where `evenTarget` is the unrounded even mode target after caps and floors.
- Carbs are the remainder for each day: `carbsG = max(0, round((target - 4 * proteinG - 9 * fatG) / 4))`.
- If protein and fat alone exceed the target, lower fat to `max(0.5 * W, (target - 4 * proteinG) / 9)`.

Protein and fat are the same every day. Carbs move with the day's calories.

## 9. On track, per day

| Goal | Calories on track when intake is | Protein on track when |
| --- | --- | --- |
| `gain` | 95 to 115 percent of target | 90 percent of target or more |
| `maintain` | 90 to 110 percent | same |
| `lose` | 90 to 105 percent, and not below the floor | same |

These bands are assumptions for feedback, not science. A day counts toward the week when calories are on track. Below the band reads "to go" (gain) or is simply neutral (lose). Above the band is neutral ink with a plain note. Nothing is ever red.

## 10. Weight trend and the weekly check-in

**Trend line for display.** Exponential smoothing over days with a weigh-in, `trend = prev + 0.1 * (kg - prev)`, starting at the first value (S17, a convention).

**Rate for decisions.** Ordinary least squares slope over the raw weigh-ins of the last 21 days, in kg per day. Needs at least 8 weigh-ins spanning at least 14 days.

**Complete day.** A day is complete when the user closed it, or when it has at least two logged items and at least 50 percent of that day's target.

**The check-in** runs on the user's chosen weekday when at least 14 days have passed since the plan started or last changed.

1. Not enough weigh-ins: reason `need_data`, no change.
2. Fewer than 10 complete days in the window: compute the rate only. `change = (targetRate - observedRate) / 100 * W * 7700 / 7`, signed for the goal, clamped to plus or minus 100. Reason `raise` or `lower`, or `on_track` when the change is under 50.
3. Otherwise:
   - `tdeeObserved = meanIntake - slopeKgPerDay * 7700`, with the mean over complete days.
   - Adherence: if `meanIntake` is under 90 percent of `meanTarget` on a gain goal, or over 110 percent on a lose goal, the reason is `adherence` and no change is proposed. The message says the target was fine and the gap was intake.
   - Else `tdeeNew = 0.5 * tdeeAvg + 0.5 * tdeeObserved`, clamped to within 10 percent of `tdeeAvg`. The new baseline is `tdeeNew - weeklyEEE / 7`. Recompute the plan from sections 6 to 8 with the current trend weight.
   - If the even mode target moves by less than 50 kcal, reason `on_track`. Otherwise `raise` or `lower`, with the move clamped to plus or minus 200.
4. Accepting creates a new plan with `source: 'checkin'`, `tdeeSource: 'measured'`, effective from the next day. Keeping records the decision and changes nothing.

## 11. Training analysis

Computed from the program. One set counts 1 for each primary muscle and 0.5 for each secondary muscle.

| Check | Rule | Message when outside | Source |
| --- | --- | --- | --- |
| Weekly sets per muscle | Under 6 low. 6 to 9 building. 10 to 20 in range. Over 20 high | Add or remove sets to reach 10 to 20. Beginners are told 6 to 9 is a fine start | S11 |
| Sessions per muscle per week | 2 or more | Train it twice a week | S12 |
| Strength sessions per week | 2 or more. With a gain goal this is the first recommendation shown | Add strength sessions | S13 |
| Cardio minutes per week | 150 to 300 moderate, with hard minutes counting double | Informational. With a gain goal and over 150 minutes: the app notes that the target already includes it | S13 |
| Rest days | At least 1 day with no hard session | Add a rest day | Assumption |
| Session length | Over 120 minutes | Informational | Assumption |

When a program has no exercises listed, only the session level checks run and the Train tab invites the user to add exercises for the muscle analysis.

## 12. Guardrail thresholds

Age under 18 blocks use. BMI under 18.5 removes the lose goal (S15). BMI 18.5 to 20 limits lose to gentle. A goal weight below BMI 18.5 is refused. BMI under 16 shows the doctor card. Any screening answer sets the `maintainOnly` flag or ends onboarding, as the PRD describes.

## 13. Test vectors

Unit tests must reproduce these exactly. Weekdays: 0 is Monday.

**A. Hardgainer.** Male, 25, 175 cm, 60 kg, `seated`, strength moderate 60 min on days 0, 2, 4, 5, gain at 0.5.
BMI 19.59. BMR 1573.75. Baseline 1888.5. EEE per session 240, weekly 960. tdeeAvg 2025.642857. Wanted 330, cap 405.13, delta +330.
Matched: training days 2460, rest days 2220. Even: 2360.
Protein 108 g. Fat 65 g. Carbs: training 361 g, rest 301 g, even 336 g. Flags none.

**B. Cutter.** Female, 30, 165 cm, 70 kg, `light`, cardio moderate 45 min on days 1 and 3, strength light 45 min on day 5, lose at 0.5.
BMI 25.71. BMR 1420.25. Baseline 1846.325. EEE: cardio 304.5, strength 131.25, weekly 740.25. tdeeAvg 1952.075. Wanted 385, cap 488.02, delta -385.
Matched: cardio days 1770, strength day 1590, rest days 1460. Even: 1570.
Protein 140 g. Fat 44 g. Carbs: cardio day 204 g, strength day 159 g, rest 126 g. Flags none.

**C. Body fat path and deficit cap.** Male, 40, 180 cm, 95 kg, body fat 30, `seated`, no training, lose at 0.75.
BMI 29.32. FFM 66.5. BMR 1806.4. Baseline and tdeeAvg 2167.68. Wanted 783.75, cap 541.92, delta -541.92. Target 1630 every day. Flags `deficitCap`. Effective rate 0.519 percent per week.
Protein 190 g. Fat 57 g. Carbs 89 g.

**D. Floor.** Female, 45, 155 cm, 55 kg, `seated`, no training, lose at 0.5.
BMI 22.89. BMR 1132.75. tdeeAvg 1359.3. Wanted 302.5, cap 339.83, raw 1056.8, target 1200. Flags `floor`. Effective rate 0.263 percent per week.
Protein 110 g. Fat 33 g. Carbs 116 g.

**E. Unspecified sex.** 30, 170 cm, 70 kg. BMR 1534.5.

**F. Check-in on plan A.** Window has 12 complete days, mean intake 2300, slope +0.010 kg per day, weight 60.
Mean target 2357.14, intake is 97.6 percent of it, so not an adherence case. tdeeObserved 2223. tdeeNew 2124.32 (inside the 10 percent clamp). New baseline 1987.18. New matched targets: training 2560, rest 2320. Proposal: raise by 100.

**G. Check-in, adherence.** Same as F with mean intake 2050. Intake is 87 percent of target. Reason `adherence`, change 0.

## 14. Sources to verify (the ledger starts here)

| Id | Claim used | Citation to check |
| --- | --- | --- |
| S1 | Mifflin-St Jeor equation and constants | Mifflin MD, St Jeor ST, et al. Am J Clin Nutr. 1990;51(2):241-247 |
| S2 | `370 + 21.6 * FFM` | Attributed to Katch and McArdle, and to Cunningham JJ, Am J Clin Nutr. 1991;54(6):963-969. Find which source states it |
| S3 | Step count bands | Tudor-Locke C, Bassett DR. Sports Med. 2004;34(1):1-8 |
| S4 | Movement factors 1.20 to 1.60 | Assumption. Compare against FAO/WHO/UNU Human Energy Requirements, 2001 |
| S5 | MET values and codes | Herrmann SD, et al. J Sport Health Sci. 2024;13(1):6-12. doi:10.1016/j.jshs.2023.10.010. Tables at pacompendium.com |
| S6 | 7,700 kcal per kg | Hall KD. Int J Obes. 2008;32(3):573-576 |
| S7 | Gain 0.25 to 0.5 percent per week, surplus 10 to 20 percent, fat 0.5 to 1.5 g per kg | Iraki J, Fitschen P, Espinar S, Helms E. Sports (Basel). 2019;7(7):154 |
| S8 | Protein 1.6 g per kg, upper bound 2.2 | Morton RW, et al. Br J Sports Med. 2018;52(6):376-384 |
| S9 | Loss 0.5 to 1 percent per week, higher protein when cutting | Helms ER, Aragon AA, Fitschen PJ. J Int Soc Sports Nutr. 2014;11:20 |
| S10 | Protein 1.4 to 2.0 g per kg for exercising people | Jager R, et al. J Int Soc Sports Nutr. 2017;14:20 |
| S11 | 10 or more weekly sets per muscle | Schoenfeld BJ, Ogborn D, Krieger JW. J Sports Sci. 2017;35(11):1073-1082 |
| S12 | Training a muscle twice weekly | Schoenfeld BJ, Ogborn D, Krieger JW. Sports Med. 2016;46(11):1689-1697 |
| S13 | 150 to 300 moderate minutes, strength on 2 or more days | Bull FC, et al. Br J Sports Med. 2020;54(24):1451-1462 |
| S14 | Floors of 1,200 and 1,500 kcal | NHLBI, The Practical Guide: Identification, Evaluation, and Treatment of Overweight and Obesity in Adults, 2000 |
| S15 | BMI 18.5 as the underweight threshold | WHO BMI classification |
| S16 | Fat at 20 to 35 percent of energy | Institute of Medicine, Dietary Reference Intakes for macronutrients, 2005 |
| S17 | Smoothing factor 0.1 | Convention. Assumption |
| S18 | Accuracy of predictive equations | Frankenfield D, Roth-Yousey L, Compher C. J Am Diet Assoc. 2005;105(5):775-789 |

## 15. What the app says about certainty

- On the plan screen: "This is a starting estimate. Ontrack corrects it from your own results after two weeks."
- On an estimate item: the label Estimate, and nothing more.
- In The science: each entry shows its citation and one of three statuses: Verified, Working assumption, or Being checked.
