# Ontrack: the science

This file is the specification for `src/lib/model/engine/`. Engine version 1.

**Status of the numbers.** Every source was checked in M2 by the `science-check` skill. `docs/SOURCES.md` holds each verdict and `src/lib/model/engine/constants.ts` each value's status. Values marked "assumption" are engineering choices, not findings, and the app labels them Working assumption. Corrections the check made, and choices kept against a source, are listed under M2 in `docs/DECISIONS.md`.

**Stance.** Equations give a starting estimate. Mifflin-St Jeor predicted resting energy within 10 percent of measured in more people than any other equation, but one person's error can be larger (S18). The weekly check-in in section 10 is what makes a target accurate for one person. The app says so.

## 1. Inputs

Sex used for the equation (male, female, unspecified), age from birth year, height in cm, weight in kg, optional body fat percent, daily movement level, the training program, goal, pace, experience, calorie mode.

## 2. Resting energy (BMR), kcal per day

- With body fat percent between 5 and 60: `FFM = W * (1 - bf / 100)`, `BMR = 370 + 21.6 * FFM` (S2).
- Otherwise Mifflin-St Jeor (S1): `BMR = 10 * W + 6.25 * H - 5 * A + s`, with `s = +5` male, `-161` female, `-78` unspecified (the mean of the two, an assumption).

Do not round intermediate values. Round only what is shown.

## 3. Daily movement outside workouts

`baseline = BMR * factor`. The factor covers digestion and all movement except logged sessions. The step bands follow S3 (7,500 to 12,500 joins two of its bands). The factors are assumptions, chosen low because exercise is added separately, and corrected by the check-in. They sit below the FAO/WHO/UNU activity levels of 1.40 to 2.40, which include exercise (S4).

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
| `strength` | 3.5 | 5.0 | 6.0 | Codes 02054, 02052, 02050. Verified |
| `circuit` | 3.5 | 5.0 | 7.5 | Codes 02034, 02035, 02040. Verified |
| `cardio` | 4.0 | 6.8 | 9.0 | Codes 01010, 01200, 02049. Verified |
| `mobility` | 2.3 | 2.8 | 4.0 | Codes 02175, 02105, 02160. Verified |
| `walk` | 2.8 | 3.8 | 4.8 | Codes 17152, 17190, 17200 (slow, moderate, brisk on level ground). Verified |
| `sport` | 4.0 | 6.0 | 8.0 | Assumption. There is no general sport code. 4.0 is moderate, 6.0 and 8.0 vigorous |

Intensity bands (S5, S13): light 1.6 to 2.9 METs, moderate 3.0 to 5.9, vigorous 6.0 or more. One MET is about 1 kcal per kg per hour (S5).

`eeeByWeekday[d]` is the sum of `EEE` for that weekday's sessions. `weeklyEEE` is the sum of the seven.

## 6. Maintenance and the goal adjustment

- `tdeeAvg = baseline + weeklyEEE / 7`.
- Energy per kg of body weight change: 7,700 kcal, the 3,500 kcal per pound rule (S6). An assumption: S6 calls it an oversimplification that fits weight loss with over 30 kg of body fat and overstates the energy per kg for leaner people, and it says nothing about gain. The check-in absorbs the error.
- Wanted change: `wanted = ratePctPerWeek / 100 * W * 7700 / 7`.

| Goal | Pace options, percent of body weight per week | Default |
| --- | --- | --- |
| `lose` | gentle 0.25, steady 0.5, faster 0.75 (offered only at BMI 25 or more) | steady |
| `maintain` | 0 | |
| `gain` | lean 0.25, standard 0.5, faster 0.75 (offered only under BMI 20, provisional) (advanced lifters: lean only) | standard for beginners and for BMI under 18.5, otherwise lean. Faster is never the default |

Sources for the bands: S7 for gaining, S9 for losing.

**Goals as asked (U1a).** Onboarding offers five goals; the engine still has three, and the two behind "Not what you're looking for?" each add one rule in the onboarding draft (`AIMS` in `src/flows/onboarding/draft.ts`), no constant and no stored field:
- **Gain weight** (for lean people) is `gain` leading with the faster gain pace (0.75, provisional, S20) wherever `paceOptions` offers it: under BMI 20 and not to advanced lifters. Elsewhere it is the gain goal's own default with the line saying why. The other paces stay on Your plan, and the surplus cap still applies (vector J).
- **Lose fat and build muscle** is `lose` held at the gentle pace (0.25), the smallest deficit the engine has (about 10 percent under maintenance), with the cut's protein, 2.0 g per kg (S8, S9, S10). No pace is offered. A meta-regression found that lean mass gains from resistance training stopped at a deficit of about 500 kcal a day (S26); the gentle pace stays under it up to about 180 kg of body weight, and above that the plan is a slow cut. Recomposition was seen in studies both under and over maintenance, with protein above 2.0 g per kg (S26). Below BMI 18.5 it keeps the weight steady, as Lose fat does (vector K). Stored as a `lose` plan, so the check-in steers it like any cut.

