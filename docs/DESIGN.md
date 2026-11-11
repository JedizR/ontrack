# Ontrack: brand and design

`design/tokens.css` holds the values. `design/reference-today.html` shows them in use. This file explains the intent, so that new screens come out right without being specified one by one. The owner's own Figma and references refine this (see `docs/USER-INPUTS.md` for precedence).

## 1. Brand

- **Name.** Ontrack. One word, capital O only. Never OnTrack, On Track or ONTRACK.
- **Idea.** A track is a path with a pace. Ontrack shows where you are on yours and whether you are keeping it. The brand is the track itself: a rounded loop with one bright marker on it.
- **Promise.** Eat for the body you are training for.
- **Personality.** A calm coach who is good with numbers. Precise, warm, brief. Not a cheerleader and not a nag.
- **Mark.** `design/brand/mark.svg`: a stadium shaped track with a marker sitting on its top edge. One colour, inherits `currentColor`.
- **App icon.** `design/brand/app-icon.svg`: the mark in lime on an ink tile. The tile is the primary logo wherever the logo appears on a coloured or photographic background, because it brings its own contrast.
- **Wordmark.** The word Ontrack in the rounded system face, weight 600, letter spacing -0.01em, set to the right of the mark at the mark's cap height. It is live text, not an image.
- **In the product,** the track shape returns as the progress bar. That echo is the branding. The logo itself appears only on the welcome screen, the install guide and Settings.

## 2. Voice

Plain words, short sentences, numbers first. Sentence case everywhere. No exclamation marks, no em or en dashes, no middle dot separators, no emoji. Ranges use "to". A missing value reads "None yet", never a dash. Food is never good, bad, clean or a cheat.

| Instead of | Write |
| --- | --- |
| Great job! You crushed your goal! | On track today |
| You exceeded your calorie limit | 240 over today's target |
| Oops! Something went wrong | Could not analyse the photo. Try again or add it by hand |
| Unlock your potential with AI insights | Your target, corrected from your own results |
| 1,840 / 2,460 kcal | 1,840 of 2,460 kcal |
| Protein · Carbs · Fat | Three labelled values, separated by space or a hairline |
| You failed to log yesterday | Nothing logged yesterday |

## 3. What we take from the references

- **From Luma:** the system font, quiet weights where size does the work, chrome with no colour of its own, colour arriving through content (here, food photos), large radii, calm spacing, no shadows on cards.
- **From Higgsfield:** one acid lime against near black, used as a fill with dark text on it, sparse and confident.
- **From Apple's own apps:** rounded numerals, large legible figures, sheets instead of pages, a floating bar, native controls where they exist.
- **Ontrack's own:** the track bar, and lime used as a state. If something is lime, it is either the one thing to do next or a target that has been reached.

## 4. Colour

Two themes, same structure. Values are in `design/tokens.css`.

| Role | Token | Use |
| --- | --- | --- |
| Page | `--canvas` | The background of every screen and the status bar area |
| Cards and sheets | `--surface` | One level above the canvas |
| Controls | `--surface-2`, `--surface-3` | Neutral buttons, tracks, keys, pressed states |
| Text | `--ink`, `--ink-2`, `--ink-3` | Primary, secondary, and tertiary for large or non essential text only |
| Edges | `--line`, `--line-strong` | Hairlines, and the edge of a tappable control |
| Lime fill | `--lime` with `--on-lime` text | Primary button, plus button, a track that has reached its zone |
| Lime as text | `--lime-ink` | "On track" words and marks. Dark olive in light mode, lime in dark mode |
| Lime surface | `--lime-soft` | Background of a reached state, for example the check-in result |
| Heads up | `--attention`, `--attention-soft` | Missing data, a cap or floor applied |
| Destructive | `--danger`, `--danger-soft` | Delete and errors only. Never for food or weight |

Rules:
1. Lime is never text on a light surface and never a background for long text.
2. At most one lime button on a screen, plus the plus button in the dock.
3. Progress is ink until it reaches its zone, then lime. Over the zone it returns to ink.
4. No pure black or pure white. No gradients on interface elements. No tinted greys.
5. Macros are not colour coded. They are told apart by label and position.

