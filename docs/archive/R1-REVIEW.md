# R1 review and the redesign plan (16 November)

Branch `app-research-onboarding-polish`, local, nothing committed (owner: no commit or PR yet). An independent review compared R1 with production (`main` at `dd019d6`, run from the worktree `/Users/admin/destination/ontrack-main`). Opus 5.5 was given authority to decide keep or drop and to instruct fixes. This file keeps what it decided.

## Verdicts

| Page | Verdict | Why |
| --- | --- | --- |
| Add meal | Better (confirmed) | Re-log rows with a plus show on the first screen: 4 at 844, 2 at 664, 1 at SE (production: none at SE). Tap counts are the same as production for all eight U1c tasks. |
| Onboarding | Better | Your plan 1087 px against 1638, macro tiles, Building ring, metric first. Worse: always a light island in dark mode, Days step at SE, Goal weight above Pace. |
| Train | Better | Up next and this week's pills lead. |
| Today | Equal to slightly worse | The finished weigh-in row costs about 70 px; Done became Start then a log. |
| Progress | Mixed | Permanent goal prompt pushes the chart down 115 px; glance tiles repeat the cards. |

## Decisions

| Change | Call |
| --- | --- |
| Onboarding layout, capsule, Continue shake, metric first, Choices, Building ring, count-up, macro tiles, disclosures, shorter copy | KEEP |
| Sky as a light island in dark mode, Goal weight above Pace | REBUILD in the redesign |
| Days week dots, projected goal date | DROP (done) |
| `reveal` and `inview` scroll reveal on Your plan | DROP in the redesign (hides content) |
| Today WeekStrip, `dayTitleShort` | KEEP |
| One To do card that keeps a finished weigh-in; Start opening the workout log with Mark done in the menu | REBUILD: Done is one tap again on the row |
| Add composer, re-log rows, Something off, Speak, bookmark and SavedSheet, Scanner modes | KEEP |
| Recent/Saved switch, Time field in the Review Name row | REBUILD |
| Train Up next, week pills, View session, Training check pills | KEEP, the redesign starts from R1 |
| Progress goal in the hero, glance tiles, Maintenance behind a chevron | REBUILD; glance tiles DROP |
| Disclosure, Row chevron, rise, no-scrollbar, appear backwards, hero gradient | KEEP |
| keyboard.ts and the drawer lift | KEEP and FIX (done) |
| Bell, NoticesSheet, notices store, `prefs.noticesRead` | DROP in redesign step 0 (empty in every capture; its notices already show as cards; no push). Restore Today's first-day card and its e2e test from `main` then |
| Workout log, `workout` on `slog`, server prompt wording for `hint` | KEEP |

## Fixes done on 16 November

Copy regressions restored (sex, lifting, doctor line, expect lines, steps a day, born, movement, days), `scan.title` is "Scan food", no projected goal date (Your plan and Progress show how much is left), Days step without the week dots (fits at SE), a plain Done keeps the sets logged that day (Skipped clears them; unit test), one glass material (`liquid-clear`, see DESIGN.md section 6) on the dock, capsule and chips, the sheet's colour runs under the keyboard, `--kb-safe` drops the home indicator padding while typing, the Add composer is one line with five turning examples.

Also found and fixed on the way: opening the bell's notices sheet looped a Svelte effect (`effect_update_depth_exceeded`, 34 times in one e2e run, no test failed on it) because `markRead` rewrote `prefs.noticesRead` on every run; it now writes only new keys. The stress check for clipped text exempts `[data-ellipsis]`, the composer's example line.

Not done: F6 (Opus wanted "Type or say it" in place of the example; the owner asked for turning examples instead), F7 (one live `pnpm dev:live` photo and one Something off fix, to check the prompt wording), `pnpm verify`, the real iPhone pass.

## Redesign way of work

Goal (owner): every page fits most things on one visible screen, scrolling still allowed, good UX kept, Ontrack's identity kept. Study Cal AI most (take its features and arrangement), then Strava, Bevel, Apple Health, with real sizes.

Order: 0 shell (header without the bell, dock, sheet budget), 1 Today, 2 Add meal (one camera: Add's Photo opens the Scanner on Meal), 3 Progress, 4 Train, 5 Onboarding and Your plan.

Per page, one artifact each in `/Users/admin/destination/ontrack-design/research/r2/<page>/`: study (Mobbin `search_flows` with the app name, 1 or 2 flows, curl the images, one contact sheet, a note of at most 300 words), measure (a `measure.py` over 3 to 5 screens, CSV), budget (must, should, later, in px per block at 664, 844 and 548), spec (tokens and catalog keys; owner sees it before the build), build (a Sonnet subagent with a lean brief), verify (check, page e2e, one contact sheet at three sizes and two themes, then verify-ui).

Measuring Mobbin images: full-res is about 1179 by 2676, a 3x iPhone capture (393 by 852 pt) plus a 120 px footer to crop. Scale = image width / point width (1170 to 390, 1179 to 393, 1206 to 402, 1284 to 428, 1290 to 430, 750 to 375). Font pt = cap height px / scale / 0.70 (x-height / scale / 0.52 for lowercase). Weight from stem width over cap height: under 0.12 regular, 0.12 to 0.16 semibold, over 0.16 bold. CSV columns: app, flow, screen_id, element, role, top_pt, height_pt, cap_px, font_pt, weight, colour_hex, nearest_token, radius_pt, gap_above_pt, above_fold_852.

Mobbin finds Cal AI, Strava and Bevel through `search_flows` with the app name (`search_screens` on "Cal AI home screen" and "Bevel home screen" returned nothing). Apple Health screens come through `search_screens`.

Screen budget (usable height = H minus safe top, header 56, tab offset, dock 64 + 12 + safe bottom, 12 clear): 603 px at 390 by 844 as a Home Screen app, 504 px at 390 by 664 in Safari with toolbars, 400 px at 375 by 548. At 664 every must fits; at 548 every must fits with at most one dropped to a single row; at 844 the shoulds fit too.

Must above the fold: Today, the day control, calories with track, P/C/F, the one due task, the first meal row or the log action. Add, the field and mic, four actions, 3 re-log rows (1 at SE). Train, Up next with its action and this week's pills. Progress, range, weight figure and change, the whole chart, the goal line. Onboarding step, question, all answers, Continue, no scroll at 548. Your plan, calorie target, macros, Save.

"Clone Cal AI" means its feature set, arrangement and measured proportions, drawn in Ontrack: our tokens, ink pill, violet, green, haze hero, our type, our icons, our engine's numbers, our catalog words. Never its logo, colours, illustrations, icons, screenshots, sentences, streak flame, badges, Health Score, paywall, referral, or anything that needs Apple Health.

Questions for the owner before step 0 (Opus recommends yes to each): judge "one screen" at 390 by 664 with 844 as the extra; Today leads with calories left; Progress's secondary cards move into one-tap detail sheets.
