# Ontrack: unattended build

The owner is away for this whole run. Build Ontrack from M0 through M9 without waiting for anyone. When he returns there should be a working app on `main`, deployed if deployment was possible, and one short file telling him what only he can do.

## What is in this folder

- `CLAUDE.md` loads every session: commands, invariants, and a map of which doc answers which question.
- `docs/BUILD-PLAN.md` has the ten milestones and their gates. `docs/STATE.md` is the handoff note and progress table. `docs/BLOCKERS.md` is where anything that needs the owner goes.
- `design/` holds the tokens, the brand marks and a reference mock. They are the source of truth for look and feel.
- `/Users/admin/watermelon-smoothie-shop-budget-webapp/` is the reference implementation to port from. It is read only.

## Ground rules

1. **Never ask, never wait.** No message ends with a question. Anything that needs the owner becomes an entry in `docs/BLOCKERS.md`, you take the fallback below, and you keep building.
2. **Decisions are settled.** Do not reopen `docs/ARCHITECTURE.md`. If reality blocks a decision, take the closest working option, add one line to `docs/DECISIONS.md`, continue.
3. **Use what the owner filled in** in `docs/USER-INPUTS.md` and the default beside every empty slot. Rows marked needed there are needed for the real service, not for the build.
4. **Port, do not retype.** Copy from watermelon with `cp` and edit. Generate boilerplate with CLIs.
5. **Prove it.** A milestone is done when its gate passes and the evidence is shown. `pnpm verify` is the check.
6. **Quality bar.** A product, not a demo. No placeholder screens, dead buttons or TODOs in shipped paths. What cannot be finished is cut visibly and recorded.
7. **Spend nothing.** No paid plan, trial, add-on or billing change, by any route.

## You are the conductor

A run this long does not fit in one context, so keep yours small. Build each milestone in a fresh subagent, one at a time, and hold only the handoff notes yourself.

For each milestone from M0 to M9, in order:

1. Start a general purpose subagent in the foreground with this brief, filling in the number:
   "Build milestone M<n> of Ontrack in this repository. The owner is away: unattended mode. Read `CLAUDE.md` and `docs/STATE.md`, then follow the `milestone` skill for M<n>. The limits on using the owner's browser and the fallbacks for blockers are in `STARTING_PROMPT.md`, sections 'Things that normally need the owner' and 'Blockers'. Return: the branch and pull request, the last lines of `pnpm verify`, what you cut, and the blockers you recorded. Do not merge."
2. When it returns, check the work yourself. Switch to its branch, run `pnpm verify`, and show the last lines. If there is a remote, check CI with `gh pr checks`.
3. Passing: merge by squash, tag `v0.<n>.0`, return to an up to date `main`. With no remote, merge locally.
4. Failing: send one fix-up subagent with the failing output. After two fix-ups that still fail, have the failing piece cut or stubbed until `pnpm verify` passes, record the cut in `docs/STATE.md` and `docs/BLOCKERS.md`, then merge.
5. Update the table in `docs/STATE.md`, print one line (milestone, status, cuts, blockers added), and start the next milestone at once.

Never merge a branch on which `pnpm verify` fails. Never stop between milestones. If a milestone worker cannot start the helper agents (`repo-scout`, `source-checker`, `design-critic`), it does that work in its own context. If subagents cannot be started at all, build the milestones yourself in this session and re-read `docs/STATE.md` at each boundary.

## Things that normally need the owner

Try in this order: the CLI, then the owner's browser, then record it and fall back.

You have `yab-browser`, an MCP server and plugin of that name. It drives the owner's real browser with his logins. Read its tool descriptions before first use.

- **Sites you may act on:** github.com, vercel.com, supabase.com, console.cloud.google.com, aistudio.google.com, and their sign in pages. Elsewhere you may only read documentation.
- **What you may do there:** create what this project needs and read the settings and keys that belong to it. That means: a private repository `ontrack`. A Supabase project `ontrack` on the free plan in Singapore. A Vercel project on the Hobby plan. A Google Cloud project `ontrack` with an OAuth consent screen left in Testing, the owner's address as a test user, and a Web OAuth client whose id and secret go into Supabase's Google provider. A Gemini API key in a Google project that has no billing account.
- **Never:** enter or change payment details, link a billing account, upgrade a plan or accept a paid trial. Delete, pause, rename or reconfigure anything that existed before this run. Change account security: passwords, two factor, app passwords, recovery. Send email or messages. Publish the consent screen. Make a repository or project public. If the only way to something crosses one of these, it is a blocker.
- **A sign in challenge is a blocker.** A CAPTCHA, a two factor prompt or a "confirm it is you" screen is not to be worked around.
- **Secrets never appear** in the conversation, a commit, a log or a doc. Move them between tools by pipe or file, for example from `supabase projects api-keys` into `vercel env add`, then `vercel env pull .env.local`. Refer to them by name.
- **Do not add an MCP server that needs a browser sign in** during the run. Use that service's CLI.

## Blockers

A blocker is something that still needs the owner after two real attempts by different routes. When you hit one:

1. Add it to `docs/BLOCKERS.md` under "Needs your action": what is blocked, what you tried, the exact steps for the owner, and the sentence he should give Claude afterwards.
2. Take the fallback and keep building.

| Blocked | Carry on with |
| --- | --- |
| GitHub repository | Local git with the same branches. Skip pull requests and CI. `pnpm verify` is the gate |
| Vercel | `pnpm build` and `pnpm preview`. Run the installability check against the local preview |
| Supabase project or keys | The mock backend everywhere. Still write the migration and the Supabase backend. Run the conformance suite on the mock only |
| Google sign in client | Email code sign in, which reaches the owner's own address through the built in mailer. Build and test the Google path against the mock |
| Gemini key | The mock vision provider. Write the Gemini provider and mark it untested |
| Figma or references missing | The defaults in `docs/DESIGN.md` |
| The owner's ten meal photos in M6 | Ten freely licensed food photos from Wikimedia Commons, at least five of Thai dishes, kept outside the repository, if a Gemini key exists |
| Anything that needs a real iPhone | Playwright WebKit at iPhone sizes, and an entry under "Needs your eyes" |

3. Owner checks in `docs/BUILD-PLAN.md` never hold up the run. Each becomes an entry under "Needs your eyes" with the URL or screenshot paths and what to look for. For this run a clean rubric pass stands in for the M1 approval. List every design decision made on the owner's behalf in `docs/DECISIONS.md`.

## Finish

When M9 is merged, or every remaining milestone is blocked, update `docs/STATE.md` and print the final report in one message:

1. The milestone table from `docs/STATE.md`.
2. The last lines of a `pnpm verify` run on `main`.
3. The full contents of `docs/BLOCKERS.md`.
4. The production or preview URL, or how to run it locally.
5. The three things the owner should do first.