## 5. Type

One family for text (`--font-ui`, the system face) and its rounded cut for numbers (`--font-num`). All numbers that can change use tabular figures.

| Style | Size and line | Weight | Use |
| --- | --- | --- | --- |
| Hero | 64 / 64 | 600, rounded | The one number a screen is about |
| Display | 40 / 44 | 600, rounded | Plan and check-in figures |
| Title | 28 / 34 | 600 | Screen titles |
| Heading | 20 / 26 | 600 | Section and sheet titles |
| Body | 17 / 24 | 400 | Default text, row titles at 600 |
| Callout | 15 / 20 | 400 or 500 | Buttons, secondary rows |
| Caption | 13 / 18 | 500 | Labels under numbers, metadata |
| Micro | 11 / 14 | 600 | Tab labels only |

Sizes scale with the text size setting through `--fs`. Hero and Display scale half as much. Letter spacing is -0.02em on Hero, -0.01em on Title, and 0 elsewhere. No all caps labels. No text below 11 px. Inputs are never below 16 px.

## 6. Space, shape, depth

- **Grid.** 4 px. Screen gutter 20. Card padding 20. Gap between cards 12. Gap between a label and its value 4. Row height at least 56.
- **Radii.** 12 for inputs, keys and thumbnails. 16 for rows and small tiles. 24 for cards. 32 for the hero card and the top of sheets. Full for buttons, chips and tracks. Nested corners step down by one size.
- **Depth.** Cards are flat: a surface on the canvas, no shadow, no border. Only things that float have `--shadow-float`: the dock, toasts, a dragged row.
- **Blur.** Only the dock and a scrolled header use a translucent blurred background.
- **Width.** Content sits in a column of at most 480 px, centred on `--surround` on wider screens.
- **One card, one job.** No cards inside cards. Use a hairline to divide a card.

## 7. Components

Start from shadcn-svelte and restyle with tokens. Build these on top.

| Component | Specification |
| --- | --- |
| Button | Height 52 for the main action, 44 standard, 36 compact. Full radius. `primary` lime with ink text. `neutral` on `--surface-2`. `plain` text only. `danger` in `--danger` text on `--surface-2`. Pressed: scale 0.97 and the press colour, 120 ms. Disabled: 40 percent opacity. Labels are verbs: Add, Save, Done |
| Track | The signature. A full radius bar, 14 high in the hero and 6 elsewhere, on `--surface-2`. The scale runs from 0 to 110 percent of the target. The on track zone is drawn as a slightly darker segment from its lower bound to the end. Fill is ink, and turns lime inside the zone. Width animates over 420 ms |
| Hero number | Hero style, with a caption beneath ("of 2,460 kcal") and the counterpart on the right ("620 to go"). Digits tween when the value changes |
| Card | `--surface`, radius 24, padding 20. Hero card radius 32 |
| Row | Leading 44 px tile or thumbnail at radius 12, title in body 600, one line of caption, trailing number in rounded 600. Divided by hairlines inset to the text |
| Chip | Height 36, full radius, `--surface-2`. Selected: ink fill with canvas text |
| Segmented control | Full radius track on `--surface-2`, selected segment on `--surface` with a hairline. At most four options |
| Sheet | vaul Drawer. Top radius 32, grabber 36 by 5, title in Heading, the main action pinned to the bottom above the safe area. Content scrolls under a hairline. Opens to content height, at most 92 percent of the screen |
| Keypad | Ported from watermelon. Keys radius 12, height `clamp(46px, 6.4dvh, 60px)`, rounded numerals at 24. The amount shows in Display above the keys with its unit |
| Stepper | Minus and plus as 44 px circles on `--surface-2` around a rounded number. Holding repeats |
| Dock | A floating pill with three tabs and, to its right, the lime plus button, both 64 high, 14 above the safe area. Selected tab in ink with its label, others in `--ink-3` |
| Header | 52 high, opaque canvas, title on the left, sync mark and avatar on the right. A hairline appears once content scrolls under it |
| Week strip | Seven equal cells: weekday letter, date in rounded 600, a 5 px dot in `--lime-ink` when that day was on track. Today is an ink pill |
| Toast | Top centre inside the column, 16 from the edges, dark in both themes, one line, optional Undo. One at a time |
| Source label | Caption text: Database or Estimate. Estimate carries a small outlined circle before it. No colour |
| Sync mark | An 8 px dot beside the avatar: hidden when idle, `--ink-3` pulsing when syncing, hollow when offline, `--attention` when it needs attention. Tapping it explains the state |
| Empty state | A line of body text saying what will appear here and one button to make it appear. No illustrations |
| Skeleton | Blocks in `--surface-2` at the final layout's sizes, with a slow opacity pulse |

