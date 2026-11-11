---
name: verify-ui
description: Check Ontrack UI work against the design rubric using screenshots. Use after building or changing any screen, sheet or shared component, and before saying UI work is done.
---
# Verify UI

Screenshots are expensive to keep in context, so the looking happens in a subagent.

1. Make sure the screen has a case in `tests/e2e/screens.spec.ts` covering its main states (empty, typical, full, error).
2. Run `pnpm screenshots -- --grep "<screen name>"`. Output lands in `screenshots/<screen>/<state>-<theme>-<device>.png` for light and dark at 390 by 844, plus iPhone SE and Pro Max sizes.
3. Run the layout checks: `pnpm exec playwright test --project=stress --grep "<screen name>"`. Fix any overflow, clipped text or tap target under 44 px before going on.
4. Start the `design-critic` subagent. Give it the screenshot folder, the screen's section in `docs/SCREENS.md`, and nothing else. It returns rubric failures only.
5. Fix each failure. Re-run steps 2 to 4. Stop after three rounds and report what remains.
6. Open one light and one dark screenshot yourself as a final sanity check, then report: what you checked, the screenshot paths, and anything left for the owner's eye.

Do not treat a clean critic report as proof of quality on its own. It checks rules. The owner checks taste on a real iPhone at the milestone gate.