**The faster gain pace (T1, PRD F19).** No source recommends gaining faster than 0.5 percent a week, for lean people or anyone (S7, read again in T1; a search for a rate for underweight adults without an eating disorder found none, see `docs/DECISIONS.md` under T1a). So the pace is **provisional** and the app labels it so. Its rate, 0.75, is the middle of the 0.7 to 0.8 percent a week that the large surplus group of a trial aimed for (S20). That trial and another (S20) found the extra gain was mostly fat, which is what the pace's words say. Who may choose it: BMI under 20 (an assumption: thin people put 60 to 70 percent of an overfeeding gain into lean tissue against 30 to 40 percent in obese people, S21, but no source gives a cut), and not advanced lifters (S7 gives novice and intermediate lifters the 10 to 20 percent surplus band and says larger surpluses may suit novices; advanced lifters get 5 to 10 percent). The 20 percent surplus cap below still applies and binds first for most lean, seated people (vector H); the protein target and the strength recommendation of PRD F10 are unchanged.

- `lose`: `delta = -min(wanted, 0.25 * tdeeAvg)`. Flag `deficitCap` if the cap applied.
- `gain`: `delta = +min(wanted, 0.20 * tdeeAvg)`, or `0.10 * tdeeAvg` for advanced lifters (S7). Flag `surplusCap` if the cap applied.
- `maintain`: `delta = 0`.
- The rate is never faster than the paces offered at the current BMI (section 12), so a plan recomputed at a new weight keeps the guardrails. A lose goal under BMI 18.5 gets no deficit. Gain paces are limited by experience only: the faster gain pace's BMI limit decides who may choose it, and once chosen it holds as weight rises, so the check-in measures against it (PRD F19) and never reads the step down as "gaining faster than planned".

## 7. Daily targets

- `matched` mode: `raw(d) = baseline + eee(d) + delta`, where `eee(d)` is that weekday's value, or 0 when every session that day is marked skipped.
- `even` mode: `raw = tdeeAvg + delta`.
- Floor: 1,200 for the female equation, 1,500 for male, 1,350 for unspecified. An assumption at or above S14's lower bounds for low calorie diets (1,000 to 1,200 for women, 1,200 to 1,600 for men). If `raw` is below the floor the target is the floor. The plan carries the `floor` flag when its lowest possible day, a rest or skipped day, is below the floor.
- `target = round(raw / 10) * 10`.
- The effective rate shown to the user is recomputed from the delta actually applied after caps and floors, using the even mode target.

## 8. Macros

- Protein per kg (S8, S9, S10): gain 1.8, lose 2.0, maintain 1.6. Reference weight is body weight, capped at the weight at BMI 30 for the user's height, so protein never falls as weight rises. `proteinG = round(perKg * refWeight)`.
- Fat (S7, S16): `fatG = round(max(0.25 * evenTarget / 9, 0.6 * W))`, where `evenTarget` is the unrounded even mode target after caps and floors.
- Carbs are the remainder for each day: `carbsG = max(0, round((target - 4 * proteinG - 9 * fatG) / 4))`. Energy per gram: 4, 4 and 9 kcal (S19).
- If protein and fat alone exceed the lowest day target (a rest or skipped day, or the even target), lower fat to `max(0.5 * W, (target - 4 * proteinG) / 9)` for that target.

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

**Rate for decisions.** Ordinary least squares slope over the raw weigh-ins of the last 21 days (the check-in day included), in kg per day. Needs at least 8 weigh-ins spanning at least 14 days, first to last inclusive. The observed rate in percent per week uses the trend weight.

**Complete day.** A day is complete when the user closed it, or when it has at least two logged items and at least 50 percent of that day's target. A supplement taken with no calories (creatine, N2) is not a logged item.

**The check-in** runs on the user's chosen weekday when at least 14 days have passed since the plan started or last changed.

