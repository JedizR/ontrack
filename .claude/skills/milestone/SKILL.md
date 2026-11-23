---
name: milestone
description: Start, build and finish a round of Ontrack work (an item from docs/BUILD-PLAN.md or the owner's own list). Use when beginning a round, when the owner says continue, when a brief says to build an item, or when a round's work looks complete.
---
# Round procedure

The owner is usually at the keyboard and watching on their iPhone through their own :5173 server. The full procedure is `docs/WORKFLOW.md`; this is the checklist.

## Start

1. Read `docs/STATE.md` and `docs/DIRECTIONS.md`, then the item in `docs/BUILD-PLAN.md` (or the owner's list), then only the docs it names.
2. `lsof -iTCP:5173 -sTCP:LISTEN` (the owner's server: never kill it). Branch from an up to date `main`: `feat-<slug>` or `fix-<slug>` (WORKFLOW section 1 on branching while the owner watches).
3. Write a short plan: the steps, the files, the checks. If it needs something only the owner can give (a key, a decision that is theirs, a device check), ask once, now, in one batched question.

## During

- Build what was asked; list anything extra as a suggestion.
- Commit at each working step with a conventional commit message.
- Check your own UI (WORKFLOW section 4) in both styles, light and dark, before handing it over. Then tell the owner what changed and wait for their look.
- A decision that changes a doc goes in `docs/DECISIONS.md` under the round's heading; a new standing direction from the owner goes in `docs/DIRECTIONS.md`.

## Finish (when the owner says deploy)

1. `pnpm verify`, then the full `pnpm test:e2e` alone. For UI work, the `verify-ui` skill.
2. Review the diff in a fresh context (`/code-review` or a subagent). Fix findings that affect correctness or a stated requirement.
3. Update `docs/STATE.md` (what shipped, what is open), `docs/BUILD-PLAN.md` (remove what shipped), and DESIGN.md or SCREENS.md if a screen or rule changed.
4. Release by WORKFLOW section 5: version bump, pull request, CI, squash merge, tag, wait for the production deploy, `pnpm smoke:prod`, CI on `main` green.
5. Tell the owner the version, what shipped and what to look at on the phone.
