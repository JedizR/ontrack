# Ontrack: brand and design

`design/tokens.css` holds the values. This file explains the intent, so that new screens come out right without being specified one by one. Since D1 the look is the identity of OneFin, the Framer template "OneFin - Finance SaaS" that the owner chose (https://creative-hands-463340.framer.app/). Since D2 the primary source is the owner's sixteen picks in `/Users/admin/destination/ontrack-design/onefin/owner-picks/`, read one by one in `OWNER-PICKS.md` there: "the most direct answer to what design to adopt from OneFin". The wider extraction (`onefin/IDENTITY.md`, `onefin/site/SITE-EXTRACT.md`, `onefin/site/motion/MOTION.md`) is background; where it disagrees, the picks win. Ontrack keeps its own name, mark and app icon. No OneFin logo, wordmark, photo, person or template artwork (3D renders, phone mockups, app screen images, videos) ships in Ontrack; decoration is CSS or SVG.

## 1. Brand

- **Name.** Ontrack. One word, capital O only, in every sentence. Never OnTrack or On Track. The wordmark's capitals are a drawing, not a spelling.
- **Idea.** A track is a path with a pace. Ontrack shows where you are on yours and whether you are keeping it. The brand is the track itself: a rounded loop with one bright marker on it.
- **Promise.** Eat for the body you are training for.
- **Personality.** A calm coach who is good with numbers. Precise, warm, brief. Not a cheerleader and not a nag.
- **Mark.** `design/brand/mark.svg`: a stadium shaped track with a marker sitting on its top edge. One colour, inherits `currentColor`.
- **App icon.** `design/brand/app-icon.svg`: the mark in white on a violet tile (`--accent`). The tile is the logo wherever the logo sits on a coloured or photographic background, because it brings its own contrast.
- **Wordmark.** `design/brand/wordmark.svg`: ONTRACK in Roboto Condensed Black capitals with the mark as its O (owner, 12 November 2026), filled outlines in `currentColor`, frozen with the mark and icon (`design/brand/ICON.md`). `Wordmark.svelte` draws the file itself. Use it only where the name is spelled out: the landing page's bar and its giant footer (L1).
- **In the product,** the track shape returns as the progress bar. That echo is the branding. The logo itself appears only on the landing page and in Settings.

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

### Words that ask for a tap (O1)

From the onboarding wording research (`ontrack-design/onboarding/COPY.md`). Apply to every new screen, and to every main action label in `src/lib/i18n/en.ts`.

1. **Buttons name the outcome.** Verb plus object: "Build your plan", "Save this plan", "Add 640 kcal", "Take a photo", "Find the foods". "Continue" only between the steps of one flow, used the same way everywhere.
2. **Speak to the user as "you", sparingly.** Few possessives, and never "my" and "your" on one screen. Where ownership matters, "this" ("Save this plan" under "Your plan").
3. **Questions are headlines.** Five to eight words, phrased as the question you want answered. Results and information screens are statements.
4. **Answers are complete replies.** A tappable answer makes sense on its own, because tapping it acts: "None of these apply", "Not yet", "Lifting".
5. **Numbers first, with units.** "2,460 kcal on training days", "about 0.3 kg a week". Ranges use "to". No dates for weight change.
6. **Near health or body questions, one fact.** One short functional line or nothing. Thank people after they share something sensitive ("Thank you for telling us."), never before. No paragraph of reassurance.
7. **Say what a default is.** Every default shows on screen with where to change it ("Change it any time in Train").
8. **Time and count claims only when measured.** "About a minute" only once a cold median says so.
9. **Declines are plain and equal.** "Not now", "Later", "Keep the current target". Never a sentence that blames the person for saying no.
10. **Neutral about food and bodies.** No good, bad, clean, cheat, burn off, guilt or celebration; no "Congratulations", no exclamation marks, no emoji.

| Tactic | Fine when | Crosses the line when |
| --- | --- | --- |
| Stating time or a question count | Measured and true | Shorter than real, or "only" and "just" used to rush |
| Ownership words | Used consistently | Used to make a decline feel like a loss ("No, I don't want my plan") |
| A preselected answer | The evidence-based default, visible | It preselects something that costs money or data |
| Social proof | Sourced and relevant | Unsourced or invented |
| Progress and head starts | The progress is real (the goal was answered, the plan is saved) | The bar moves faster than the work |
| Showing work while waiting | The work and the wait are real | A fake loader |
| Thanking and acknowledging | After a disclosure | Before it, to steer the answer |
| Urgency | Never | Countdowns, expiring offers, "last chance" |

## 3. Where each decision comes from

- **OneFin, through the owner's picks,** sets the look: colour, type, components, effects and motion. Flat ink pill actions (the "Withdraw" button), violet as the brand rather than the button, a bold condensed display face in capitals over a quiet geometric sans, big numbers in regular weight with lighter decimals, solid cards with big nested radii, one soft haze per screen, glass only on small chips, the dock and sheet backdrops, springy motion. Its light sheets and its dark sections are Ontrack's two themes. Each pattern is adopted for a reason, in section 6.
- **The Meal AI kit** gives calorie app structure only: one question per screen with Continue pinned, a mid screen wheel with a full width band, height and weight side by side, the plan reveal, weight update as one big value. Not its looks, rings, colours or emoji.
- **Apple's HIG (2025 to 2026)** sets behaviour: 44 pt targets, one or two prominent buttons told apart by style, pickers for ordered lists, the number pad matched to the content, sheets with a visible close, no glass in the content layer.
- **Ontrack's own:** the track bar, and colour used as a state. Ink is the thing to do next. Violet is Ontrack. Green means a target has been reached.

## 4. Colour

Two themes, same structure. Light is OneFin's light sheets, dark is its dark sections. Values are in `design/tokens.css`; `tests/unit/contrast.test.ts` checks the pairs.

| Role | Token | Use |
| --- | --- | --- |
| Page | `--canvas` | The background of every screen. Safari tints its toolbars from it |
| Cards and sheets | `--surface` | One level above the canvas |
| Controls | `--surface-2`, `--surface-3`, `--control-edge` | Neutral buttons, inputs, chips, the wheel band, pressed states. `--control-edge` is the 3 to 1 mark of a control known only by its shape: the switch's off track |
| Text | `--ink`, `--ink-2`, `--ink-3` | Primary, secondary, and a third step for the second fact on a line (U1b: 4.5 to 1 on the page and cards) |
| Edges | `--line`, `--line-strong` | Hairlines inside a card, the zone on a track |
| Action | `--action` with `--on-action`, pressed `--action-press` | The flat ink pill (white on dark): the primary button, the stepper's keys and the dock's plus. `--shadow-action` is its soft drop |
| Brand | `--accent` (fills), `--accent-ink` (words) and `--progress` (progress fills, lighter in dark to pass 3 to 1 on the empty track) with `--on-accent` | Violet icon tiles, links and highlighted words, progress (tracks, the onboarding bar, the trend line, the week bars), the one featured card on a screen, count badges (friend requests on the map button) and the avatar ring on map pins (S1b). Pressed `--accent-press` |
| Lavender | `--accent-soft` with `--on-accent-soft` | Icon tiles and the hero haze. A surface, never a state |
| Glass | `--glass-bg`, `--glass-edge`, `--shadow-glass`, `--glass-solid`; the dock's `--bar-bg`, `--bar-solid` | Section 6. Small chips over colour, the dock, sheet backdrops |
| Reached | `--success` | Fills a track that is inside its zone |
| Reached as text | `--success-ink` | "On track" words and the week strip's dot. Darker than OneFin's chip text, so it passes on the hero's lavender |
| Heads up | `--attention`, `--attention-soft` | Missing data, a cap or floor applied |
| Destructive | `--danger`, `--danger-soft` | Delete and errors only. Never for food or weight |

Rules:
1. **Ink means act, violet is the brand, green means reached.** At most one ink primary pill on a screen or sheet, plus the dock's plus. Violet only in the brand uses above, with at most one solid violet featured card on a screen. Green only for a reached target.
2. Selected chips, segments, choice cards and the week's day in view are ink, as OneFin's selected option is black. Switches are ink when on. Today, when another day is in view, keeps an ink ring.
3. Progress is violet until it reaches its zone, then green. Over the zone it returns to violet.
4. At most one gradient per screen, on its hero: the haze panel (Today, Your plan, Progress). A sheet's one featured card fills with `--grad-feature` (the owner, U1b: the Add sheet's Photo, the supplement setup's Scan the tub). Never on any other button, a row, a chip or text. The landing page has its own gradients (section 13). Scroll edge fades (section 6) are a bar's colour going clear, not a gradient.
5. Macros are not colour coded. They are told apart by label and position.
6. Green on a light surface is a fill, never small text: words use `--success-ink`.
7. **Contrast for controls (U1b, WCAG 1.4.11).** What identifies a control or shows its state has 3 to 1 against what is next to it, in both themes: a selected fill against the page, card or track; the switch's tracks and knob; the dock's selected tab on its pill; the stepper's keys. A labelled button is known by its label (4.5 to 1); its grey fill only groups it, but in dark the page, cards (their ring), grey fills and the dock's edge must still stand apart. `tests/unit/contrast.test.ts` checks every pair.

## 5. Type

Two faces, self hosted from their OFL packages and precached: Roboto Condensed 900 for display, Geist (variable, 400 to 600) for everything else. Thai text falls back to the system face.

| Style | Token | Face, size / line, tracking | Use |
| --- | --- | --- | --- |
| Hero | `--t-hero` | Geist 500, 56 / 56, -0.04em | The one number a screen is about, in its hero card, as OneFin's "$ 4,025.08" |
| Display | `--t-display` | Roboto Condensed 900, 48 / 43, -0.05em | Plan, portion and quick add figures |
| Title | `--t-title` | Roboto Condensed 900, 36 / 36, -0.05em, capitals | Screen titles, onboarding questions |
| Heading | `--t-heading` | Roboto Condensed 900, 24 / 24, -0.03em, capitals | Section and sheet titles, the hero's counterpart |
| Eyebrow | `--t-eyebrow` | Roboto Condensed 900, 14 / 14, capitals | Small labels over figures |
| Lead | `--t-lead` | Geist 400, 18 / 27, -0.01em | Onboarding captions, Your plan's sentence |
| Body | `--t-body` | Geist 400, 16 / 24, -0.02em; 600 for row titles | Default. Inputs are 16 or more |
| Callout | `--t-callout` | Geist 400 to 600, 14 / 21, -0.01em | Buttons below `lg`, secondary rows, chips |
| Caption | `--t-caption` | Geist 500, 12 / 18 | Captions under numbers, metadata, tab labels |

- Capitals come only from `text-transform` on Title, Heading and Eyebrow. Strings in `en.ts` stay in sentence case. The ONTRACK wordmark is a drawing (section 1), not text.
- Body sizes scale with the text size setting through `--fs`. Hero, Display, Title and Heading scale half as much (`--fs-display`).
- Every number that can change uses tabular figures. Numbers in rows, steppers and wheels are Geist (`num`); the Hero number and its counterpart are Geist 500 and 600, not black (the picks' big numbers); Display numbers are the condensed face, as OneFin's prices.
- Decimals read lighter: `Figure` sets the part after the point in `--ink-2` (the weight trend, the check-in rate), as OneFin's ".08". Not `--ink-3`, which fails on the haze.
- Nothing below 12 px. Inputs are never below 16 px.

## 6. Space, shape, depth

- **Grid.** 4 px. Page gutter 16 (`--gutter`). Inside cards and sheets 24 (`--inset`). Gap between cards 16. Gap between a label and its value 4. Row height at least 56.
- **Radii.** OneFin's large, concentric corners: 8 for checkboxes, 16 for inputs, thumbnails, chips, small buttons, icon buttons and the wheel band, 20 for the large button and the segmented track, 24 for choice cards, tiles, stat tiles, toasts and bars holding a button, 32 for cards, 40 for the top of sheets and corners nested in the hero card, 48 for the hero card. Full for tracks, the dock and its selected tab, the dock's plus, the avatar and pill chips.
- **Corners nest, padding grows with the radius (U1b, the owner's feedback 2, 5, 8).** A filled shape 8 or less inside another's corner, the same gap on both sides, takes the outer radius less the gap: the hero card's 48 with 8 inside gives 40 to the haze panel's top corners and to the stat tiles' outer bottom corners; corners that face a sibling keep the inner shape's own radius (24). A shape further in keeps its own radius. Text and controls sit at least half a corner's radius from both of its edges. The pairs:

| Radius | Padding at least | Used by |
| --- | --- | --- |
| 8 | 4 | checkboxes |
| 16 | 8 | inputs, small buttons, chips, thumbnails, icon buttons, the wheel band |
| 20 | 10 | the large button, the segmented track (its segments are 16, 4 inside) |
| 24 | 12 | choice cards, tiles, stat tiles (16 inside, 20 at a 40 corner), toasts and the landing bar (a button 8 inside at 16) |
| 32 | 16 | cards, 24 inside |
| 40 | 20 | sheets' tops (24 inside), the haze panel (24 inside), stat tiles' outer corners |
| 48 | the gap, 8 | the hero card, a shell that holds panels, not text; content set straight in it sits 24 from its edge |

  `tests/e2e/app.spec.ts` "corners nest" checks Today (the hero card, the dock) and Progress in both themes.
- **Scroll edges fade (U1b).** Content scrolling under the header or a sheet's header fades into the bar's colour over 16 px (`--fade-h`, the `fade-under` utility, shown once scrolled); above a pinned footer it fades the same way (`fade-over`). Never a hard edge or a hairline. The food map's panel fades with a mask.
- **The status bar continues the top of the screen (U1b).** `topColour()` sets `theme-color` and the root's background (Safari 26 samples it): the landing hero's sky (`--sky-top`) on the landing page, the canvas everywhere else, onboarding included.
- **Depth.** In light mode cards carry `--shadow-card`, OneFin's soft stats card shadow, and never a border with it. In dark mode cards have no shadow and a 1 px `--line` ring. Things that float (the dock, toasts, a dragged row) have `--shadow-float`. The ink pill and the dock's plus carry `--shadow-action`, a soft drop below them. No button has an inner light, a bevel, a rim, a gradient or a glow (`tests/e2e/app.spec.ts` sweeps every button for them).
- **Content cards stay solid,** white or the dark surface, so their numbers stay readable. Nothing that carries a number you need to read is glass.
- **Gradients.** At most one per screen, on its hero. `--grad-hero` is the aurora haze of OneFin's Premium and stats cards (lavender, blue, pink and cyan over white; violet, blue and magenta in dark), filling the hero's haze panel through the `haze` utility. The landing page's gradients are in section 13. No stop of the haze is stronger than lavender at 75 percent, so ink, `--ink-2` and `--success-ink` words pass on it. Nothing else has a gradient. Since L2 the haze and `--grad-feature` (light and dark) are photo gradients, made on photogradient.com (`scripts/gradients.sh` has each one's colours and settings), under one shared grain tile laid on with soft-light by the `haze`, `feature` and `grained` utilities; the CSS gradient stays beneath as the fallback, and `landing.spec.ts` measures the words on the images themselves.
- **Glass.** As OneFin's "Paid" pill and "Direct pay" chip: backdrop blur, a translucent fill, a 1 px translucent white edge and a soft drop (`glass`; `glass-bar` for the dock, with more fill since rows scroll under it). Without blur (`@supports not`) the solid `--glass-solid` or `--bar-solid` stands in. Allowed only on: small chips and pills over a coloured or gradient surface or a picture (the hero's day chip, the landing page's bar and tiles), sheet backdrops (the blurred scrim), and the dock. The header is opaque.
- **Width.** Content sits in a column of at most 480 px, centred on `--surround` on wider screens.
- **One card, one job.** Nest only as OneFin nests: the hero card is a white shell holding its haze panel and grey stat tiles, radii stepping down. Otherwise divide a card with a hairline.

### What D2 took from the owner's picks, and why

| Pattern (pick) | Where | Why it helps there |
| --- | --- | --- |
| Flat ink pill, white on dark (15 "Withdraw", 04, 13 "Contact us") | Every primary button, the dock's plus | The owner's call: no 3D effect on buttons, "use this clean one". Ink reads as the action on every surface, including the violet and haze ones, and leaves violet free to mean Ontrack |
| Grey pill (04 tags, 11) | Second actions (`neutral`) | Quiet next to the ink pill; one shape family, told apart by fill |
| Square icon buttons, ink, grey when disabled (11) | Stepper keys; close, back, more and again as rounded squares | A stepper at its bound now shows it by turning grey instead of fading. Rounded squares tie the icon buttons to the icon tiles |
| White card with a big number, grey stat tiles (15) | Today's hero, Your plan, Progress's weight card | The number is what the screen is about; the macros become three equal tiles that read as a set and stay level at large text |
| One gradient region in a white card (16 invoice header) | The hero's haze panel | One soft colour field marks the hero without tinting the numbers below it; the frame keeps it a card, not a banner |
| Aurora haze (03 Premium, 14 stats) | The haze itself | Softer than D1's flat lavender wash, with enough white that every word on it passes 4.5 to 1 |
| Frosted chip with a white edge (16 "Paid", 01) | The hero's Training day or Rest day chip | Glass shows only where something sits over colour or a picture, which is where it reads as glass |
| Violet as the brand (02, 06, 12, 13) | Feature tiles on the landing page, links (`plain`), the promise's key phrase, tracks and charts, the Add sheet's Photo card | Violet now says "this is Ontrack" and marks progress, so the ink action is never confused with it |
| One solid featured card (02 "Investing for beginners") | Photo on the Add sheet, Scan the tub in the supplement setup | The one way the screen suggests first, without a second button colour |
| White icon tiles with a lavender edge (05) | The Add sheet's other ways, Photograph the label | Lifts the method icons off the grey cards as shortcuts, with no glow inside a button |
| Regular weight big numbers, lighter decimals (14, 15) | The Hero number; `Figure` on weights and rates | Geist figures read faster than condensed black at a glance; the lighter decimals keep 72.4 from reading as 724 |
| Wordmark (owner's own, after 09) | The landing page | The name is spelled out there, so the frozen ONTRACK wordmark replaces the mark beside live text |

Not taken, on purpose: the ring progress (07), since the track is Ontrack's signature and reads in one glance; tilted stickers, floating tiles, testimonial colours and dark gradient footers (08 to 10, 12), which belong to the landing page (L1); grain on glass (14), which costs legibility on a phone.

## 7. Components

Start from the components in `src/lib/components/` and their gallery at `/gallery`.

| Component | Specification |
| --- | --- |
| Button | One height system. `lg` 56 for the screen's or sheet's main action, pinned at the bottom; `md` 48 for second actions in content; `sm` 36 on screen and 44 to tap, for inline actions in rows and cards. Variants: `primary`, OneFin's flat "Withdraw" pill: `--action` fill (ink, white on dark), `--on-action` label, `--shadow-action`, radius 20 at `lg` and 16 below, one per screen; `neutral`, the grey `--surface-2` pill for second actions; `plain`, a violet text link in `--accent-ink`; `danger`, flat with a `--danger` label. Pressed: the fill steps (`--action-press`, `--surface-3`) and the face scales to 0.97 in 120 ms. Disabled: the primary turns grey (`--surface-3`, `--ink-2` label, no drop); the others fade to 40 percent. No gradient, bevel or glow. Labels are verbs in Geist 600 |
| Icon button | A 44 rounded square (radius 16). Action keys (the stepper's minus and plus) are ink with an `--on-action` glyph and turn `--surface-2` with an `--ink-3` glyph when disabled. Close, back, more and again are quiet: a glyph on nothing (or `--surface-2` for again), `--surface-2` when pressed. The camera's light is a solid dark square, since glass over a live picture would change with the theme. The avatar stays a circle |
| Card | `--surface`, radius 32, padding 24, `--shadow-card` in light, a ring of white at 10 percent in dark. The hero card (`hero`) is a white shell at radius 48 with 8 inside, holding the screen's haze panel (`haze`, top corners 40, 24 inside; bottom corners 24 when tiles follow) and, below it, grey stat tiles; text sits 32 from the card's edge in the panel and 24 below it |
| Stat tile | Inside the hero card: `--surface-2`, radius 24 with its outer bottom corners 40 (U1b), 16 inside and 20 at the bottom. Your plan's wide protein tile is 24 above and 40 below, 24 inside, its figure in Display as a plan figure (section 5). A Caption label, a value in Body 600 tabular with its unit in Caption, and a 6 high track at the bottom so a row of tiles stays level. Today's macros, Your plan's protein |
| Glass chip | A pill on the haze or a picture: the `glass` utility, Caption 600 in ink, 2 by 10 inside. The hero's day kind |
| Featured card | At most one per screen (`data-featured`): a `--grad-feature` card at radius 24 (violet lit blue and plum, the same in both themes, the owner's U1b request) with an `--on-accent` label and a translucent white icon tile. The Add sheet's Photo, the supplement setup's Scan the tub. Pressed: darkens a step and 0.97 |
| Row | A 48 px tile or thumbnail at radius 16, title in Body 600, one line of caption, trailing number in Body 600 tabular with its unit in Caption (calories always say kcal). At least 64 high in lists. Divided by hairlines inset to the text |
| Facts | Two or more facts on one line ("12:30 \| Database", "60 min \| 240 kcal", "712 kcal \| 37 g protein"): a 1 px `--line-strong` divider one line high with 8 either side, never a comma or a middle dot; the facts after the first one step lighter (`--ink-3` in a caption, `--ink-2` after ink). Screen readers hear a comma. `Facts.svelte`. A list of like things (muscles) keeps commas |
| Icon tile | 48 square (40 in choice cards and ways) at radius 16, in three tones as in OneFin's pricing: lavender (`tile`: `--accent-soft` with an ink glyph, lavender in dark) for rows and choices; violet (`bg-accent` with an `--on-accent` glyph) for feature icons, as on the landing page; white with a 1 px lavender edge and a violet glyph for shortcuts on grey, as the Add sheet's ways. Flat: no inner glow |
| Chip | 44 high, radius 16, Callout 600, `--surface-2`. Selected: ink fill with canvas text |
| Segmented control | A radius 20 track on `--surface-2` with 4 px padding, segments 44 high at radius 16; the selected segment is ink with canvas text (U1b: a white segment was under 3 to 1 on its track). At most four options |
| Switch | 50 by 30, ink when on, `--control-edge` when off; the knob is `--surface`, 3 to 1 on either track |
| Track | The signature. A full radius bar, 14 high in the hero and 6 elsewhere, on `--track-bg`. The scale runs from 0 to 110 percent of the target. The on track zone is a slightly darker segment from its lower bound to the end. Fill is `--progress` violet, and turns `--success` inside the zone. Width animates over 420 ms |
| Hero number | Hero style (Geist 500), a caption beneath ("of 2,460 kcal") and the counterpart on the right in Geist 600 at Heading size ("620 to go", or "On track" in `--success-ink`). Digits tween when the value changes |
| Wheel | For bounded values: birth year, height, weight, goal weight, body fat. Five rows of `--wheel-row` (44 at default text), the selected row on a full width `--surface-2` band at radius 16; wheels set side by side (height and weight) share one band. Rows in Geist 600 at Heading size, tabular; the selected row ink, the rest `--ink-3`, the edges faded with a mask. The unit sits once, beside the band, in `--ink-2`. Native scroll snap does the momentum. A decimal value has a whole and a tenths column. Tapping the selected row, or Enter, swaps in a 16 px or larger text field for typing. Each column is a slider for assistive tech |
| Wheel sheet | A sheet with the title, a hint caption, the wheel, an optional plain Clear, and the pinned primary Save. Weigh in, goal weight and body fat use it |
| Stepper | Minus and plus as 44 ink rounded squares (grey when at a bound) around a number in Geist 600 at Heading size, which can be typed. Holding repeats. For small counts near a start: days, minutes, sets, reps, grams |
| Number field | Exact, wide range values (Quick add): a native field with the number pad (`inputmode`), not `type="number"` |
| Input | 56 high, radius 16, `--surface-2`, label in Caption above. Focus draws a 2 px ink ring |
| Sheet | vaul Drawer. Top radius 40, grabber 36 by 5, title in Heading beside a 44 close button (a quiet rounded square), a back chevron on the left when the sheet has a step. The backdrop is the blurred `--scrim`. Content fades out under the header and above the footer (section 6); the main action is pinned to the bottom above the safe area. Opens to content height, at most 92 percent of the visible height |
| Dock | A floating glass pill (`glass-bar`, a white edge, `--shadow-float`) with three tabs and, to its right, the 64 ink plus circle (white on dark) with `--shadow-action`, both 64 high, 12 above the safe area. The selected tab sits on a 48 high `--surface-2` pill 8 inside the dock, its icon and label in `--accent-ink` (U1b, the owner); others in `--ink-2` |
| Header | 56 high, opaque canvas (no glass), the title in Title on the left, sync mark and avatar on the right. Content scrolling under it fades into the canvas (section 6) |
| Week strip | Seven equal cells 64 high: weekday letter in Caption, the date in Body 600 tabular, a 5 px dot in `--success-ink` when that day was on track (`--success` on the ink pill). The day in view is an ink pill at radius 24; today, when another day is in view, keeps a 2 px ink ring |
| Toast | Top centre inside the column, 16 from the edges, `--toast-bg` in both themes, radius 24 (Undo nests 8 inside at 16), one line, optional Undo. One at a time |
| Source label | Caption text: Database, Estimate, Yours (the user's remembered numbers, N1) or Quick add. Estimate carries a small outlined circle before it. No colour |
| Sync mark | An 8 px dot beside the avatar: hidden when idle, `--ink-3` pulsing when syncing, hollow when offline, `--attention` when it needs attention. Tapping it explains the state |
| Empty state | A line of body text saying what will appear here and one button to make it appear. No illustrations |
| Skeleton | Blocks in `--surface-2` at the final layout's sizes, with a slow opacity pulse |

## 8. Banned

These are what make an app look machine made. None of them ship.

1. Neon outlines, glows behind text, mesh backgrounds, and any gradient section 6 does not name. A gradient, bevel, inner light, rim or glow on any button.
2. Emoji or sparkle icons standing in for icons. Any "AI" badge or sparkle next to the photo feature.
3. A dashboard of small stat cards with icons in tinted circles.
4. Rings and doughnuts for calories or macros. Rainbow macro colours.
5. Borders on cards, or a border and a shadow together (a glass chip's white edge is its glass, not a border). Shadows only as `--shadow-card`, `--shadow-float`, `--shadow-action` and `--shadow-glass`.
6. One radius used everywhere. Cards inside cards, other than the hero's haze panel and stat tiles. Glass on a content card.
7. Centred body text, centred forms, marketing copy inside the app.
8. Wide letter spacing. Capitals typed into the words. Mixed title case and sentence case.
9. A serif or editorial look, cream backgrounds, drop caps.
10. Stock illustrations, mascots, confetti, streak flames, achievement badges, and OneFin's own artwork, photos, people or logo.
11. Red or green used to judge food or weight.
12. Em dashes, en dashes, middle dots, exclamation marks, and the words unlock, supercharge, journey, crush, smart.
13. A spinner as the only loading state. A modal dialog where a sheet or inline message would do.
14. A calculator keypad. Bounded values use a wheel, free amounts the native number pad or a stepper.

## 9. Rubric

The `design-critic` subagent checks screenshots against these, side by side with the owner's picks it is given (15, the "Withdraw" card, and 16, the invoice card, at least). Each is pass or fail.

1. Tokens only: every colour, radius and type size on screen exists in `design/tokens.css`.
2. Colour roles: at most one ink primary pill on a screen or sheet, plus the dock's plus. Violet only in section 4's brand uses, with at most one solid violet featured card. Any green is a reached target.
3. One focus: the screen has one clearly largest element, and it is the thing the screen is about.
4. Type scale: every text matches a style in section 5. Display styles are condensed capitals; numbers are tabular.
5. Alignment: content aligns to the 16 px gutter outside cards and the 24 px inset inside them. Numbers in a list align on the right edge.
6. Spacing: gaps come from the 4 px grid, and equal things have equal gaps.
7. Depth: cards are solid and carry only `--shadow-card` (light) or a hairline ring (dark); only the dock, toasts and dragged rows float. No button has a gradient, bevel or glow: the ink pill's only depth is `--shadow-action`, and tappable cards (choices) keep a card's `--shadow-card`, without which they vanish on the canvas. At most one gradient on the screen, on its hero, plus a sheet's one featured card; glass only where section 6 allows it.
8. Nothing from the banned list.
9. Copy: sentence case in the words, no banned punctuation or words, numbers formatted with grouping and units.
10. Touch: every control is at least 44 px and has a visible pressed state in the interaction screenshots. One button height per role (56, 48, 36 in 44).
11. Both themes: the dark and light screenshots have the same structure, and no text falls below its contrast bar.
12. Fit: no clipping or overflow on the SE in Safari (375 by 548) or at the largest text size. The main action is reachable without scrolling on a sheet.
13. States: empty, loading and error states exist for the screen and follow sections 7 and 2.
14. The spec: the screen contains what its section of `docs/SCREENS.md` lists, in that order.
15. Identity: placed beside the owner's picks, the screen reads as the same family: condensed capitals for titles, the flat ink pill, solid white cards with big nested radii, grey stat tiles, the haze on the hero only, small glass chips, violet as the brand.
16. Corners nest (U1b): a filled shape 8 or less inside another's corner has the outer radius less the gap, and no text or control sits closer to a corner than half its radius. Look at the hero card's haze and stat tiles, Your plan's protein tile, list cards, sheets, toasts and bars holding a button.
17. Controls stand apart (U1b): in both themes, every selected state (chip, segment, choice, the week's day in view, the dock's tab) and every control known by its shape (switch, field focus) is plainly visible against what is next to it; in dark, the page, cards, grey buttons such as "Back to today", stat tiles and the dock's edge are told apart at a glance.
18. Dock (U1b): the selected tab sits on a grey pill with its icon and label violet; the others are grey.
19. Scroll edges (U1b): content under the header, a sheet's header or above a pinned footer fades into the bar's colour; no hard edge or hairline where it meets the bar.
20. Facts (U1b): two facts on one line are set apart by the thin divider, never a comma, full stop or middle dot, and the second is one step lighter.
21. Status bar (U1b): the area above the content continues the colour at the top of the screen (the sky on the landing page, the canvas elsewhere), with no band of another colour.

## 10. Motion and feedback

Fixed values from MOTION.md, as tokens in `design/tokens.css` (U1c). JavaScript reads the same tokens through `dur()` and `ms()` in `src/lib/haptics.ts`, so there is no second set of numbers. Motion explains a change: where something came from, where it went, that a number moved, that a wait is working. It is never decoration, and it never holds the next tap.

| Token | Value | Used for |
| --- | --- | --- |
| `--d-press` | 120 ms | a press: scale 0.97 and a fill step |
| `--d-fade` | 150 ms | a cross fade (a day's cards, a step's words); the one motion reduced motion may keep |
| `--d-settle` | 240 ms, `--ease-out` | a dragged row or page settling when the finger lifts; a tab, a Settings page or an onboarding step sliding in |
| `--d-leave` | 280 ms, `--ease-out` | a row or card leaving: things go faster than they come |
| `--d-count` | 400 ms, `--ease-out` | a number counting to its value (`Count.svelte`) |
| `--d-ui` | 420 ms, `--spring-default` | state changes: chips, segments, switches, the dock's and the week's sliding pills |
| `--d-move` | 420 ms, `--ease-out` | tracks filling, a row or card arriving, bars growing |
| `--d-pop` | 520 ms, `--spring-pop` | a check popping in: a target reached, a session done, Building's mark |
| `--d-appear` | 600 ms, `--spring-appear` | first paint and arrival: Today's cards, a check-in step, a chart's line |
| `--d-beat` | 450 ms | one step of a made-up wait (Building your plan) |
| `--d-step`, `--d-sweep` | 1.6 s, 1.8 s | a real wait: the words under a photo being read, the sweep across it |

Rules:

1. **Every tap answers within 100 ms.** Buttons, icon buttons, tiles and cards scale to 0.97 with a fill step (the ink pill to `--action-press`); rows take the grey fill. A light haptic on select (chips, segments, choices, switches), on every log (a meal, a supplement, a weigh-in, a session done, a check-in decided), on every delete, and on reaching a target. None on navigation, none on wheels, none on a day picked in the strip.
2. **One selection, one moving mark.** The dock's grey pill and the week's ink pill slide to what was picked (`--d-ui`, `--spring-default`) rather than one switching off and another on.
3. **Numbers move; lists move.** A number counts from where it stood (`Count.svelte`): Today's total and macros when a meal is logged, edited or removed, or another day is picked; Progress's figures from nothing on arrival (the weight from where the chart starts, so the change itself moves); the check-in's new target from today's. Tracks fill to their value. A new row grows in (`collapse`, `--d-move`), a removed one collapses (`--d-leave`), carrying the flex gap so nothing jumps. A day picked in the strip swaps its cards in one fade: rows never collapse for a change of day.
4. **Swipe to delete is iOS Mail's.** The row follows the finger over a red action that fills exactly the space it leaves, full height, under the card's clip and into its padding, so no white edge shows. Let go past half the button and it stays open on Delete (88 wide); past half the row the label jumps to the row's edge, and letting go deletes with a haptic: the row slides out (`--d-settle`), then collapses, and Undo stays 5 s. A tap on an open row closes it; one row is open at a time.
5. **A wait shows its work.** A photo being read sits under a flat lavender band with a bright edge sweeping down and back (no gradient, section 8), with its steps in words beneath, one every `--d-step`; the last holds until the answer. Skeletons at the final layout's size, never a spinner alone, never a blank sheet.
6. **Satisfaction, never guilt.** A target reached turns its track green, swells it once with a green ring going out (`reach`), pops a check beside its words (the hero's "On track", the protein tile) and plays one haptic. A session marked done pops its check. Only a change made while looking: a day picked in the strip shows its checks without the pop and plays no haptic. No confetti, no streaks.
7. **Arrivals are first paints only.** Today's cards fade up 8 px with a 40 ms stagger on the first paint of a session (`appear`); Progress's bars grow and its line draws once on arrival. Coming back to a tab does not replay them.
8. **Reduced motion: nothing moves, nothing loops.** Every transition and animation collapses to an instant change (the global rule in `app.css`, and `dur()` returns 0 for Svelte's transitions and counts). Anything that loops is not drawn at all (the sweep, the skeleton and sync pulses), since a looping animation at 0 s would still be running. A wait still changes its words. `tests/e2e/motion.spec.ts` proves both: each animation reaches its end, and with reduced motion none is left running.
9. Sheets use the vaul spring. Swiping between tabs follows the finger.

## 11. Icons and imagery

- Lucide icons at 24 px, stroke 2, in `currentColor`. Tab icons: a track for Today, a barbell for Train, a rising line for Progress.
- Icon tiles come in three tones, lavender, violet and white (section 7), OneFin's tile treatment in Ontrack's colours.
- Imagery is the user's own meal photos, the haze, the landing page's real screens of the app and its gradients, and decoration drawn in CSS or SVG in OneFin's manner (glass tiles, tilted chips). No stock art and none of OneFin's 3D renders, mockups, photos or screen images.
- A meal without a photo gets a neutral tile with an icon for how it was logged.

## 12. Accessibility

- Text contrast 4.5 to 1 or better against its background, 3 to 1 for large text. Since U1b `--ink-3` passes 4.5 to 1 on the page and cards, for the second fact on a line. What identifies a control or shows its state has 3 to 1 against its neighbours (section 4 rule 7). `tests/unit/contrast.test.ts` checks the token pairs in both themes.
- The green fill of a reached track is about 1.8 to 1 on white. It is never the only signal: the value is always also text, and "On track" is also a word and a dot.
- Every control has an accessible name. Sheets trap focus and restore it. The track exposes its value as text. Wheel columns are sliders with a value text ("168 cm") and arrow, page and home or end keys.
- Pinch zoom stays enabled. Text size follows the device by default.

## 13. Landing page (L1)

The landing page is the one marketing screen: a visitor reads it top to bottom, once, before deciding to start. It takes the landing-only patterns the owner picked from OneFin and D2 left out on purpose (section 6), and it is the only place they appear. Its job is one tap on "Build your plan", so every pattern either says what Ontrack does or moves the eye toward that action. Spec in `docs/SCREENS.md` section 3, code in `src/flows/landing/`.

| Pattern (pick) | Where | Why it helps there |
| --- | --- | --- |
| Tilted sticker eyebrows, "01 BENEFITS" (01, 05, 12) | Over each section headline: 01 Logging, 02 Training, 03 Check-in, 04 Friends, 05 Sources | Numbered chapters tell a scanning visitor how far they are and what the next block is about |
| Huge condensed capitals ending in a full stop (01, 05, 10, 12) | The hero (Poster) and every section (Section) | A statement, not a slogan: one claim per block, readable at a glance on a phone |
| Inline word pills in big body text (08) | The statement under the hero | The three things Ontrack does are the pills, so a skimmer reads them first; the last one is ink |
| Floating tilted icon tiles (08) | Around the statement | The four ways in (photo, barcode, training, weigh-in) as violet tiles, moving a little with the scroll |
| Dark sections with a violet glow (06, 09, 12) | 02 Training, and the run from 05 Sources to the footer | Changes the pace of a long page and marks the two blocks about the method |
| Flat lavender panels (`--lavender`, the same in both themes) inside dark cards, number badges (06) | 02 Training | The screen is the content; the panel frames it the way OneFin frames its feature art |
| Flat lavender field with rings and tilted white cards, the 1-2-3 stepper (07) | 03 Check-in | The check-in is a sequence; the stepper says so, the cards repeat its own words |
| Colour-washed cards (10) | 05 Sources | Where OneFin puts testimonials, Ontrack puts its sources: honest proof in the same look, read from `constants.ts` so it cannot drift |
| Violet icon tiles beside short points (05) | 04 Friends | The food map raises who sees it and where; three points answer that beside the real map |
| The nested-panel footer with a giant wordmark (09; L3, glass-01) | The footer | Ends the page on the name. L3: in two states. The page ends on a teaser, the wordmark's top with the glow rising from below and the back to top tile cut by the screen's edge; a pull past the end opens the full footer: one glass panel over the wordmark's lower third holding violet panels (Start, Learn, Good to know, Contact and legal) and a lavender bottom bar with the year and version. It closes once it has left the screen |
| OneFin's sky and glass bar, tilted glass chips flying in (hero, nav, 15; glass-03) | The hero and the fixed bar | The first screen reads as OneFin at once; the glass bar sits over colour, where glass belongs. The chips are white Liquid Glass with night words in both themes, since they sit on the phone's light screen |
| Phones with real screens (05, 12) | Every feature | Proof by showing: each is a screenshot of the app at the current look, never a mock-up. L2: an iPhone 16 drawn in CSS from its published sizes (393 by 852, a 54 point status bar, the island 126 by 37, 55 point screen corners), with the status bar at 9:41 and the Dynamic Island above the screen, so the app never touches the top; no shadow. A scale drawing: its sizes are shares of its own width (`cqw`), not tokens. The meal in every phone is the owner's pad kra pao with fried eggs (`tests/fixtures/krapao.jpg`) |

Rules that bend here, and only here:
- **Gradients (L2: photo gradients with grain).** Every gradient is an image made on photogradient.com from the brand's colours (`design/gradients/`, `scripts/gradients.sh`), the shared grain over it with soft-light, its CSS gradient beneath as the fallback: `--grad-sky` (the hero, light and dark), `--glow` (the dark sections), `--grad-lavender` (the check-in's field), the four `--wash-*` (the source cards), and `feature` on the one featured card and the closing call's panel. Still never on a button, a row, a chip or text. The words on each image are measured in `landing.spec.ts`.
- **The glow (L2, the owner's footer-glow-bug).** Brightest at its middle and faded to nothing at every edge (the `glow` utility's mask), so neither colour nor grain starts at a line. In the footer (L3) its middle sits on the wordmark's foot (`landing.spec.ts` checks it): below the end of the page while the footer is closed, rising from there, and behind the opened panel. In 02 Training it rises from the section's foot.
- **Liquid Glass (L2, iOS 26's "regular" material).** Blur and saturate what is behind, tint it, and catch the light with a rim, bright top left and faint bottom right: `liquid` (follows the theme), `liquid-bar` (the bar and the floating action's tray, with the dock's fill, since content scrolls under them), `liquid-white` (night words in both themes: the hero's chips and the check-in's cards) and `liquid-violet` (white words: the footer's panels). On the bar, the hero's chips, the check-in's cards, the source cards' icon chips, the closing call's mark tile and the footer's shell and panels; the cards that carry a screen or a number stay solid (Logging, Training, Friends' tiles, the washes), as glass-01 to 05 mix the two. Never on a button: the rim is an inner light, so the back to top tile keeps `glass`. Every tap on the page has a pressed state: a fill step, and 0.97 when motion is welcome (`.tap`). L3, glass that bends: the body blurs 24 px (`--liquid-blur`), and what is behind warps at the rim. Where the browser draws SVG filters inside `backdrop-filter` (Chromium, detected in `glass.ts`), each glass gets a filter that blurs the body and magnifies a 16 px rim toward its edge. Elsewhere (Safari), a glass over a gradient image holds a `lens` span: that image again, aligned, scaled 1.12 about the glass's middle and lightly blurred, in a soft 14 px band at the rim, with the rim light drawn over it. Only where the image is all that is behind (not over a phone, not on the bar). Without blur each has a solid fill.
- **Centred text.** Headlines, leads and the statement are centred on a phone, as OneFin's are; the hero is left aligned on a wide screen.
- **More than one primary.** "Build your plan" appears in the hero, floating, in the closing call and in the footer, but never two pills on screen at once: the floating one shows only between the hero's and the closing call's. Ink on light, white on dark and on violet. L3, the owner's one exception: the bar's Sign in is the ink pill too (`sm`), so it shares the screen with Build your plan.
- **Two violet cards.** Snap the plate and the closing call's panel are never on screen together.
- **Dark sections in the light theme.** A section marked `data-theme="dark"` takes the dark tokens (`design/tokens.css` applies the dark block to any element so marked). Use `overflow-clip`, never `overflow-hidden`, on a section that holds scroll-driven motion: a scroll container captures `view()` timelines. `--night`, `--on-night` and `--lavender` stay the same in both themes: the phone's bezel, the words on the washes and the chips, and the lavender panels.
- **Width.** The page is full width, with content up to 1200; it is not the app's 480 column.

What still holds: tokens only, the type scale (Poster, Section and Statement are the landing's three sizes, and `text-pill` the statement's pills), ink means act and violet is the brand, green only in the "On track" chip that shows the app's reached state, 44 px targets, 4.5 to 1 for words (the sky and the washes are in `contrast.test.ts`), no emoji, the catalog rules for words, and no OneFin artwork: the phones, rings, chips and tiles are CSS and SVG.

Motion, from MOTION.md, all inside `prefers-reduced-motion: no-preference` (with reduce, everything is at rest at once and nothing animates; an end to end test checks it):

| Id | What | How |
| --- | --- | --- |
| M1 | The bar drops in | CSS on load, 1 s, `--ease-framer`, delay 0.2 |
| M2 | The promise blurs up word by word | CSS on load, 0.8 s, 0.1 s apart |
| M3 | Build your plan pops in | `--spring-pop`, delay 0.6 |
| M4, M5 | Today rises; its chips fly in from tilted offsets | `--spring-fly`, 2.35 s |
| M9 | Section headlines blur in word by word | In view (IntersectionObserver), once |
| M10 | Logging cards scale in from 0.5 | In view, `--spring-appear`, siblings 0.1 s apart, once |
| M3 spring | Stickers pop in | In view, `--spring-pop`, once |
| M12 | The footer opens: the teaser follows a pull at a third and its glow strengthens; past 120 px the panel rises 64 as the page scrolls to it, or the teaser springs back | Wheel, touch and keys past the end, `--spring-reveal` and `--spring-default`; with reduced motion any pull opens it at once |
| M15 | The hero chips and the statement's tiles drift with the scroll | `animation-timeline: view()` |
| M16 | The statement fills in word by word | A named view timeline on the statement |
| M17 | Dark cards and source cards settle from a tilt | `view()`, entry to cover 35 percent |
| M18 | "Plan. Log. Adjust." slides in from the left | `view()`, entry to cover 45 percent |
| Pick 08 | The violet tiles float a few pixels | CSS, 5 s, alternate |

Scroll-scrubbed motion runs where `animation-timeline` exists (Safari 26, Chrome); elsewhere those parts stay at rest. The phones' screens are regenerated with `LANDING_SHOTS=1 pnpm exec playwright test --project=shots` whenever the app's look changes; update `t.landing.alt` when their numbers do.