## 8. Banned

These are what make an app look machine made. None of them ship.

1. Purple or blue gradients, glows, neon outlines, glass cards, mesh backgrounds.
2. Emoji or sparkle icons standing in for icons. Any "AI" badge or sparkle next to the photo feature.
3. A dashboard of small stat cards with icons in tinted circles.
4. Rings and doughnuts for calories or macros. Rainbow macro colours.
5. Shadows on cards, borders on everything, or both together.
6. One radius used everywhere. Cards inside cards.
7. Centred body text, centred forms, hero sections, marketing copy inside the app.
8. All caps labels with wide tracking. Mixed title case and sentence case.
9. A serif or editorial look, cream backgrounds, drop caps.
10. Stock illustrations, mascots, confetti, streak flames, badges.
11. Red or green used to judge food or weight.
12. Em dashes, en dashes, middle dots, exclamation marks, and the words unlock, supercharge, journey, crush, smart.
13. A spinner as the only loading state. A modal dialog where a sheet or inline message would do.

## 9. Rubric

The `design-critic` subagent checks screenshots against these. Each is pass or fail.

1. Tokens only: every colour, radius and type size on screen exists in `design/tokens.css`.
2. Lime budget: at most one lime button plus the dock's plus button, and any other lime is a reached target.
3. One focus: the screen has one clearly largest element, and it is the thing the screen is about.
4. Type scale: every text matches a style in section 5. Numbers are rounded and tabular.
5. Alignment: content aligns to the 20 px gutters. Numbers in a list align on the right edge.
6. Spacing: gaps come from the 4 px grid, and equal things have equal gaps.
7. Depth: no shadow or border on cards. Only the dock and toasts float.
8. Nothing from the banned list.
9. Copy: sentence case, no banned punctuation or words, numbers formatted with grouping and units.
10. Touch: every control is at least 44 px and has a visible pressed state in the interaction screenshots.
11. Both themes: the dark and light screenshots have the same structure, and no text falls below its contrast bar.
12. Fit: no clipping or overflow on the SE size or at the largest text size. The main action is reachable without scrolling on a sheet.
13. States: empty, loading and error states exist for the screen and follow sections 7 and 2.
14. The spec: the screen contains what its section of `docs/SCREENS.md` lists, in that order.

## 10. Motion and feedback

- Presses respond within 100 ms: scale to 0.97 and a colour step.
- Sheets use the vaul spring. Tabs slide from the side they came from, as in watermelon. Swiping between tabs follows the finger.
- Values that change tween: numbers count over 400 ms, tracks grow over 420 ms with `--ease-out`.
- Reaching the zone is marked once: the track turns lime and a light haptic plays. No confetti.
- Haptics through the watermelon switch technique: light on a logged meal, on reaching a target and on toggles. None on navigation.
- With reduced motion set, tweens and slides become instant cross fades.

## 11. Icons and imagery

- Lucide icons at 24 px, stroke 1.75, in `currentColor`. Tab icons: a track for Today, a dumbbell for Train, a rising line for Progress.
- The only imagery is the user's own meal thumbnails. They are the colour in the interface, so give them room: 44 px in lists, full width at the top of the review sheet.
- A meal without a photo gets a neutral tile with an icon for how it was logged.

## 12. Accessibility

- Text contrast 4.5 to 1 or better against its background. `--ink-3` is for large or non essential text only.
- Every control has an accessible name. Sheets trap focus and restore it. The track exposes its value as text.
- Colour never carries meaning alone: on track is also a word and a dot.
- Pinch zoom stays enabled. Text size follows the device by default.
