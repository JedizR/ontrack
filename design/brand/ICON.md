# The app icon

`app-icon.svg` is the app icon, frozen by the owner on 12 November 2026: a white track loop with a marker dot on violet `#381AC9`, drawn with plain shapes (no text, no fonts, no external references), so it renders the same everywhere.

- Do not redraw or edit it. `tests/unit/invariants.test.ts` fails if its bytes change or if `public/favicon.svg` stops matching it.
- Every other icon file (favicon, Apple touch icon, PWA and maskable PNGs) is generated from it with `pnpm icons`.
- `mark.svg` is the same loop and dot as a single-colour mark for use inside the app.
- Copies for slides and documents, with PNG renders at 1024, 512 and 180 px, are in `/Users/admin/destination/ontrack-design/brand/`.
