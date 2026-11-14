# Ontrack: how we work

## 1. Git and GitHub

- `main` is always deployable. Work happens on a branch per milestone (`m3-data-sync`) or fix (`fix-wheel-se`), merged by squash through a pull request. Turn on branch protection for `main` if the plan allows it. If not, the rule is held by habit and CI.
- Conventional commits: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`, with a scope when it helps (`feat(today): track bar`). Commit at every working step, not at the end.
- A pull request states what changed, shows the evidence, and lists what the owner should test. CI must pass. Each one gets a Vercel preview URL.
- Two milestones can run side by side in separate git worktrees. Give the second one its own end to end port, for example `E2E_PORT=5299 pnpm verify`, so its tests never reuse the other worktree's dev server.
- CI has two levels (owner's call, 12 November 2026, to keep progress fast while the product is young):
  - **Quick**, on every pull request and push to main: `pnpm check`, `pnpm test`, `pnpm build`, the `@smoke` end to end tests, and on a pull request the end to end files it changed (light and dark). About as long as `pnpm verify`. Changes to Markdown or `docs/` alone skip CI, except `docs/SOURCES.md`.
  - **Full**, every end to end test including screenshots and the stress matrix, in three parallel shards: add the `full-ci` label to the pull request, push a release tag (`v1.0.0` and later; milestone tags `v0.x` run nothing), or run the workflow by hand. Use it for a milestone that changes stored data, sync, sign-in, the server or row level security, before a release tag, and whenever a quick run passes but something feels off.
  - The `verify-ui` skill still shoots its screenshots locally, so UI work is checked at full size before review either way.
- Tag each merged milestone `v0.<n>.0`. The release is `v1.0.0`.
- Never commit secrets, `.env` files, the USDA download, screenshots or test reports. `.gitignore` covers them.
- Dependabot opens one grouped pull request a week. Merge it only when `pnpm verify` passes.
- Decisions that change a doc go in `docs/DECISIONS.md`, newest first, one line each: what, why.

## 2. Sessions

Context is the scarce resource. A session that has read everything works worse than one that has read what it needs.

- One milestone per context. With the owner present that is a session, cleared between milestones. In an unattended run it is a fresh subagent per milestone (section 10). `docs/STATE.md` carries what matters across.
- Begin by reading `docs/STATE.md`, the milestone's section, and the docs it names. Nothing else until a task needs it.
- For a milestone with real unknowns, explore and plan in plan mode first, then implement. For clear work, start.
- If you have been corrected twice on the same thing, stop, clear, and restart with a prompt that includes what was learned.
- Name sessions after their milestone so they can be resumed.
- Use `/goal` with the milestone's gate as the condition when the owner wants a run to finish unattended.

## 3. When to use a subagent

Anthropic's current guidance is that one capable agent with skills loaded on demand usually beats a team of specialists on quality, cost and speed, because shared context produces better work than summaries passed between agents. So the default here is the main loop, with procedures kept in skills.

A subagent is the right tool in three cases, and only these:

| Case | Here |
| --- | --- |
| The work would flood the main context with material that is not needed afterwards | `repo-scout` reading the watermelon repo. `design-critic` looking at screenshots, since images are costly to keep |
| Several independent pieces can run in parallel, each needing nothing from the others, each handing back a compact result | `source-checker`, one per paper |
| An independent check by something that did not write the work | `/code-review` at the end of a milestone. `design-critic` against the rubric |

Split by context, never by job title. There is no frontend agent or backend agent. A reviewer asked to find problems tends to invent some: act on findings that affect correctness or a written requirement and leave the rest.

## 4. Tools

| Need | Tool | Note |
| --- | --- | --- |
| Correct Svelte 5 | The Svelte MCP: its documentation tools and `svelte-autofixer` | Run the autofixer on new or heavily changed components |
| Components | The shadcn-svelte CLI | Generate, then restyle. Do not hand write what the CLI provides |
| Driving a browser while building | The Playwright CLI (`playwright-cli`) and its skills | Page snapshots stay on disk instead of in context |
| Regression, screenshots, the device matrix | `@playwright/test` projects in the repo | Deterministic. This is what `verify-ui` and CI run |
| Real iOS behaviour | Safari in the Xcode Simulator when Xcode is installed, then the owner's iPhone | Playwright's WebKit is not Safari. Its moving toolbars, keyboard, safe areas, camera and sign in redirects are only proven on a device |
| The owner's designs | The Figma MCP, when a link is supplied | Ask for one frame at a time. Large frames exceed the tool output limit |
| Database | The Supabase CLI for migrations. The Supabase MCP for advisors, logs and ad hoc queries | Schema changes only through migration files |
| Hosting | The Vercel CLI | Environment variables, logs, deployments |
| GitHub | `gh` | Pull requests, CI status and logs |
| Library behaviour | The library's own documentation, fetched when needed | Versions are pinned. Do not assume an API from memory |
| Final review | `/code-review` on the milestone diff | Fresh context |

Prefer a CLI to an MCP server when both can do the job. Keep the list of connected servers short: Svelte always, Supabase from M0, Figma only while it is being used.

## 5. Checking UI

1. Build the component or screen from tokens and existing components.
2. Look at it in the browser at 390 by 844 through the Playwright CLI while building.
3. Add its states to `tests/e2e/screens.spec.ts`.
4. Run the `verify-ui` skill: screenshots, the stress matrix, then the `design-critic` against the rubric.
5. Fix rule failures. Stop after two rounds.
6. At the milestone gate the owner looks at it on the iPhone. That is the only check of taste. A passing rubric means no rule is broken, not that it is good.

When the owner sends a screenshot or a recording with a complaint, reproduce it in a test first where possible, then fix it, so it cannot come back.

## 6. Spending tokens well

- Copy and edit instead of reading and retyping. Generate with CLIs.
- Read the lines you need. Search before opening. Do not re-read a file you have just written.
- Run one test file while working and the whole suite at the end.
- Keep images out of the main context. Review screenshots in the critic, and open at most two yourself, downscaled (`sips -Z 900`).
- The critic sees only the screens a change touched, at 390 in both themes at scale 1. The SE and the largest text are judged by the stress test's numbers, not by eye, unless the stress run flags them.
- Print the tail of a command, never a whole run: `2>&1 | tail -n 20`.
- A brief names files, sections and line ranges; it does not paste docs.
- Watch CI in the background and wait for the notification. Never poll.
- Shipped milestones' plan sections and notes live in `docs/archive/`. Grep them; do not read them whole.
- Put procedures in skills and facts in docs, so they load only when used. Keep `CLAUDE.md` short. Run `/doctor` on it at M9 and accept sensible cuts.
- Do not write planning or summary files beyond `docs/STATE.md` and `docs/DECISIONS.md`.
- Ask the owner one batched question instead of several small ones.

## 7. What only the owner does

Logins and keys (`docs/USER-INPUTS.md` section 1). Design references and the approval at M1. The checks listed under each milestone in `docs/BUILD-PLAN.md`. Reviewing Privacy and Terms. Arranging a dietitian's review before a public launch.

## 8. When something goes wrong

- A check fails: fix the cause. Do not weaken the check, skip the test or widen a tolerance to get past it. If the check itself is wrong, say so and change it in its own commit.
- A dependency misbehaves at its pinned version: look for a known fix in watermelon's `DECISIONS.md` and `docs/PORT-NOTES.md` first. Then pin the nearest working version and record it.
- A free tier limit is hit: stop, tell the owner what was hit and what it costs to pass it. Do not add a paid service on your own.
- A spec is wrong or contradicts another: follow the PRD for what, the science spec for numbers, the design doc for look, and note the conflict in `docs/DECISIONS.md`.

## 9. Background reading

- Building agents: when to fold subagents into your main agent loop. https://claude.com/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop
- The new rules of context engineering for Claude 5 generation models. https://claude.dev/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models/
- Best practices for Claude Code. https://code.claude.com/docs/en/best-practices

## 10. Unattended runs

When the owner is away, `STARTING_PROMPT.md` sets the rules and the main session acts as a conductor: each milestone is built by a fresh subagent, one at a time, and the conductor checks, merges and moves on. This is the first case in section 3, since ten milestones would flood one context. Anything that needs the owner goes in `docs/BLOCKERS.md` and the build continues on the fallback. Nothing waits. The run is started with `/goal`, so a separate evaluator keeps it going until the final report is printed.

## 11. What shipping M0 to L1 taught (13 November 2026)

Kept, because it worked:
- Small milestones with a gate, tagged on merge, so `main` was always deployable and production moved with every merge.
- Splitting a big milestone into its data or engine half and its screen half (T1a and T1b, S1a and S1b): smaller pull requests, and halves that ran side by side.
- Mechanical guards instead of review: the invariant tests (no emoji, frozen brand files, no numbers in engine code, no gradient on a button) catch a class of mistakes for no tokens. Prefer a test to a rubric item whenever a rule can be measured.
- Quick CI on every pull request, full CI on a label, worktree lanes with `E2E_PORT`.
- Handoffs in `docs/STATE.md`: a pause and two compactions lost nothing.

Changed, because it did not work:
- Feel was never checked. Screens were judged as still images against written rules, so motion, tap feedback, selection, dark contrast and nested corners only came up on the owner's iPhone. U1 adds rubric items and a contrast test for them; motion gets end state tests; interaction work ships with short Playwright videos for the owner.
- A default picked for the fewest taps (auto-advance) was not what the owner wanted. An interaction choice the owner has not seen goes into `docs/DECISIONS.md` with its alternative, and onto the owner's list with a video.
- Docs grew and every worker read them whole: `docs/STATE.md` reached 216 lines against its one screen rule, `docs/BUILD-PLAN.md` 282. Shipped sections and notes now live in `docs/archive/`, and the conductor moves them on each merge.
- Screenshot review was the largest token cost: every state at three sizes and two themes, up to three critic rounds. Section 6 now limits it.
- Lanes conflicted in shared docs (O1 against S1a in `docs/STATE.md`). A worker in a lane leaves `docs/STATE.md` and `docs/BLOCKERS.md` to the conductor and puts its notes in the pull request.
- One check spent the day's free Gemini requests (B1) and held two checks for a day; four fast requests later hit the per-minute limit. An eval runs once per milestone, 30 seconds between photos; tests use fixtures.
- Bookkeeping slipped: L1's row stayed "in progress" after its merge. The conductor updates the row in the commit that records the tag.
- Foreground CI watches timed out. Watch in the background.
- Round 3 (L2 and L3): Safari behaviour shipped on a guess made the bars worse, and a footer feature the owner did not ask for in that form had to be rolled back. Build what the owner describes; when a platform behaviour cannot be checked on a device, cite the vendor's documentation or take the conservative option, and say so. Quality first: rework costs more tokens than care.

## 12. Fine-tuning a screen on localhost, and Sonnet 5.5 (14 November 2026, the L5 session)

The owner ran the landing page's fine-tune as one Sonnet 5.5 session on one local branch, with no CI and no deploy until the end (PR for `landing-finetune`). It was faster and cheaper than the milestone route, and it is the pattern for polish work:

- **Edit on localhost and let the owner look.** `pnpm dev` on :5173 hot-reloads; the owner watches it in the VS Code browser or on the phone over the network address. A visual change takes seconds to see this way, against a CI run and a deploy that cost minutes and runner quota. Spawn an agent to look at a screenshot when the owner is away, not a pipeline. Run `pnpm check`, `pnpm test` and only the specs a change can touch while iterating (`pnpm exec playwright test landing.spec app.spec`); run the whole `pnpm test:e2e` once, at the end, and never two Playwright runs at once (they share `test-results/` and fail each other: 103 false failures in the L5 session).
- **Sonnet 5.5 at xhigh effort is a strong default for most work in this project when the direction is clear.** Opus can spawn it for a lane, a screen or a fix. Give it the owner's words, the files, what is out of scope, and the decisions already made, so it has few decisions to take. It reads sessions, builds, screenshots, regenerates assets and writes tests well.
- **Its suggestions and verdicts are input, not decisions.** Sonnet notices real problems (the footer glow's stacking context, Chromium's backdrop root on a fading ancestor) and also flags things the owner likes (glass chips over the phone's text, the hero's grey-blue sky). Let it list them; the owner picks. In L5 the owner kept some, rejected others, and told it to stick to their list. "Suggest and ask, do not do" is the default for anything the owner has not asked for.
- **Do not paste a decision back at the owner.** Ask only when the answer changes the work; otherwise pick, build, and say what was picked.
