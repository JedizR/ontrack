---
name: port-from-watermelon
description: How to reuse code from the watermelon reference repo at /Users/admin/watermelon-smoothie-shop-budget-webapp. Use when scouting that repo, or before writing any store, sync, PWA, sheet, keypad, onboarding, text size, theme, haptics or test matrix code.
---
# Porting from watermelon

The reuse map is in `docs/ARCHITECTURE.md`. This skill is the method.

## Scouting (once, in M0, in a subagent)

Brief for the `repo-scout` subagent: read the watermelon repo and write `docs/PORT-NOTES.md`, at most 150 lines, covering for each row of the reuse map:

- the exact source files and their line counts
- what the code depends on (other files, packages, globals)
- what is specific to that app and must be removed (Google Sheets, invite codes, Thai strings, shop data)
- any gotcha recorded in its `DECISIONS.md` that applies to the ported code

Also record: the exact dependency versions from `package.json`, the contents of `.nvmrc`, `pnpm-workspace.yaml`, the Playwright projects, and the PWA config. Return only the path of the notes file.

## Porting (every time)

1. Read the relevant lines of `docs/PORT-NOTES.md`, not the watermelon repo.
2. `cp` the source file into place, then edit it. Do not read a file and type it out again.
3. Strip what is app specific. Rename to Ontrack's vocabulary. Replace Thai strings with catalog keys.
4. Bring the tests that cover the file and make them pass before building on it.
5. If a ported behaviour contradicts an Ontrack doc, the Ontrack doc wins.
