# Brief: U3, the app's text hierarchy and card design, from research on Mobbin

You are a fresh Claude session working on Ontrack, a calorie and training tracker for the phone browser (Safari on iPhone first). The owner asked for a UX-driven redesign of the app's text hierarchy and card design, researched on real apps through the Mobbin MCP. Another session (the conductor) is running other milestones at the same time; this brief tells you what is yours and how to stay out of its way. Quality comes first: the owner has said low quality work costs more in rework than it saves. Still, spend tokens with care (the rules are in `docs/WORKFLOW.md` section 6).

## 1. Read first

In `/Users/admin/destination/ontrack`:
- `CLAUDE.md` (invariants: tokens only, words in `src/lib/i18n/en.ts`, no emoji, "ink means act, violet is the brand, green means reached", nested corners).
- `docs/DESIGN.md`: sections 4 to 9 (colour, type, shape, components, banned, the rubric with items 16 to 21) and 10 (motion).
- `docs/SCREENS.md` for the screens you change.
- `docs/STATE.md`: the table and the notes for U1b, U1c, M9a and S1b.
- The owner's latest screenshots, for the mood: `/Users/admin/destination/ontrack-design/feedback/2026-11-13/` and `2026-11-13-round3/`.

## 2. The goal

The owner's words: "we need some UX-driven redesign for some elements focusing inside the app, especially the text hierarchy and card design." Today the app reads flat. Many lines share one size and weight. Cards are grey boxes with the same anatomy whatever they hold, and the eye has no clear first, second and third thing to read.

The reference apps are **Airbnb** and **Shop: Shopping app and package tracker** (by Shopify).

## 3. Research on Mobbin

Use the Mobbin MCP. Look at both apps' iOS screens and flows that match Ontrack's jobs:
- A home feed of mixed cards (Ontrack's Today).
- A list of items with a leading image or icon, a title, a meta line and a trailing value (Ontrack's meals, foods, sessions).
- A detail or summary card with one big number (Ontrack's hero, Your plan, Progress).
- Status and progress cards (Shop's order and package tracking against Ontrack's check-in, training and targets).
- Section headers and "see all" rows.
- Bottom sheets and pickers.
- Empty states, settings lists.

For each pattern, note:
- **Type:** the levels (size, weight, colour role, letter spacing, line height), and how many levels one card uses.
- **Card anatomy:** media, title, meta, trailing value, actions, badges, and the order the eye takes.
- **Space and grouping:** padding, gaps, density, dividers, the corner radii and how they nest.
- **Numbers:** how the value is emphasised against its unit.
- **Highlight:** how one item is made to stand apart from the rest.

Keep images out of your context where you can. Prefer Mobbin's text and metadata, and open only the screens you need. Downscale any you open (`sips -Z 900`).

Write the findings to `/Users/admin/destination/ontrack-design/research/u3-mobbin/NOTES.md`. Cite each pattern with its Mobbin reference (app, screen, link). End with a short list of what Ontrack should adopt and what it should not, and why.

## 4. The design, before code

1. A text hierarchy for the app in `docs/DESIGN.md` section 5:
   - the levels, about five, each with its token, weight, colour role and where it is used;
   - the rule for how many levels a card may use;
   - the rule for numbers and their units.

   Use the existing type tokens where they fit; add tokens only where research shows a gap.
2. Card anatomy in DESIGN.md section 7: the variants Ontrack needs (for example a summary card with a hero number, a list row card, a status card with progress, a promo or action card), each with its parts, their order, spacing, radius pairs, and one highlight rule.
3. Update `docs/SCREENS.md` for each screen that changes. Record each choice and its research reason in `docs/DECISIONS.md` under U3.

## 5. Build it

- **Where:** worktree `/Users/admin/destination/ontrack-u3` on branch `u3-text-and-cards`, made from `origin/main` (`git worktree add ../ontrack-u3 -b u3-text-and-cards origin/main`). Node: `source ~/.nvm/nvm.sh && nvm use`, then `pnpm install --frozen-lockfile`. Run every Playwright command with `E2E_PORT=5499`; ports 5199, 5299 and 5399 belong to other lanes.
- **Scope, yours:** the text hierarchy across the app's screens and sheets (Today, Train, Progress, the Add, Search, Review, Meal, Session and Settings sheets, Friends), and the card and list row components and their layouts (`Card`, `Row` and the screen markup that composes them).
- **Not yours, other lanes are changing them now:**
  - P1, the colour palette and every gradient (`design/tokens.css` colours, `design/gradients/`).
  - U2, motion and transitions, the corner radius audit, the update prompt, the app's speed.
  - L4, the landing page (`src/flows/landing/`).

  Use their results; do not restyle them. If a card needs a gradient or motion change, write it in your report instead.
- **Rebasing:** rebase onto `origin/main` before you start coding and again before the pull request. P1 and U2 will merge during your work. Keep both sides in conflicts, and keep the nested corner rule (DESIGN rubric 16 to 21) on every card you touch.
- **Rules:** tokens only, words in `en.ts` (sentence case, no dashes, no exclamation marks, chosen for the tap), no emoji, inputs at 16 px or more, every state of every card worded.
- **Lane rule:** do not edit `docs/STATE.md` or `docs/BLOCKERS.md`. Put a "For STATE" note (one row note, at most 6 lines of notes) and a "For BLOCKERS" note (the owner's check, at most 6 lines) in the pull request body.

## 6. Check it

- `pnpm verify` passes.
- The stress matrix passes: `pnpm exec playwright test --project=stress`, all devices and text sizes.
- `pnpm exec playwright test --project=light --project=dark` passes.
- The `verify-ui` skill: two design critic rounds at most, at 390 in light and dark at scale 1, over every screen you changed. Give the critic your research notes' adopt list too.
- A code review of your diff.
- Before and after screenshots of each changed screen on branch `pr-assets` under `u3/` (never merge that branch).

## 7. Finish

Push, open a pull request with the label `full-ci`, and wait for CI in the background (`gh pr checks --watch` with `run_in_background`). Do not merge: the conductor session verifies and merges. Tell the owner the pull request number, the last lines of `pnpm verify`, what changed screen by screen, what you cut, and anything for the conductor.
