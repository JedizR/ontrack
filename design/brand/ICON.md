# The app icon, mark and wordmark

`app-icon.svg` is the app icon, frozen by the owner on 12 November 2026: a white track loop with a marker dot on violet `#381AC9`, drawn with plain shapes (no text, no fonts, no external references), so it renders the same everywhere.

- Do not redraw or edit it. `tests/unit/invariants.test.ts` fails if its bytes change or if `public/favicon.svg` stops matching it.
- Every other icon file (favicon, Apple touch icon, PWA and maskable PNGs) is generated from it with `pnpm icons`.
- `mark.svg` is the same loop and dot as a single-colour mark (`currentColor`) for use inside the app.
- `wordmark.svg` is ONTRACK in Roboto Condensed Black capitals, the brand display font, with the O replaced by the mark (owner, 12 November 2026). The loop's outer edge spans exactly baseline to cap height, and its stroke, dot and gap are thickened together to the letters' stem weight so the mark reads as the O; its dot rises a little above the cap line, like a round letter's overshoot. Everything is filled outlines in `currentColor`: no text, font, mask or external reference. Use it where the name is spelled out, such as the landing page header and footer.
- All three are frozen by the same test. The wordmark's generator and ink and white copies are in `/Users/admin/destination/ontrack-design/brand/`.
- Copies for slides and documents, with PNG renders at 1024, 512 and 180 px, are in `/Users/admin/destination/ontrack-design/brand/`.