1. Not enough weigh-ins: reason `need_data`, no change.
2. Fewer than 10 complete days in the window: compute the rate only. `change = (targetRate - observedRate) / 100 * W * 7700 / 7`, where `targetRate` is the plan's effective rate signed for the goal, clamped to plus or minus 100. Reason `on_track` when the change is under 50. Otherwise the change moves the baseline and the plan is recomputed as in step 3, reason `raise` or `lower`.
3. Otherwise:
   - `tdeeObserved = meanIntake - slopeKgPerDay * 7700`, with the mean over complete days. `meanTarget` is the mean target over every day in the window.
   - Adherence: if `meanIntake` is under 90 percent of `meanTarget` on a gain goal, or over 110 percent on a lose goal, the reason is `adherence` and no change is proposed. The message says the target was fine and the gap was intake.
   - Else `tdeeNew = 0.5 * tdeeAvg + 0.5 * tdeeObserved`, clamped to within 10 percent of `tdeeAvg`. The new baseline is `tdeeNew - weeklyEEE / 7`. Recompute the plan from sections 6 to 8 with the current trend weight, keeping the plan's exercise energy per weekday and resting energy.
   - If the even mode target moves by less than 50 kcal, reason `on_track`. Otherwise `raise` or `lower`. A move over 200 shifts the baseline back so the even target moves 200. The proposal is the move rounded to 10.
4. Accepting creates a new plan with `source: 'checkin'`, `tdeeSource: 'measured'`, effective from the next day. Keeping records the decision and changes nothing.

## 11. Training analysis

Computed from the program. One set counts 1 for each primary muscle and 0.5 for each secondary muscle.

| Check | Rule | Message when outside | Source |
| --- | --- | --- | --- |
| Weekly sets per muscle | Under 5 low. 5 to 9 building. 10 to 20 in range. Over 20 high (20 is an assumption: S11 found too little data above 12 sets for a limit) | Add or remove sets to reach 10 to 20. Beginners are told 5 to 9 is a fine start | S11 |
| Sessions per muscle per week | 2 or more. A session counts when the muscle is a primary target of one of its exercises | Train it twice a week | S12 |
| Strength sessions per week | 2 or more strength or circuit sessions. With a gain goal this is the first recommendation shown | Add strength sessions | S13 |
| Aerobic minutes per week | 150 to 300 moderate. Counts cardio, walk and sport sessions at 3 METs or more; sessions at 6 METs or more count double | Informational. With a gain goal and over 150 minutes: the app notes that the target already includes it | S13 |
| Rest days | At least 1 day with no hard session | Add a rest day | Assumption |
| Session length | Over 120 minutes | Informational | Assumption |
| Lifting and cardio on one day, order | A day with a strength or circuit session and a cardio session | Lift first, then cardio. Leg strength grew more; muscle size, aerobic fitness and body fat were the same either way | S22 |
| Lifting and cardio on one day, gap | The same days | Leave 6 hours or more between them if you can, or use separate days | S23 |
| Lifting and cardio on one day, leg days | Such a day whose lifting trains quads, hamstrings or glutes as a primary muscle | Cycling rather than running | S25 |

The last three are arrangement points, not recommendations: the analysis returns them only when a day has both (walks and sport do not count as cardio here), each with the weekdays it applies to. Overall, lifting and cardio together do not hold back muscle size or maximal strength; explosive strength gains are smaller within one session and not when 3 hours or more apart (S24). S24 found that independent of cycling or running, for explosive strength; S25 found running, not cycling, held back leg size and strength. The two disagree on the mode, so the more conservative advice, cycling on leg days, stands.

**Training on Progress (PRD F20).** For each seven-day block, from the day's sessions as Today shows them and their marks: sessions planned, done and skipped; strength or circuit sessions done, against 2 a week (S13); and moderate-equivalent minutes of cardio, walk and sport sessions done, counted as in the aerobic row above, against 150 to 300 (S13). A session without a mark is not done. Days before the account's first day plan nothing.

When a program has no exercises listed, only the session level checks run and the Train tab invites the user to add exercises for the muscle analysis.

## 12. Guardrail thresholds

Age under 18 blocks use. BMI under 18.5 removes the lose goal (S15). BMI 18.5 to 20 limits lose to gentle. BMI 20 or more, or advanced lifting, removes the faster gain pace from the choice; a pace already chosen holds. A goal weight below BMI 18.5 is refused. BMI under 16 shows the doctor card. Any screening answer sets the `maintainOnly` flag or ends onboarding, as the PRD describes.

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

**H. Faster gain pace, the cap binds.** Vector A at 0.75. BMI 19.59 and a beginner, so the pace is offered. Wanted 495, cap 405.13, delta +405.13. Flags `surplusCap`. Effective rate 0.614 percent a week.
Matched: training days 2530, rest days 2290. Even: 2430.
Protein 108 g. Fat 68 g. Carbs: training 372 g, rest 312 g, even 347 g.
Check-in by rate alone (fewer than 10 complete days): gaining 0.614 percent a week is `on_track`; 0.5 is `raise`, and the new plan keeps 0.75; 0.9 is `lower`. With 21 complete days at 2,430.77 kcal, gaining 0.614 percent a week and a trend of 62 kg (BMI 20.2): `on_track`.

