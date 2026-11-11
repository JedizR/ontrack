---
name: milestone
description: Start, build and finish an Ontrack milestone from docs/BUILD-PLAN.md. Use when beginning a milestone, when the owner says continue, when a brief says to build milestone M-something, or when a milestone's work looks complete.
---
# Milestone procedure

There are two modes. Attended: the owner is at the keyboard. Unattended: the brief or `STARTING_PROMPT.md` says the owner is away. In unattended mode never ask a question and never wait.

## Start

1. Read `docs/STATE.md`, then only this milestone's section of `docs/BUILD-PLAN.md`, then the docs that section names.
2. `git switch main`, pull if there is a remote, then `git switch -c m<N>-<slug>`.
3. Write a short plan: the steps, the files, the checks.
4. If the plan needs something only the owner can provide: attended, ask once, now. Unattended, follow Blockers below.

## During

- Commit at each working step with a conventional commit message.
- When a decision in the docs cannot hold, record the change in `docs/DECISIONS.md` (one line: what, why) and carry on.

## Blockers, unattended

1. Try the CLI. Then try the owner's browser through `yab-browser`, inside the limits in `STARTING_PROMPT.md`. Two real attempts.
2. Still blocked: add an entry to `docs/BLOCKERS.md` under "Needs your action", take the fallback listed in `STARTING_PROMPT.md`, and keep building.
3. Do not add an MCP server that needs a browser sign in. Use that service's CLI.
4. Each owner check in the build plan becomes an entry under "Needs your eyes" in `docs/BLOCKERS.md`, with the URL or screenshot paths and what to look for.

## Finish

1. Run the milestone's gate from `docs/BUILD-PLAN.md`. Run `pnpm verify`. For UI milestones run the `verify-ui` skill.
2. Review the diff in a fresh context: `/code-review`, or a subagent, or a careful reread if neither is available. Fix findings that affect correctness or a stated requirement. Leave style preferences.
3. If the gate cannot pass after two rounds, cut or stub the failing piece so that `pnpm verify` passes, and record the cut in `docs/STATE.md` and `docs/BLOCKERS.md`.
4. Update `docs/STATE.md`: this milestone's row in the table, what shipped, what was cut, notes for the next milestone.
5. If there is a remote, push and open a pull request with the gate evidence in the description.
6. Attended: tell the owner what shipped, how to see it, what to test on the iPhone, and that they can merge, clear the session and say continue.
   Unattended: return a report to whoever briefed you: the branch and pull request, the last lines of `pnpm verify`, cuts, and blockers added. Do not merge. The conductor merges.
