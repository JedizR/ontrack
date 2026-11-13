---
name: verify-ui
description: Check Ontrack UI work against the design rubric using screenshots. Use after building or changing any screen, sheet or shared component, and before saying UI work is done.
---
# Verify UI

Screenshots are expensive to keep in context, so the looking happens in a subagent.

1. Make sure the screen has a case in `tests/e2e/screens.spec.ts` covering its main states (empty, typical, full, error).
2. Run `pnpm screenshots -- --grep "<screen name>"`. Output lands in `screenshots/<screen>/<state>-<theme>-<device>.png` for light and dark at the browser viewports: `390` (390 by 664, Safari on a 390 by 844 phone with its toolbars), `se` (375 by 548) and `promax` (430 by 739). `screenshots/xl/` holds the SE at the largest text.
3. Run the layout checks: `pnpm exec playwright test --project=stress --grep "<screen name>"`. They cover every device at the three text sizes. Fix any overflow, clipped text or tap target under 44 px before going on.
4. Copy the changed screens' `*-390.png` files, light and dark, at scale 1 into a scratch folder (`sips --resampleWidth 390 <file> --out <folder>`). Start the `design-critic` subagent. Give it that folder, the screen's section in `docs/SCREENS.md`, the matching OneFin reference images (`onefin/site/pages/<page>/mobile-vp-*.png`, `onefin/site/components/<Name>/mobile-*.png`, `onefin/framer/screens/*.png` under `/Users/admin/destination/ontrack-design/`), and nothing else. It returns rubric failures only.
5. Fix each failure. Re-run steps 2 to 4 for the screens that changed. Stop after two rounds and report what remains.
6. Open one light and one dark scale 1 screenshot yourself as a final sanity check, then report: what you checked, the screenshot paths, and anything left for the owner's eye.

Do not treat a clean critic report as proof of quality on its own. It checks rules. The owner checks taste on a real iPhone in Safari at the milestone gate.

Screenshots cannot judge motion, gestures or tap feedback. For that work, test the end state, check reduced motion, and record a short Playwright video of the interaction in light and dark for the owner (on `pr-assets`). Do not open the videos yourself.