**I. Faster gain pace, the rate binds.** Vector A at 0.75 with `physical` movement. Baseline 2518. tdeeAvg 2655.142857. Wanted 495, cap 531.03, delta +495. Flags none. Effective rate 0.75.
Matched: training days 3250, rest days 3010. Even: 3150.
Protein 108 g. Fat 88 g. Carbs: training 507 g, rest 447 g, even 482 g.

**J. Gain weight (U1a).** Vector A answered as Gain weight: BMI 19.59 and a beginner, so the faster pace leads and the plan is vector H (training days 2530, rest days 2290, protein 108 g, `surplusCap`). At 67 kg (BMI 21.9) it is the standard pace with `noFasterGain`; for an advanced lifter, lean with `leanOnly`.

**K. Lose fat and build muscle (U1a).** Female, 30, 165 cm, 70 kg, `light`, strength moderate 60 min on 3 days (the onboarding defaults), lose at 0.25.
BMI 25.71. BMR 1420.25. Baseline 1846.325. EEE per session 280, weekly 840. tdeeAvg 1966.325. Wanted 192.5, cap 491.58, delta -192.5.
Matched: training days 1930, rest days 1650. Even: 1770. About 0.2 kg a week.
Protein 140 g. Fat 49 g. Carbs: training 232 g, rest 162 g, even 192 g. Flags none. The same person at maintenance trains on 2130 with 112 g of protein; Lose fat's steady pace, 1740.

## 14. Sources (verdicts in `docs/SOURCES.md`)

| Id | Claim used | Citation to check |
| --- | --- | --- |
| S1 | Mifflin-St Jeor equation and constants | Mifflin MD, St Jeor ST, et al. Am J Clin Nutr. 1990;51(2):241-247 |
| S2 | `370 + 21.6 * FFM` | Cunningham JJ. Am J Clin Nutr. 1991;54(6):963-969 |
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
| S15 | BMI 18.5, 25 and 30, and 16 for severe thinness | WHO Technical Report Series 894, 2000; WHO EMRO field guide, 1995 |
| S16 | Fat at 20 to 35 percent of energy | Institute of Medicine, Dietary Reference Intakes for macronutrients, 2005 |
| S17 | Smoothing factor 0.1 | Convention. Assumption |
| S18 | Accuracy of predictive equations | Frankenfield D, Roth-Yousey L, Compher C. J Am Diet Assoc. 2005;105(5):775-789 |
| S19 | 4, 4 and 9 kcal per gram | FAO. Food energy: methods of analysis and conversion factors. Food and Nutrition Paper 77, 2003 |
| S20 | Faster gain pace 0.75 (provisional); a faster gain is mostly fat | Helms ER, et al. Sports Med Open. 2023;9:102. Also Garthe I, et al. Eur J Sport Sci. 2013;13(3):295-303 |
| S21 | Thin people gain more lean tissue | Forbes GB. Ann N Y Acad Sci. 2000;904:359-365. Also Hall KD. Br J Nutr. 2007;97(6):1059-1063 |
| S22 | Lift before cardio | Eddens L, van Someren K, Howatson G. Sports Med. 2018;48(1):177-188. Also Murlasits Z, et al. J Sports Sci. 2018;36(11):1212-1219 |
| S23 | 6 hours between lifting and cardio, or separate days | Robineau J, et al. J Strength Cond Res. 2016;30(3):672-683. Also Sale DG, et al. Med Sci Sports Exerc. 1990;22(3):348-356 |
| S24 | Interference within one session | Schumann M, et al. Sports Med. 2022;52(3):601-612 |
| S25 | Cycling rather than running on leg days | Wilson JM, et al. J Strength Cond Res. 2012;26(8):2293-2307 |
| S26 | Lean mass gains stop at a deficit of about 500 kcal a day; recomposition with high protein | Murphy C, Koehler K. Scand J Med Sci Sports. 2022;32(1):125-137. Also Barakat C, et al. Strength Cond J. 2020;42(5):7-21 |

## 15. What the app says about certainty

- On the plan screen: "This is a starting estimate. Ontrack corrects it from your own results after two weeks."
- On an estimate item: the label Estimate, and nothing more.
- In The science: each entry shows its citation and one of three statuses: Verified, Working assumption, or Being checked.
