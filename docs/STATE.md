# State

Where things stand. Read first, update last, keep it to one screen. History lives in `docs/DECISIONS.md` (newest first) and `docs/archive/STATE-NOTES.md` (every milestone's old notes, grep it).

## Now (23 November 2026)

- **Live:** v2.4.0 at https://ontrack-black.vercel.app, from `main` (PR #57), tag `v2.4.0`. R5, the owner's list of 22 Nov (`docs/DECISIONS.md` R5): the Add camera in 3:4 with the ways on its right, no notice naming the AI provider, a smaller toast (glass in Tray), on track that counts in the goal's direction, Your goal from Progress and Profile, a rest day's activity, Train's Session sheet in the same style, AI accuracy work (resolver, prompt, alternatives in Review), freemium (plans sheet, free limits, Stripe test mode with a 0 THB bill, Settings' Membership), the landing's 06 Plans and AI scan, a wording pass, whey the one preset, Review's photo in 3:4. It also carried the 22 Nov docs refresh.
- **Stripe:** `STRIPE_SECRET_KEY` (test mode) is set in Vercel for Production only, so a preview's Checkout answers "not available". The plan lives in `app_metadata.billing`; no Supabase migration.
- **Open, CI:** the full CI shards (the `full-ci` label or a tag) have failed since at least v2.3.0. The onboarding tests that click on Your plan, `app.spec` tabs, `screens` onboarding gain and `measure` vector A time out with "element is not stable": in the traces, Linux WebKit paints a frame only every few seconds under the shard's parallel load. Quick CI and the full local run are green. The likely fix is fewer workers in the full shards or no glass and blur under test on Linux; check with one manual full run.
- **The owner** accepts the open list in BUILD-PLAN item 0 for now.
- **In progress, R6 (24 Nov):** the first-week guide (PRD F28, DECISIONS R6) on `feat-first-week-guide`, built and verified locally (`pnpm verify` green), waiting for the owner's look on localhost. Not merged or deployed. The course document `docs/assignment/final-document-for-presentation-filled.docx` (untracked, built from the owner's original beside it) now has the guide in Now.
- **Next:** `docs/BUILD-PLAN.md`; its first section is what is left before Ontrack is a finished app.

## The app at v2.4.0

Each screen in detail: `docs/SCREENS.md`. The look and the two styles: `docs/DESIGN.md`.

- **Shell:** three tabs (Today, Train, Progress) and the plus. The header holds the page title, the food map and the person button, which opens Profile; Settings opens from Profile. No bell.
- **Two styles:** Tray (the default: one white card holding grey boxes per page, nested radii, glass) and Bento (flat: boxes on the page, one radius, no glass). Picked on Today's one-time card or at the top of Settings. The landing page is always Tray.
- **Today:** calories eaten as the figure with the macros; each session in its own box marked Done (ink, green burst, the burn counting down in the check, Undo plays it back); the weigh-in box (Add, Edit); protein suggestions from your own foods first; meals.
- **The plus:** whey one tap at the top, beside any supplement you set up; one in-app camera (Meal, Label, a barcode read in any mode); Describe, Photos, Search, Quick add, Saved. Review shows each item with grams and lets you say what is wrong in words ("Something off?").
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
| v2.4.0 | 23 Nov | R5: freemium (Free and Pro, Stripe test mode at 0 THB), the 3:4 camera, on track in the goal's direction, rest day activity, Session sheet tiles, AI resolver checks, smaller glass toast, landing Plans |
| v2.3.0 | 21 Nov | R4b: styles renamed Tray (default) and Bento, landing always Tray, Today's style card, check-in sheet, cardio named by machine, landing shots from real data |
| v2.2.0 | 20 Nov | R4: the flat style and the style switch; CI pinned to ubuntu-24.04 (PR #55) |
| v2.1.0 | 19 Nov | R3: camera-first plus, Done for every session, Progress and Profile reworked, friends fixed |
| v2.0.0 | 17 Nov | R1 and R2: every page reorganised, AI coach, Thai variants, goal weight step |
| v1.6.0 | 14 Nov | U3 text hierarchy and cards; L5 landing fine-tune after it |
| v1.0.0 | 13 Nov | M9b hardening: the first release. M0 to M9 and the owner's milestones before it |

The full milestone table is in `docs/archive/STATE-NOTES.md`.
