# Handoff after R1 and R2 (17 November 2026)

Read this first, then `CLAUDE.md`. It replaces `docs/HANDOFF-R1.md` and `docs/R1-REVIEW.md`, which now only say how we got here.

## 1. Where things stand

R1 (Sonnet, 15 and 16 November) and R2 (Opus, 17 November) rebuilt the app on branch `app-research-onboarding-polish`. The owner watched it live on localhost. It ships as **v2.0.0**, squash-merged into `main` and deployed to production (https://ontrack-black.vercel.app). The whole of R2, page by page, is in `docs/R2-PLAN.md`. In one paragraph:

- **Layout:** every page leads with one white card holding small grey boxes (the owner's pick).
- **Today:**
  - kcal eaten is the figure; Done turns the session box ink with a burst, and Undo plays it back;
  - a protein suggestion card on the feature gradient, folding with a chevron.
- **Progress:** chart first (Weight, Calories in against out, Protein, Training).
- **Train:**
  - a 7-column icon week, "cardio after" with a machine setup, program changes from today;
  - Adjust with AI; Strava-style "Nice work" finish screen; muscle map.
- **Plus button:** logs meals, the weigh-in and today's session.
- **Coach:** `/api/coach`, where numbers are slots the app fills from the engine.
- **Foods:** 983 with Thai variants, `recipe:` rows and a Thai plate resolver.
- **Onboarding:** a goal weight step with the healthy range.
- **Header:** glass on scroll.

## Data carried over (checked before v2.0.0)

The owner's account was checked against v2.0.0 in the production database. It holds 21 meals, 10 plans, 4 products, 4 weigh-ins, 2 session logs, and a profile, program, social and supplement record.
- **Collections and limits:** no new collection (the database's check list is unchanged), every record far under 64 KB.
- **Ids:** every food id its meals use and every exercise id its program uses exists in the new table and library. No old food id was removed.
- **Fields:** the only new ones (a workout on a session log, a setup on a session) are optional.
- **On the phone:** local preferences merge with new defaults, and the removed bell's key is ignored. IndexedDB's schema version is unchanged.
- **Pending plans:** the account had plans waiting for 18 November from edits under the old rule. That is why a program change now rewrites later plans too (`changeProgram`, unit test "a program change also reaches a plan already waiting").

## 2. The owner's directions, all still in force

**Product**
- **It is a phone browser app.** Nothing that needs Apple Health, a Watch, push or a paid Apple developer account.
- **Thai food is the main reason the app exists.** Least friction, and the most accurate analysis. Every protein variant of a dish is its own row. Oil is counted by default where it hides.
- **The AI explains and proposes, the engine decides.** The AI names foods, writes words around the engine's numbers, and proposes programs. It never sets a target. More useful AI is welcome (the owner liked Ask about your week, and asked for program adjust).
- **No streaks, no guilt words, no rankings.** Joy comes from motion and moments: count-ups, the Done ink and burst, "Nice work", the muscle map.

**Look and layout**
- **Taste comes from the landing page and OneFin.** Ink means act, violet is the brand, green means reached, one gradient per screen, tokens only, words in the catalog with its rules, no emoji.
- **Fit the main content in one screen height.** Judge at 390 by 664 (Safari with toolbars), 390 by 844 and 375 by 548. Scrolling is for detail.
- **One glass material** (the Add sheet's `liquid-clear`) on every glass surface. The dock is a little clearer. The header turns into the landing's glass capsule on scroll, with the fade at the top edge.
- **Never auto-advance.** Choices select, then Continue moves on. The owner judges by feel on the iPhone.

**How we work**
- **Local first.** One branch, `pnpm dev --host` on :5173 for the owner's phone, no long CI while iterating, CI and deploy when the owner says ship.

## 3. Open items, most important first

1. **Real iPhone pass.** Headless WebKit draws no blur. Check:
   - the glass (dock, header capsule, onboarding capsule, Add actions);
   - the sheet colour running under the keyboard (Describe, Review);
   - the Done and Undo animation feel;
   - whether the header capsule tints Safari's bar.
2. **Live Gemini for the coach.** Only the mock has spoken so far for week, check-in, session, gap, ask and program. Check:
   - the wording against the catalog voice;
   - latency (program has 2 tries of 25 s);
   - the daily quota, which coach calls share with photo analysis (40 a user a day);
   - free-tier data terms before real user data (the AI study flagged it).
3. **Photos of Thai dishes.** The Thai eval ran on text only (30 of 30). Run the photo fixtures, and add photos of the new variants.
4. **Food gaps:**
   - 7-Eleven ready meals (no box weights found);
   - jok variants, beef and pork khao soi, pad pak dishes, garlic pepper stir fries.
   - Plain table items picked for fried food lose their oil flag (`docs/AI-THAI.md`).
5. **Calories out is formula plus logged exercise,** not measured. Consider showing the check-in's measured maintenance on the Calories chart once it exists.
6. **Program changes apply from today.** A plan already waiting for a later day (a check-in accepted today, or an edit made under the old "from tomorrow" rule) is written again with the new program, keeping its own numbers. Changing the program after training today still changes today's target and session. Consider asking "from today or tomorrow?" when a session is already logged.
7. **Cardio setup is descriptive.** Speed, incline and level do not change the energy; intensity still does. ACSM walking and running equations would need the `science-check` skill and constants in `constants.ts`.
8. **verify-ui (the design critic) has not run on the R2 pages,** and `docs/SCREENS.md` and `docs/DESIGN.md` lag the code. Bring both docs up to R2: the one card rule, the new components (`MuscleMap`, `WeekRing`, `DayChart`, `CoachCard`, `Burst`, the `on-ink` and `surface` button variants).
9. **Not built:**
   - a monthly recap story;
   - neutral milestones;
   - coach marks;
   - a first-meal moment;
   - meals grouped by time;
   - per-exercise charts;
   - creating a saved meal from scratch;
   - camera flash and zoom;
   - tap-to-advance halves on the check-in story;
   - Ask from pages other than Progress;
   - progress photos (owner call).

## 4. Context files

| For | Read |
| --- | --- |
| The rules | `CLAUDE.md`, `docs/WORKFLOW.md` (section 12: localhost and Sonnet) |
| What R2 built, page by page | `docs/R2-PLAN.md` |
| Product, science, design, screens | `docs/PRD.md`, `docs/SCIENCE.md`, `docs/DESIGN.md`, `docs/SCREENS.md` |
| The coach and the vision pipeline | `docs/TECH-SPEC.md` sections 7, 7b and 8, `docs/AI-THAI.md`, `docs/EVAL-NOTES.md` |
| Features found, taken and not taken | `docs/FEATURE-RESEARCH.md` |
| The R2 research | `/Users/admin/destination/ontrack-design/research/r2/` |

The research folder holds:
- `strava-ia/`, `strava-activity/` and `ai-analytics/`, each with a `NOTES.md` and contact sheets;
- the briefs (`BRIEF-*.md`), which are good templates for the next agent.

## 5. Tools that worked

- **Mobbin MCP.**
  - Load `mobbin:search` first.
  - `search_flows` with the app name finds Cal AI, Strava and Bevel; `search_screens` finds Apple Health.
  - Read a whole flow cheaply by curling each `image_url` and tiling a contact sheet with PIL (memory note `mobbin-contact-sheet`).
  - Measure from 3x captures: point size = pixels / 3, font size = cap height / 3 / 0.70.
- **Sonnet 5.5 subagents**
  - Use them for research and for well-specified builds: one brief file, the decisions made, the files they may not touch.
  - Opus decides and reviews.
  - Agents editing files the e2e dev server watches make Playwright runs fail at random. Run the full suite only when no agent is working.
- **Capture harness:** `/Users/admin/destination/ontrack-design/tools/capture/`.
  - What it has: the `r2.spec.ts` captures (Today, Train, workout, finish screen, Progress metrics, the goal step, the gap card, AI program) and `tile.py` for contact sheets.
  - How to run it: run your own `vite --port 5174`, kill it by PID, and never `pkill vite` (the owner's server is on 5173).
- **Also:** the yab-browser MCP for signed-in sites, the Svelte MCP for docs, the Figma and Framer MCPs for the OneFin source, and the `verify-ui` and `science-check` skills.
