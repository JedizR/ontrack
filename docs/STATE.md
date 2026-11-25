# State

Where things stand. Read first, update last, keep it to one screen. History lives in `docs/DECISIONS.md` (newest first) and `docs/archive/STATE-NOTES.md` (every milestone's old notes, grep it).

## Now (25 November 2026)

- **Live:** v2.6.1 at https://ontrack-black.vercel.app, from `main`, tag `v2.6.1` (v2.6.0 plus the microphone allowed in `vercel.json`'s Permissions-Policy). R7 (`docs/DECISIONS.md` R7), the owner's five Add a meal problems: the camera like the iPhone's (macro on the ultra-wide where the phone names one, zoom chips with drag and pinch, a white shutter and light), Speak in Thai, English or both (a 15 s clip written down by Gemini through `/api/analyze` kind `voice`, not counted), creatine no longer pinned, and every meal ever logged under Recent. Before it, v2.5.0 shipped R6: the first-week guide on Today (PRD F28: log a meal, weigh in, mark a workout done, in the plan's first 7 days, with the first check-in's date), no drop shadow on Tray's header capsule, dock or plus, Pro at 149 baht a month, and the Meal sheet's photo in 3:4. Before it, v2.4.0 (PR #57) shipped R5, the owner's list of 22 Nov: the 3:4 camera, directional on track, freemium with Stripe at 0 THB, rest day activity and more.
- **Pro:** 149 baht a month or 990 a year since v2.5.0 (was 199); the financial model in `/Users/admin/destination/assignment/` is updated to match.
- **Stripe:** `STRIPE_SECRET_KEY` (test mode) is set in Vercel for Production only, so a preview's Checkout answers "not available". The plan lives in `app_metadata.billing`; no Supabase migration.
- **Open, CI:** the full CI shards (the `full-ci` label or a tag) have failed since at least v2.3.0. The onboarding tests that click on Your plan, `app.spec` tabs, `screens` onboarding gain and `measure` vector A time out with "element is not stable": in the traces, Linux WebKit paints a frame only every few seconds under the shard's parallel load. Quick CI and the full local run are green. The likely fix is fewer workers in the full shards or no glass and blur under test on Linux; check with one manual full run.
- **The owner** accepts the open list in BUILD-PLAN item 0 for now.
- **Open, R7 on a real phone:** macro needs the iPhone to name its ultra-wide in English ("Back Ultra Wide Camera"); another language or Android shows zoom only. Safari's zoom is the scaled picture, so past 2x the photo is softer. Both untested on a device until the owner tries them.
- **Open, landing shots:** they still show v2.4.0's faint drop shadow around the dock. Regenerate them (WORKFLOW section 7) next time the owner's account export and photos are at hand; demo data would be worse than the real day.
- **Course document:** `docs/assignment/final-document-for-presentation-filled.docx` (untracked, built from the owner's original beside it) has the first-week guide in Now.
- **Next:** `docs/BUILD-PLAN.md`; its first section is what is left before Ontrack is a finished app.

## The app at v2.6.0

Each screen in detail: `docs/SCREENS.md`. The look and the two styles: `docs/DESIGN.md`.

- **Shell:** three tabs (Today, Train, Progress) and the plus. The header holds the page title, the food map and the person button, which opens Profile; Settings opens from Profile. No bell.
- **Two styles:** Tray (the default: one white card holding grey boxes per page, nested radii, glass) and Bento (flat: boxes on the page, one radius, no glass). Picked on Today's one-time card or at the top of Settings. The landing page is always Tray.
- **Today:** in the plan's first 7 days, the first-week guide under the hero; calories eaten as the figure with the macros; each session in its own box marked Done (ink, green burst, the burn counting down in the check, Undo plays it back); the weigh-in box (Add, Edit); protein suggestions from your own foods first; meals.
- **The plus:** whey one tap at the top, beside any supplement you set up but creatine; one in-app camera (Meal, Label, a barcode read in any mode) with macro, zoom and a white shutter and light; Recent's five, then every meal ever logged; Describe, Photos, Search, Quick add, Saved. Review shows each item with grams and lets you say what is wrong in words ("Something off?").
- **Train:** the next session and the week's ring; a 7 column week of icons; cardio after a lift with a machine setup; Adjust with AI; the muscle map; Burned and Sets this week from Done. No set logging, no timer.
- **Progress:** two gradient boxes (weight trend, consistency), a switch (Weight, Kcal, Protein, Train) over the chart with its range pills, the AI week recap with Ask Ontrack, the weekly check-in as a sheet.
- **Onboarding:** from the landing page's Build your plan: goal, screening, body, goal weight with a healthy range, movement, training, Your plan with the count-up.
- **Friends and the food map:** friends by request, an optional program on the profile, opt-in meal photos on a map at rounded places.
- **AI:** `/api/analyze` (Gemini `gemini-3.6-flash`, Flash-Lite fallback) names foods and estimates grams; a Thai plate resolves by dish, protein and extras to one of 983 table foods. `/api/coach` writes words with number slots the engine fills. The AI never sets a target.

## What is real

- GitHub `JedizR/ontrack` (private, CI on every pull request). Vercel `jedizrs-projects/ontrack` (Hobby, deploys `main`). Supabase `ontrack` (`sbexrpzbzkzofnbpaauu`, Singapore, free, migrations 0001 to 0006). Keep-alive cron daily 03:17 UTC.
- Sign in: Google (OAuth app in Testing) and 6 digit email codes from team.ontrackapp@gmail.com.
- Gemini on the paid tier (the owner's credits), Free 3 AI logs a user a day (coach words are Pro), Pro 100 (`AI_DAILY_USER_LIMIT`), all users capped by `AI_DAILY_GLOBAL_CAP` in Vercel.
- The owner uses production daily with their own account; releases must keep their data. Details: `docs/USER-INPUTS.md`.

## Releases

| Version | Date | What |
| --- | --- | --- |
| v2.6.1 | 25 Nov | The microphone allowed in production's Permissions-Policy, so Speak works there; `smoke:prod` checks it |
| v2.6.0 | 25 Nov | R7: the camera's macro, zoom and white controls; Speak in Thai, English or both; creatine off the pinned row; all meals under Recent |
| v2.5.0 | 25 Nov | R6: the first-week guide on Today (three steps in the plan's first 7 days); no drop shadow at Tray's screen edges; Pro at 149 baht a month; the Meal sheet's photo in 3:4 |
| v2.4.0 | 23 Nov | R5: freemium (Free and Pro, Stripe test mode at 0 THB), the 3:4 camera, on track in the goal's direction, rest day activity, Session sheet tiles, AI resolver checks, smaller glass toast, landing Plans |
| v2.3.0 | 21 Nov | R4b: styles renamed Tray (default) and Bento, landing always Tray, Today's style card, check-in sheet, cardio named by machine, landing shots from real data |
| v2.2.0 | 20 Nov | R4: the flat style and the style switch; CI pinned to ubuntu-24.04 (PR #55) |
| v2.1.0 | 19 Nov | R3: camera-first plus, Done for every session, Progress and Profile reworked, friends fixed |
| v2.0.0 | 17 Nov | R1 and R2: every page reorganised, AI coach, Thai variants, goal weight step |
| v1.6.0 | 14 Nov | U3 text hierarchy and cards; L5 landing fine-tune after it |
| v1.0.0 | 13 Nov | M9b hardening: the first release. M0 to M9 and the owner's milestones before it |

The full milestone table is in `docs/archive/STATE-NOTES.md`.
