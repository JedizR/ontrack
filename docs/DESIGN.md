# Ontrack: brand and design

`design/tokens.css` holds the values. This file explains the intent, so that new screens come out right without being specified one by one. Since D1 the look is the identity of OneFin, the Framer template "OneFin - Finance SaaS" that the owner chose (https://creative-hands-463340.framer.app/). Its values are extracted in `/Users/admin/destination/ontrack-design/onefin/IDENTITY.md` (authoritative for visual values), `onefin/site/SITE-EXTRACT.md` and `onefin/site/motion/MOTION.md`. Ontrack keeps its own name, mark and app icon. No OneFin logo, wordmark or template artwork (3D renders, phone mockups, app screen images, videos) ships in Ontrack.

## 1. Brand

- **Name.** Ontrack. One word, capital O only. Never OnTrack, On Track or ONTRACK, and never set in a capitalised style.
- **Idea.** A track is a path with a pace. Ontrack shows where you are on yours and whether you are keeping it. The brand is the track itself: a rounded loop with one bright marker on it.
- **Promise.** Eat for the body you are training for.
- **Personality.** A calm coach who is good with numbers. Precise, warm, brief. Not a cheerleader and not a nag.
- **Mark.** `design/brand/mark.svg`: a stadium shaped track with a marker sitting on its top edge. One colour, inherits `currentColor`.
- **App icon.** `design/brand/app-icon.svg`: the mark in white on a violet tile (`--accent`). The tile is the logo wherever the logo sits on a coloured or photographic background, because it brings its own contrast.
- **Wordmark.** The word Ontrack in Geist, weight 600, set to the right of the mark. It is live text, not an image, and never in capitals.
- **In the product,** the track shape returns as the progress bar. That echo is the branding. The logo itself appears only on Welcome and Settings.

## 2. Voice

Plain words, short sentences, numbers first. Sentence case everywhere in the words; the display styles set capitals with CSS only. No exclamation marks, no em or en dashes, no middle dot separators, no emoji. Ranges use "to". A missing value reads "None yet", never a dash. Food is never good, bad, clean or a cheat.

| Instead of | Write |
| --- | --- |
| Great job! You crushed your goal! | On track today |
| You exceeded your calorie limit | 240 over today's target |
| Oops! Something went wrong | Could not analyse the photo. Try again or add it by hand |
| Unlock your potential with AI insights | Your target, corrected from your own results |
| 1,840 / 2,460 kcal | 1,840 of 2,460 kcal |
| Protein · Carbs · Fat | Three labelled values, separated by space or a hairline |
| You failed to log yesterday | Nothing logged yesterday |

## 3. Where each decision comes from

- **OneFin** sets the look: colour, type, components, effects and motion. Violet actions, a bold condensed display face in capitals over a quiet geometric sans, 3D pill buttons with a gradient rim and face, soft cards with big radii, lavender stages and gradients, glass bars, springy motion. Its light sheets and its dark sections are Ontrack's two themes.
- **The Meal AI kit** gives calorie app structure only: one question per screen with Continue pinned, a mid screen wheel with a full width band, height and weight side by side, the plan reveal, weight update as one big value. Not its looks, rings, colours or emoji.
- **Apple's HIG (2025 to 2026)** sets behaviour: 44 pt targets, one or two prominent buttons told apart by style, pickers for ordered lists, the number pad matched to the content, sheets with a visible close, no glass in the content layer.
- **Ontrack's own:** the track bar, and colour used as a state. If something is violet it is the thing to do next. If something is green, a target has been reached.

## 4. Colour

Two themes, same structure. Light is OneFin's light sheets, dark is its dark sections. Values are in `design/tokens.css`; `tests/unit/contrast.test.ts` checks the pairs.

| Role | Token | Use |
| --- | --- | --- |
| Page | `--canvas` | The background of every screen. Safari tints its toolbars from it |
| Cards and sheets | `--surface` | One level above the canvas |
| Controls | `--surface-2`, `--surface-3` | Neutral buttons, inputs, chips, the wheel band, pressed states |
| Text | `--ink`, `--ink-2`, `--ink-3` | Primary, secondary, and tertiary for large or non essential text only |
| Edges | `--line`, `--line-strong` | Hairlines inside a card, the zone on a track |
| Action | `--accent` with `--on-accent`, through `--grad-accent` | The primary button and the dock's plus. Pressed `--accent-press` |
| Lavender | `--accent-soft` with `--on-accent-soft` | Icon tiles and the hero gradient. A surface, never a state |
| Reached | `--success` | Fills a track that is inside its zone |
| Reached as text | `--success-ink` | "On track" words and the week strip's dot. Darker than OneFin's chip text, so it passes on the hero's lavender |
| Heads up | `--attention`, `--attention-soft` | Missing data, a cap or floor applied |
| Destructive | `--danger`, `--danger-soft` | Delete and errors only. Never for food or weight |

Rules:
1. **Violet means act, green means reached.** At most one violet primary button on a screen or sheet, plus the dock's plus. Nothing else is violet or green.
2. Selected chips, segments and choice cards are ink, as OneFin's selected option is black. Switches are ink when on.
3. Progress is ink until it reaches its zone, then green. Over the zone it returns to ink.
4. Gradients only where section 6 names them: the button faces, the hero card, Welcome. No other gradient.
5. Macros are not colour coded. They are told apart by label and position.
6. Green on a light surface is a fill, never small text: words use `--success-ink`.

## 5. Type

Two faces, self hosted from their OFL packages and precached: Roboto Condensed 900 for display, Geist (variable, 400 to 600) for everything else. Thai text falls back to the system face.

| Style | Token | Face, size / line, tracking | Use |
| --- | --- | --- | --- |
| Hero | `--t-hero` | Roboto Condensed 900, 64 / 58, -0.05em | The one number a screen is about |
| Display | `--t-display` | Roboto Condensed 900, 48 / 43, -0.05em | Plan, portion and quick add figures |
| Title | `--t-title` | Roboto Condensed 900, 36 / 36, -0.05em, capitals | Screen titles, onboarding questions |
| Heading | `--t-heading` | Roboto Condensed 900, 24 / 24, -0.03em, capitals | Section and sheet titles, the hero's counterpart |
| Eyebrow | `--t-eyebrow` | Roboto Condensed 900, 14 / 14, capitals | Small labels over figures |
| Lead | `--t-lead` | Geist 400, 18 / 27, -0.01em | Onboarding captions, Your plan's sentence |
| Body | `--t-body` | Geist 400, 16 / 24, -0.02em; 600 for row titles | Default. Inputs are 16 or more |
| Callout | `--t-callout` | Geist 400 to 600, 14 / 21, -0.01em | Buttons below `lg`, secondary rows, chips |
| Caption | `--t-caption` | Geist 500, 12 / 18 | Captions under numbers, metadata, tab labels |

- Capitals come only from `text-transform` on Title, Heading and Eyebrow. Strings in `en.ts` stay in sentence case. The wordmark is never in capitals.
- Body sizes scale with the text size setting through `--fs`. Hero, Display, Title and Heading scale half as much (`--fs-display`).
- Every number that can change uses tabular figures. Numbers in rows, steppers and wheels are Geist (`num`); Hero and Display numbers are the condensed face.
- Nothing below 12 px. Inputs are never below 16 px.

## 6. Space, shape, depth

- **Grid.** 4 px. Page gutter 16 (`--gutter`). Inside cards and sheets 24 (`--inset`). Gap between cards 16. Gap between a label and its value 4. Row height at least 56.
- **Radii.** OneFin's large, concentric corners: 8 for checkboxes, 16 for inputs, thumbnails, chips, small buttons and the wheel band, 20 for the large button and the segmented track, 24 for choice cards and tiles, 32 for cards, 40 for the top of sheets, 48 for the hero card. Full for icon buttons, tracks and the dock. A nested corner is the outer one minus the gap.
- **Depth.** In light mode cards carry `--shadow-card`, OneFin's soft stats card shadow, and never a border with it. In dark mode cards have no shadow and a 1 px `--line` ring. Things that float (the dock, toasts, a dragged row) have `--shadow-float`.
- **Gradients.** `--grad-accent` is the primary face, `--grad-hero` the hero card, `--grad-brand` Welcome. Nothing else.
- **Glass.** Only the dock and the scrolled header are translucent and blurred. Sheets are opaque: no glass in the content layer.
- **Width.** Content sits in a column of at most 480 px, centred on `--surround` on wider screens.
- **One card, one job.** No cards inside cards. Use a hairline to divide a card.

## 7. Components

Start from the components in `src/lib/components/` and their gallery at `/gallery`.

| Component | Specification |
| --- | --- |
| Button | One height system. `lg` 56 for the screen's or sheet's main action, pinned at the bottom; `md` 48 for second actions in content; `sm` 36 on screen and 44 to tap, for inline actions in rows and cards; icon buttons are 44 circles. Variants: `primary`, OneFin's violet 3D pill (`--grad-accent` face inside a 2 px rim, inset light, a stacked violet drop), radius 20 at `lg` and 16 below; `secondary`, the dark 3D pill, at most one per screen; `neutral`, a flat `--surface-2` pill; `plain`, text only; `danger`, flat with a `--danger` label. Pressed: the pill sinks 1 px and scales to 0.98 in 120 ms. Disabled: 40 percent opacity. Labels are verbs in Geist 600 |
| Card | `--surface`, radius 32, padding 24, `--shadow-card` in light, a hairline ring in dark. The hero card is radius 48 on `--grad-hero` |
| Row | A 48 px tile or thumbnail at radius 16, title in Body 600, one line of caption, trailing number in Body 600 tabular. At least 64 high in lists. Divided by hairlines inset to the text |
| Icon tile | 48 square (40 in choice cards) at radius 16, `--accent-soft` with an ink glyph (lavender glyph in dark), OneFin's soft inner glow |
| Chip | 44 high, radius 16, Callout 600, `--surface-2`. Selected: ink fill with canvas text |
| Segmented control | A radius 20 track on `--surface-2` with 4 px padding, segments 44 high at radius 16; the selected segment is `--surface` with `--shadow-card`. At most four options |
| Switch | 50 by 30, ink when on, `--surface-3` when off |
| Track | The signature. A full radius bar, 14 high in the hero and 6 elsewhere, on `--track-bg`. The scale runs from 0 to 110 percent of the target. The on track zone is a slightly darker segment from its lower bound to the end. Fill is ink, and turns `--success` inside the zone. Width animates over 420 ms |
| Hero number | Hero style, a caption beneath ("of 2,460 kcal") and the counterpart on the right in Heading ("620 to go", or "On track" in `--success-ink`). Digits tween when the value changes |
| Wheel | For bounded values: birth year, height, weight, goal weight, body fat. Five rows of `--wheel-row` (44 at default text), the selected row on a full width `--surface-2` band at radius 16; wheels set side by side (height and weight) share one band. Rows in Geist 600 at Heading size, tabular; the selected row ink, the rest `--ink-3`, the edges faded with a mask. The unit sits once, beside the band, in `--ink-2`. Native scroll snap does the momentum. A decimal value has a whole and a tenths column. Tapping the selected row, or Enter, swaps in a 16 px or larger text field for typing. Each column is a slider for assistive tech |
| Wheel sheet | A sheet with the title, a hint caption, the wheel, an optional plain Clear, and the pinned primary Save. Weigh in, goal weight and body fat use it |
| Stepper | Minus and plus as 44 circles on `--surface-2` around a number in Geist 600 at Heading size, which can be typed. Holding repeats. For small counts near a start: days, minutes, sets, reps, grams |
| Number field | Exact, wide range values (Quick add): a native field with the number pad (`inputmode`), not `type="number"` |
| Input | 56 high, radius 16, `--surface-2`, label in Caption above. Focus draws a 2 px ink ring |
| Sheet | vaul Drawer. Top radius 40, grabber 36 by 5, title in Heading beside a 44 close button, a back chevron on the left when the sheet has a step. Content scrolls under a hairline; the main action is pinned to the bottom above the safe area. Opens to content height, at most 92 percent of the visible height |
| Dock | A floating glass pill with three tabs and, to its right, the 64 violet 3D plus, both 64 high, 12 above the safe area. Selected tab in ink with its label, others in `--ink-2` |
| Header | 56 high, opaque canvas, the title in Title on the left, sync mark and avatar on the right. A hairline appears once content scrolls under it |
| Week strip | Seven equal cells 64 high: weekday letter in Caption, the date in Body 600 tabular, a 5 px dot in `--success-ink` when that day was on track (`--success` on today's ink pill). Today is an ink pill at radius 24 |
| Toast | Top centre inside the column, 16 from the edges, `--toast-bg` in both themes, radius 20, one line, optional Undo. One at a time |
| Source label | Caption text: Database or Estimate. Estimate carries a small outlined circle before it. No colour |
| Sync mark | An 8 px dot beside the avatar: hidden when idle, `--ink-3` pulsing when syncing, hollow when offline, `--attention` when it needs attention. Tapping it explains the state |
| Empty state | A line of body text saying what will appear here and one button to make it appear. No illustrations |
| Skeleton | Blocks in `--surface-2` at the final layout's sizes, with a slow opacity pulse |

## 8. Banned

These are what make an app look machine made. None of them ship.

1. Neon outlines, glows behind text, mesh backgrounds, and any gradient section 6 does not name.
2. Emoji or sparkle icons standing in for icons. Any "AI" badge or sparkle next to the photo feature.
3. A dashboard of small stat cards with icons in tinted circles.
4. Rings and doughnuts for calories or macros. Rainbow macro colours.
5. Borders on cards, or a border and a shadow together. Shadows only as `--shadow-card`, `--shadow-float` and the 3D pill.
6. One radius used everywhere. Cards inside cards.
7. Centred body text, centred forms, marketing copy inside the app.
8. Wide letter spacing. Capitals typed into the words. Mixed title case and sentence case.
9. A serif or editorial look, cream backgrounds, drop caps.
10. Stock illustrations, mascots, confetti, streak flames, badges, and OneFin's own artwork or logo.
11. Red or green used to judge food or weight.
12. Em dashes, en dashes, middle dots, exclamation marks, and the words unlock, supercharge, journey, crush, smart.
13. A spinner as the only loading state. A modal dialog where a sheet or inline message would do.
14. A calculator keypad. Bounded values use a wheel, free amounts the native number pad or a stepper.

## 9. Rubric

The `design-critic` subagent checks screenshots against these, side by side with the OneFin reference it is given. Each is pass or fail.

1. Tokens only: every colour, radius and type size on screen exists in `design/tokens.css`.
2. Violet budget: at most one violet primary button plus the dock's plus. Any green is a reached target.
3. One focus: the screen has one clearly largest element, and it is the thing the screen is about.
4. Type scale: every text matches a style in section 5. Display styles are condensed capitals; numbers are tabular.
5. Alignment: content aligns to the 16 px gutter outside cards and the 24 px inset inside them. Numbers in a list align on the right edge.
6. Spacing: gaps come from the 4 px grid, and equal things have equal gaps.
7. Depth: cards carry only `--shadow-card` (light) or a hairline ring (dark); only the dock, toasts and dragged rows float; buttons are the 3D pill or flat.
8. Nothing from the banned list.
9. Copy: sentence case in the words, no banned punctuation or words, numbers formatted with grouping and units.
10. Touch: every control is at least 44 px and has a visible pressed state in the interaction screenshots. One button height per role (56, 48, 36 in 44).
11. Both themes: the dark and light screenshots have the same structure, and no text falls below its contrast bar.
12. Fit: no clipping or overflow on the SE in Safari (375 by 548) or at the largest text size. The main action is reachable without scrolling on a sheet.
13. States: empty, loading and error states exist for the screen and follow sections 7 and 2.
14. The spec: the screen contains what its section of `docs/SCREENS.md` lists, in that order.
15. Identity: placed beside its OneFin reference, the screen reads as the same family: the condensed capitals, the violet pill, the soft big-radius cards, the lavender stage.

## 10. Motion and feedback

Fixed values from MOTION.md. With reduced motion set, every one becomes an instant change; opacity fades of 150 ms or less may stay.

- Presses respond within 100 ms: the pill sinks 1 px and scales to 0.98, other controls scale to 0.97 with a colour step, over 120 ms.
- State changes (chips, segments, switches, toasts) use OneFin's default spring, 0.4 s with a little bounce (`--spring-default`, 420 ms).
- Sheets use the vaul spring. Tabs slide from the side they came from; swiping between tabs follows the finger.
- Values that change tween: numbers count over 400 ms, tracks grow over 420 ms with `--ease-out`.
- Today's cards fade up 8 px with a 40 ms stagger on the first paint of a session only (`--spring-appear`).
- Reaching the zone is marked once: the track turns green and a light haptic plays. No confetti.
- Haptics through the switch technique: light on a logged meal, on reaching a target and on toggles. None on navigation, and none on wheels (iOS gives a scroll none).

## 11. Icons and imagery

- Lucide icons at 24 px, stroke 2, in `currentColor`. Tab icons: a track for Today, a barbell for Train, a rising line for Progress.
- Icon tiles are lavender with an ink glyph (section 7), OneFin's tile treatment in Ontrack's colours.
- Imagery is the user's own meal photos, the brand gradients and decoration drawn in CSS or SVG in OneFin's manner (gradient pills, tilted chips). No stock art and none of OneFin's 3D renders, mockups or screen images.
- A meal without a photo gets a neutral tile with an icon for how it was logged.

## 12. Accessibility

- Text contrast 4.5 to 1 or better against its background, 3 to 1 for large text. `--ink-3` is for large or non essential text only. `tests/unit/contrast.test.ts` checks the token pairs.
- The green fill of a reached track is about 1.8 to 1 on white. It is never the only signal: the value is always also text, and "On track" is also a word and a dot.
- Every control has an accessible name. Sheets trap focus and restore it. The track exposes its value as text. Wheel columns are sliders with a value text ("168 cm") and arrow, page and home or end keys.
- Pinch zoom stays enabled. Text size follows the device by default.
