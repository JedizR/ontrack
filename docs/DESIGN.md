# Ontrack: brand and design

`design/tokens.css` holds the values. This file explains the intent, so that new screens come out right without being specified one by one. The look is the identity of OneFin, the Framer template "OneFin - Finance SaaS" that the owner chose (https://creative-hands-463340.framer.app/). The primary source is the owner's sixteen picks in `/Users/admin/destination/ontrack-design/onefin/owner-picks/`, read one by one in `OWNER-PICKS.md` there. The wider extraction (`onefin/IDENTITY.md`, `onefin/site/SITE-EXTRACT.md`, `onefin/site/motion/MOTION.md`) is background; where it disagrees, the picks win. Ontrack keeps its own name, mark and app icon. No OneFin logo, wordmark, photo, person or template artwork (3D renders, phone mockups, app screen images, videos) ships in Ontrack; decoration is CSS or SVG.

The app comes in two styles, Tray (the default) and Bento (flat). Section 6 says once what differs; the other sections say only where a style changes them.

## 1. Brand

- **Name.** Ontrack. One word, capital O only, in every sentence. Never OnTrack or On Track. The wordmark's capitals are a drawing, not a spelling.
- **Idea.** A track is a path with a pace. Ontrack shows where you are on yours and whether you are keeping it. The brand is the track itself: a rounded loop with one bright marker on it.
- **Promise.** Eat for the body you are training for.
- **Personality.** A calm coach who is good with numbers. Precise, warm, brief. Not a cheerleader and not a nag.
- **Mark.** `design/brand/mark.svg`: a stadium shaped track with a marker sitting on its top edge. One colour, inherits `currentColor`.
- **App icon.** `design/brand/app-icon.svg`: the mark in white on a violet tile (`--accent`). The tile is the logo wherever the logo sits on a coloured or photographic background, because it brings its own contrast.
- **Wordmark.** `design/brand/wordmark.svg`: ONTRACK in Roboto Condensed Black capitals with the mark as its O, filled outlines in `currentColor`, frozen with the mark and icon (`design/brand/ICON.md`, `tests/unit/invariants.test.ts`). `Wordmark.svelte` draws the file itself. Use it only where the name is spelled out: the landing page's bar and footer.
- **In the product,** the track shape returns as the progress bar and as the Today tab's icon. That echo is the branding. The wordmark appears only on the landing page.

## 2. Voice

Plain words, short sentences, numbers first. Sentence case everywhere in the words; the display styles set capitals with CSS only. No exclamation marks, no em or en dashes, no middle dot separators, no emoji (`tests/unit/invariants.test.ts` checks the catalog `src/lib/i18n/en.ts`). Ranges use "to". A missing value reads "None yet", never a dash. Food is never good, bad, clean or a cheat.

| Instead of | Write |
| --- | --- |
| A cheer: "Great job, you crushed your goal" | On track today |
| You exceeded your calorie limit | 240 over today's target |
| A cute apology: "Oops, something went wrong" | Could not analyse the photo. Try again or add it by hand |
| Unlock your potential with AI insights | Your target, corrected from your own results |
| 1,840 / 2,460 kcal | 1,840 of 2,460 kcal |
| Three labels joined by dots | Three labelled values, separated by space or a hairline (`Facts`) |
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
10. **Neutral about food and bodies.** No good, bad, clean, cheat, burn off, guilt or celebration; no "Congratulations", no exclamation marks, no emoji. No streaks, no rankings, no false urgency, no confirmshaming.

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

- **OneFin, through the owner's picks,** sets the look: colour, type, components, effects and motion. Flat ink pill actions (the "Withdraw" button), violet as the brand rather than the button, a bold condensed display face in capitals over a quiet geometric sans, big numbers in regular weight with lighter decimals, solid cards with big nested radii, one soft haze per screen, glass only where section 6 allows, springy motion. Its light sheets and its dark sections are Ontrack's two themes. Each pattern is adopted for a reason, in the table at the end of section 6.
- **The Meal AI kit** gives calorie app structure only: one question per screen with Continue pinned, a mid screen wheel with a full width band, height and weight side by side, the plan reveal, weight update as one big value. Not its looks, rings, colours or emoji.
- **Apple's HIG (2025 to 2026)** sets behaviour: 44 pt targets, one or two prominent buttons, pickers for ordered lists, the number pad matched to the content, sheets with a visible close, no glass in the content layer.
- **The owner's iPhone passes** set the feel: compact one screen pages, camera first, no auto-advance, the two styles.
- **Ontrack's own:** the track bar, and colour used as a state. Ink is the thing to do next. Violet is Ontrack. Green means a target has been reached.

## 4. Colour

Two themes, same structure. Light is OneFin's light sheets, dark is its dark sections. Values are in `design/tokens.css`; `tests/unit/contrast.test.ts` checks the pairs.

| Role | Token | Use |
| --- | --- | --- |
| Page | `--canvas` | The background of every screen. Safari tints its toolbars from it. Light: `#f5f5f5` in Tray (the tray under white cards), white in Bento. Dark: the same in both |
| Cards and sheets | `--surface` | One level above the canvas. In Bento also the white that a grey box's contents turn |
| Controls and boxes | `--surface-2`, `--surface-3`, `--control-edge` | Neutral buttons, inputs, chips, the wheel band, pressed states, the small boxes inside a card (and in Bento the cards themselves). `--control-edge` is the 3 to 1 mark of a control known only by its shape: the switch's off track |
| Text | `--ink`, `--ink-2`, `--ink-3` | Primary, secondary, and a third step for the second fact on a line (4.5 to 1 on the page and cards) |
| Edges | `--line`, `--line-strong` | Hairlines inside a card, the zone on a track, the facts divider |
| Action | `--action` with `--on-action`, pressed `--action-press` | The flat ink pill (white on dark): the primary button, the stepper's keys, the dock's plus and, in Bento, the dock's selected tab. `--shadow-action` is its soft drop |
| Brand | `--accent` (fills), `--accent-ink` (words) and `--progress` (progress fills, lighter in dark to pass 3 to 1 on the empty track) with `--on-accent` | Violet icon tiles, links and highlighted words, progress (tracks, the onboarding bar, the trend line, the week bars), count badges (friend requests on the map button), the dock's dot and its selected tab in Tray, and the avatar ring on map pins. Pressed `--accent-press` |
| Lavender | `--accent-soft` with `--on-accent-soft` | Icon tiles. A surface, never a state |
| Palette | `--sand` `#eddecc`, `--steel` `#6c9bbb`, `--snow` `#ffffff`, `--coral` `#f89183`, `--clay` `#e46d58`, `--peach` `#f9bba1`, `--mist` `#a7bedb`, `--heather` `#a69eb4`; the same in both themes | The owner's wider palette (P1), for the photo gradients first, then decoration, illustration and highlights (rule 8) |
| Glass | `--liquid-fill`, `--liquid-blur`, `--liquid-clear`, `--liquid-rim`, `--liquid-light`, `--shadow-liquid`, `--liquid-solid`, `--blur-scrim` | Section 6. Tray only in the app |
| Reached | `--success` | Fills a track that is inside its zone, a done session's check |
| Reached as text | `--success-ink` | "On track" words and the week strip's dot. Darker, so it passes on the hero's lavender |
| Heads up | `--attention`, `--attention-soft` | Missing data, a cap or floor applied |
| Destructive | `--danger`, `--danger-soft` | Delete and errors only. Never for food or weight |

Rules:
1. **Ink means act, violet is the brand, green means reached.** At most one ink primary pill on a screen or sheet, plus the dock's plus. The one exception is Today's session and weigh-in boxes, each with its own small Done or Add (the owner, R3). Violet only in the brand uses above. Green only for a reached target.
2. Selected chips, segments, choice cards and the week's day in view are ink, as OneFin's selected option is black. Switches are ink when on. Today, when another day is in view, keeps an ink ring.
3. Progress is violet until it reaches its zone, then green. Over the zone it returns to violet.
4. **Gradients: at most one per screen, on its hero** (section 6 lists them). Exceptions: Progress's two hero boxes (the owner, R3), and Today's protein gap card, the featured card, which can sit under the haze. A sheet's gradient (the Add composer, the check-in's key numbers) is its own. Settings never has one. A gradient is never on a button, a row, a chip or text.
5. Macros are not colour coded. They are told apart by label and position.
6. Green on a light surface is a fill, never small text: words use `--success-ink`.
7. **Contrast for controls (WCAG 1.4.11).** What identifies a control or shows its state has 3 to 1 against what is next to it, in both themes: a selected fill against the page, card or track; the switch's tracks and knob; the dock's selected tab on its pill; the stepper's keys. A labelled button is known by its label (4.5 to 1); its grey fill only groups it, but in dark the page, cards (their ring), grey fills and the dock's edge must still stand apart. `tests/unit/contrast.test.ts` checks every pair.
8. **The palette (P1, the owner's round 3).** The brand stays violet `#381ac9` and lavender `#bebeff`; the eight palette colours widen what the brand can look like without changing what anything means. Each may be used for:
   - **The photo gradients**, which are made from it (section 6). They are light and calm in both themes (the owner: never dark colours), so the words on them are ink or night, never white.
   - **Decoration and illustration**: a fill that only sets a mood, a drawing, a sticker, a chapter's colour on the landing page.
   - **A highlight** that is not a state: a word or a number set off in a picture, never a selected, reached or error state.

   Never: an action (ink is), the brand's marks (violet is), a reached target (green is), a state, a control's fill, or body text in a palette colour. Words on a palette colour are night (4.5 to 1 on every one, `contrast.test.ts`). Pink (`#f7b3c9`, and a deeper `#f4a3bc`) belongs to the gradients only; it is not a token.

## 5. Type

Two faces, self hosted from their OFL packages and precached: Roboto Condensed 900 for display, Geist (variable, 400 to 600) for everything else. Thai text falls back to the system face.

| Style | Token | Face, size / line, tracking | Use |
| --- | --- | --- | --- |
| Hero | `--t-hero` | Geist 500, 56 / 56, -0.04em | The one number a screen is about, in its hero card, as OneFin's "$ 4,025.08" |
| Display | `--t-display` | Roboto Condensed 900, 48 / 43, -0.05em | Plan, portion and quick add figures, Progress's two hero figures |
| Title | `--t-title` | Roboto Condensed 900, 36 / 36, -0.05em, capitals | Onboarding questions |
| Heading | `--t-heading` | Roboto Condensed 900, 24 / 24, -0.03em, capitals | The header's page title, section and sheet titles, the hero's counterpart |
| Eyebrow | `--t-eyebrow` | Roboto Condensed 900, 14 / 14, capitals | Small labels over figures |
| Lead | `--t-lead` | Geist 400, 18 / 27, -0.01em | Onboarding captions, Your plan's sentence |
| Subhead | `--t-lead` (`text-subhead`) | Geist 600, 18 / 24, -0.02em | A card's title or status, a box's figure, a sheet's total |
| Body | `--t-body` | Geist 400, 16 / 24, -0.02em; 600 for row titles | Default. Inputs are 16 or more |
| Callout | `--t-callout` | Geist 400 to 600, 14 / 21, -0.01em | Buttons below `lg`, chips, and the Meta line: under a row's title, the line that explains a card |
| Caption | `--t-caption` | Geist 500, 12 / 18 | Labels under figures, units, tab labels |

- Capitals come only from `text-transform` on Title, Heading and Eyebrow. Strings in `en.ts` stay in sentence case. The ONTRACK wordmark is a drawing (section 1), not text.
- Body sizes scale with the text size setting through `--fs`. Hero, Display, Title and Heading scale half as much (`--fs-display`).
- Every number that can change uses tabular figures. Numbers in rows, steppers and wheels are Geist (`num`); the Hero number and its counterpart are Geist 500 and 600, not black; Display numbers are the condensed face, as OneFin's prices.
- Decimals read lighter: `Figure` sets the part after the point in `--ink-2` (the weight trend, the check-in rate), as OneFin's ".08". Not `--ink-3`, which fails on the gradients.
- Nothing below 12 px. Inputs are never below 16 px.
- The landing page adds three sizes (section 13): Poster, Section and Statement, with `text-pill`.

### Hierarchy

From Airbnb's and Shop's iOS screens (`ontrack-design/research/u3-mobbin/NOTES.md`): both read in three steps a card, title, meta, then the value or the action, and no two lines next to each other look alike. Inside the app, text takes five levels; the figures (Hero, Display) sit above them.

| Level | Style | Colour | Used for |
| --- | --- | --- | --- |
| 1 Heading | Heading, condensed capitals 24 | ink | The header's title, a screen's sections ("Meals", "Your week") and a sheet's own title |
| 2 Subhead | Subhead, Geist 600 18 | ink | A card's title, or its status on a status card; a box's figure; a sheet's total |
| 3 Body | Body 16: 600 for a row title, 400 for a sentence | ink | Row titles, sentences, inputs |
| 4 Meta | Callout 14, 400 | `--ink-2`; a second fact `--ink-3` (`Facts`) | The line under a title or a row's title, the line that explains a card |
| 5 Label | Eyebrow (condensed capitals 14) above; Caption (Geist 500 12) under | `--ink-2` | Eyebrow: the subject over a card's title or figure, a group in a sheet or in Settings. Caption: the label under a figure, a unit, a tab |

Rules:
1. **Three levels a card.** A card uses at most three levels of text besides its one figure: usually Label, Subhead and Meta, or in a list Body, Meta and the trailing value. A hero counts each panel and box on its own.
2. **Neighbours differ twice.** Two lines next to each other differ in at least two of size, weight and colour (16/600 ink over 14/400 `--ink-2`). Two lines that match are one level, and one of them goes.
3. **One first thing.** Each card has one thing read first: its figure when it has one, its title when not. Nothing else on the card is as large.
4. **Sections and eyebrows.** A Heading introduces what holds several cards or a list that grows (Meals, Your week). A single card names its subject with an Eyebrow inside it (Training, Weekly check-in). In a sheet the Heading is the sheet's title, so its groups take Eyebrows (Recent, Saved, Exercises), as Settings' and Friends' groups do.
5. **Numbers and units.** The figure is ink, tabular and alone at its level. In a row or a sheet's amount its unit follows on the same baseline one level down in `--ink-2` ("510 kcal", the portion's "kcal"). When the figure is measured against something, the unit starts the line under it instead ("1,840" over "of 2,460 kcal", "84" over "of 108 g"). Decimals read lighter (`Figure`). A number inside a sentence or a status title takes that line's style ("620 kcal to go").

## 6. Space, shape, depth

### The two styles

Tray (the default) is R3's look: white cards on a grey tray, small grey boxes inside them, glass. Bento is flat: grey boxes straight on a white page, no card inside a card, one radius, no glass. The owner picks in Settings (the top of "Units and display") or on Today's one-time "Pick your style" card (`src/flows/style/StyleCard.svelte`, `prefs.stylePicked`), which restyles the app live. The choice is `prefs.look`, mirrored on `<html data-look>` before first paint. Components branch on `prefs.tray`; tokens and CSS on `[data-look="tray"]`. The landing page is always Tray (`prefs.force('tray')`). A style-only change branches on those and nothing else; every other change applies to both.

| | Tray | Bento |
| --- | --- | --- |
| Radii `--r-lg`, `--r-sheet`, `--r-xl` | 32, 40, 48 | all 24 (`--r-md`), in `design/tokens.css` |
| Light page `--canvas` | `#f5f5f5` | white |
| Card (`Card.svelte`) | white `--surface`, `--shadow-card` in light and a hairline ring in dark, radius 32, 24 inside | a grey `--surface-2` box at 24, no shadow; grey inside it turns white (`[&_.bg-surface-2]:bg-surface`) |
| One card holding small boxes (Today, Train, Progress, Profile, Settings' groups) | a white shell, radius 48 and 8 inside (Settings' groups 32), holding the boxes 8 apart | no shell: the boxes sit on the page, with the same compact grouping |
| List card (`Card list`) | the white card with rows inside, radius 32 | rows straight on the page, 8 into the gutter so words line up with the boxes' |
| Glass | `liquid` and `liquid-clear` are real glass | both a solid `--surface`; `liquid` adds a hairline; no blur or rim |
| Header | the page at rest; a `liquid` capsule once content scrolls under it, the title moving in from 8 to 24 | a page coloured bar, with a hairline once content scrolls under it |
| Dock | `liquid-clear`, 14 px blur, a 30 percent surface tint; selected tab on `--ink` at 12 percent, icon and label violet | `liquid` (solid, hairline); selected tab a solid ink pill, icon and label in the canvas colour |
| Sheet backdrop | the scrim, blurred (`--blur-scrim`) | the scrim, plain |
| Segmented track, week cells, choices | track 20 with 16 segments; day cells 24; choices 24 | track 16 with 12 segments; cells 16; choices 16 |
| Onboarding's Your plan, Building | the haze panel in a shell; Building's disc is glass | white cards on the sky page; a solid disc |

Both styles share the compact, one screen layout. Main content fits one screen at 390 by 664 (Safari with its toolbars), and the SE at 375 by 548 holds with the `max-height: 620px` trims.

### Space and shape

- **Grid.** 4 px. Page gutter 16 (`--gutter`). Inside cards and sheets 24 (`--inset`). Gap between cards 12, between boxes in a card 8, between a label and its value 4. Row height at least 56. Content sits in a column of at most 480 px, centred on `--surround` on wider screens.
- **Radii.** OneFin's large, concentric corners: 8 for checkboxes, 16 for inputs, thumbnails, chips, small buttons, icon buttons and the wheel band, 20 for the large button (and Tray's segmented track), 24 for boxes, choice cards, tiles, toasts and bars holding a button, 32 for Tray's cards, 40 for the top of Tray's sheets and a box's corner that meets a shell's corner, 48 for Tray's hero shell. Full for tracks, the dock and its selected tab, the plus, the avatar and pill chips.
- **Corners nest, padding grows with the radius (U1b).** A filled shape 8 or less inside another's corner, the same gap on both sides, takes the outer radius less the gap: Tray's shell at 48 with 8 inside gives 40 to the haze panel's top corners and the boxes' outer bottom corners (`rounded-t-sheet`, `rounded-bl-sheet`, `rounded-br-sheet`); corners that face a sibling keep their own radius (24). In Bento `--r-sheet` is 24, so nothing steps. Text and controls sit at least half a corner's radius from both of its edges:

| Radius | Padding at least | Used by |
| --- | --- | --- |
| 8 | 4 | checkboxes |
| 16 | 8 | inputs, small buttons, chips, thumbnails, icon buttons, the wheel band |
| 20 | 10 | the large button, Tray's segmented track (its segments are 16, 4 inside) |
| 24 | 12 | boxes, choice cards, tiles, toasts and the landing bar (a button 8 inside at 16) |
| 32 | 16 | Tray's cards, 24 inside |
| 40 | 20 | Tray's sheet tops (24 inside), the haze panel, boxes' outer corners |
| 48 | the gap, 8 | Tray's hero shell, which holds boxes, not text; content set straight in it sits 24 from its edge |

  `unnested` in `tests/e2e/helpers.ts` measures it, in Tray: on every app screen and sheet in the stress matrix (seven sizes, three text sizes) and, in both themes, on the tabs, the Add sheet, a toast with Undo and the dock's pill in `app.spec.ts`. It counts a fill that only shows while pressed, and fails a corner that reaches past the curve it sits in. A row whose pressed grey runs edge to edge (`bleed`) reaches into a list card's 4 px padding, so the card's clip gives the grey its own corners.
- **No fades (the owner, 19 November).** Nothing fades under the header or a sheet's header, or above a pinned footer; bars meet content edge to edge. The wheel's rows and the week strip's far days keep a soft mask, being scrolling pickers. A cross fade between two states is `--d-fade` (section 10).
- **The status bar continues the top of the screen.** `topColour()` in `src/lib/prefs.svelte.ts` sets `theme-color` and the root's background (Safari 26 samples it): the sky (`--sky-top`) on the landing page and in onboarding, the canvas elsewhere.
- **Depth.** Tray cards carry `--shadow-card`, OneFin's soft stats card shadow, and never a border with it; in dark mode it is a 1 px ring. Bento's boxes have none. Things that float (the dock, toasts, a dragged row) have `--shadow-float`. The ink pill and the dock's plus carry `--shadow-action`. No button has an inner light, a bevel, a rim, a gradient or a glow (`tests/e2e/app.spec.ts` sweeps every button). Cards stay solid, so nothing that carries a number you need to read is glass.
- **Glass (Tray only in the app, always on the landing page).** Two materials in `src/app.css`, as OneFin's "Paid" pill and iOS 26's Liquid Glass (after callstack/liquid-glass). `liquid-clear`: a 6 px blur with saturation and light, no fill, for what sits over colour and reads on its own. `liquid`: a 14 px blur, saturation and half a surface fill (62 percent dark in the dark theme), for what things scroll under, so words on it hold 4.5 to 1 over anything. Both catch the light at the rim (`--liquid-rim`) with a soft drop (`--shadow-liquid`), except the bars at the screen's edges: the header capsule and the dock, and the dock's plus, cast no drop in Tray, so nothing fades at the top or foot (25 Nov, the owner); `--liquid-tint` with `--liquid-tint-share` tints either. Put it on the visible shape itself, in the flow: never as a layer at a negative z-index inside an `isolate` parent, and never inside a parent that clips with rounded corners (that cuts the blur off from the page). Without `backdrop-filter`, `--liquid-solid` stands in. In Bento both are the plain surface (the table above).
  - **Allowed on:** the dock; the header once scrolled; small chips and pills over colour or a picture (Today's day kind, the camera's reads-barcodes chip); round actions over a gradient (the Add composer's ways); onboarding's pinned Continue tray; the food map's buttons and pins; the sheet backdrop (the blurred scrim); the landing page's bar, chips and tiles.
  - **Never on:** a content card, a button, or anything that carries a number you need to read.
- **Gradients (P1, the owner's round 3; the blend, 18 November).** Every gradient is a photo gradient made on photogradient.com with the settings of the owner's example (Sharp Bézier, Worley Noise warp 0.4, warp size 1; the haze, trend and streak use Soft Bézier with an FBM warp, `gt=1 ws=4`, so their colours melt with no hard bands). Each is a `.webp` in `design/gradients/`; `scripts/gradients.sh` lists each one's eight colour points and remakes them (`sh scripts/gradients.sh [name]`, with Yab). The site's grain is one tile (`--grain`, `grain.webp`, 9.5 percent alpha) over every gradient; the CSS gradient beneath is its fallback. **The owner's blend:** salmon (peach and coral) and pink lead, white and lavender (the brand's light purple, in every one) support, and only a little blue (mist, steel) at an edge. Light and calm, never dark colours, the same in both themes. Words on a gradient are ink, `--haze-ink-2` (ink at 73 percent, exactly `--ink-2` on white) or night, in a light island (`.haze`, `.feature`, `data-theme="light"`), never `--ink-3`. `contrast.test.ts` checks the words on each gradient's eight colours (under the grain's mean) and `landing.spec.ts` on the images.

| Token | Image | Where |
| --- | --- | --- |
| `--grad-hero` (`haze`) | `haze-light` | Today's hero panel, Your plan's panel in Tray |
| `--grad-trend`, `--grad-streak` | `trend`, `streak` | Progress's two hero boxes, the weight trend and the consistency: the haze's colours mirrored, and moved three places along |
| `--grad-feature` (`feature`) | `feature-light` | The featured card: Train's next session, Today's protein gap, Scan the tub, the landing's first Logging card |
| `--grad-sky` | `sky-light` | The landing hero, onboarding's page, the Add composer, the check-in's key number panels |
| `--grad-lavender`, `--grad-call`, `--wash-1` to `--wash-4` | `panel`, `call`, `wash-1` to `wash-4` | The landing page only (section 13) |

- **One card, small boxes (the owner, 17 November).** A page leads with one card holding small boxes, as OneFin's Withdraw card: the screen's gradient panel on top, grey boxes under it 8 apart, detail below it or behind a tap. Tray draws the card as a shell; Bento keeps the grouping without it. Otherwise divide a card with a hairline.

### What OneFin's picks gave, and why

| Pattern (pick) | Where | Why it helps there |
| --- | --- | --- |
| Flat ink pill, white on dark (15, 04, 13); grey pill and square icon buttons (04, 11) | Every primary button and the dock's plus; second actions; stepper keys, close, back, more | The owner's call: no 3D effect on buttons. Ink reads as the action on every surface and leaves violet free to mean Ontrack; a stepper at its bound turns grey instead of fading |
| White card with a big number and grey boxes (15); one gradient region in a card (16); aurora haze (03, 14) | Tray's hero cards | The number is what the screen is about; one soft colour field marks the hero without tinting the numbers below it, and every word on it passes 4.5 to 1 |
| Frosted chip with a white edge (16, 01) | The hero's day chip | Glass shows only where something sits over colour or a picture |
| Violet as the brand (02, 06, 12, 13) | Landing tiles, links, tracks and charts, count badges | Violet says "this is Ontrack" and marks progress, so the ink action is never confused with it |
| One featured card (02) | Train's next session, Today's protein gap, Scan the tub | The one way a screen suggests first, without a second button colour |
| Regular weight big numbers, lighter decimals (14, 15) | The Hero number; `Figure` | Geist figures read faster than condensed black; the lighter decimals keep 72.4 from reading as 724 |

Not taken, on purpose: the ring progress (07) for calories and macros, since the track is Ontrack's signature (the one ring is Train's week of sessions, `WeekRing`); tilted stickers, floating tiles, testimonial colours and dark gradient footers (08 to 10, 12), which belong to the landing page; grain on glass (14), which costs legibility on a phone.

## 7. Components

Start from the components in `src/lib/components/` and their gallery at `/gallery` (development builds only).

| Component | Specification |
| --- | --- |
| Button | One height system. `lg` 56 for the screen's or sheet's main action, pinned at the bottom; `md` 48 for second actions in content; `sm` 36 on screen and 44 to tap, for inline actions in rows and boxes. Variants: `primary`, OneFin's flat "Withdraw" pill: `--action` fill (ink, white on dark), `--on-action` label, `--shadow-action`, radius 20 at `lg` and 16 below; `neutral`, the grey `--surface-2` pill; `surface`, a white face over a gradient or a photo, where grey would read as disabled; `on-ink`, a translucent grey face on a done box's ink (Undo, Edit); `plain`, a violet text link in `--accent-ink`; `danger`, a `--danger` label. Pressed: the fill steps (`--action-press`, `--surface-3`) and the face scales to 0.97 in 120 ms. Disabled: the primary turns grey (`--surface-3`, `--ink-2` label, no drop); the others fade to 40 percent. No gradient, bevel or glow. Labels are verbs in Geist 600 |
| Icon button | A 44 rounded square (radius 16). Action keys (the stepper's) are ink with an `--on-action` glyph, grey with an `--ink-3` glyph when disabled. Close, back and more are quiet: a glyph on nothing, `--surface-2` when pressed. The header's map and person buttons are 44 circles: `--surface` in Tray, bare in Bento. The camera's light is a solid dark square, since glass over a live picture would change with the theme |
| Card | The style's card (section 6). A card's head (`CardHead`): an optional Eyebrow, the title in Subhead, an optional Meta line, an optional small action under them |
| Box | A `--surface-2` box at 24 inside a hero or a card, 8 from its neighbours: a Caption label, a value in Subhead tabular with "/ 108 g" in Caption, and a 6 high track at the foot so a row of boxes stays level (Today's macros). In Tray a box at a shell's corner takes 40 on that corner. Train's week boxes, Progress's three, Profile's and Your plan's are boxes too |
| Session box | Today's training and weigh-in boxes: the title in Body 600, its facts in Caption at the foot, a small primary Done (Add for the weigh-in), turning ink as section 10 rule 6 says. A box keeps its size once done; a single session centres its words, and a cardio session shows its machine under Cardio (`src/lib/session-title.ts`) |
| Glass chip | A pill on a gradient or a picture: the `liquid-clear` class, Caption 600 in ink, 2 by 10 inside. The hero's day kind |
| Featured card | At most one per screen (`data-featured`, `feature`): a `--grad-feature` card at the card radius (a tile at 24) with ink words. Train's next session panel, Today's protein gap (it folds to its title line, remembered), Scan the tub in the supplement setup. Pressed: darkens a step and 0.97 |
| Row | A 48 px tile or thumbnail at radius 16, title in Body 600, one Meta line (Callout 400 in `--ink-2`), trailing number in Body 600 tabular with its unit in Caption (calories always say kcal), or one control, or a chevron for a row that opens something. At least 64 high in lists. Divided by hairlines inset to the text. `SwipeRow` wraps a row that deletes |
| Facts | Two or more facts on one line ("12:30 \| Database", "60 min \| 240 kcal"): a 1 px `--line-strong` divider one line high with 8 either side, never a comma or a middle dot; the facts after the first step lighter (`--ink-3` in a caption, `--ink-2` after ink). Screen readers hear a comma. When the facts wrap, no line starts or ends on a divider. A list of like things (muscles) keeps commas. `Facts.svelte` |
| Icon tile | 48 square (40 in choice cards) at radius 16: lavender (`tile`: `--accent-soft` with an ink glyph, lavender in dark) for a call to action row; `--surface-2` with an `--ink-2` glyph for how a meal was logged; violet (`bg-accent` with an `--on-accent` glyph) for feature icons on the landing page; white with a 1 px lavender edge and a violet glyph for a shortcut on grey (the supplement setup's Photograph the label). Flat: no inner glow |
| Chip | 44 high, radius 16, Callout 600, `--surface-2`. Selected: ink fill with canvas text |
| Segmented control | A track on `--surface-2` with 4 px padding (Tray 20 with 16 segments, Bento 16 with 12), segments 44 high; the selected segment is one ink pill that slides to the pick, with canvas text. At most four options. Progress's range is a row of small text pills, the chosen one filled ink |
| Switch | 50 by 30, ink when on, `--control-edge` when off; the knob is `--surface`, 3 to 1 on either track |
| Track | The signature. A full radius bar, 14 high in the hero and 6 elsewhere, on `--track-bg`. The scale runs from 0 to 110 percent of the target. The on track zone is a slightly darker segment from its lower bound to the end. Fill is `--progress` violet, and turns `--success` inside the zone. Width animates over 420 ms |
| Hero number | Hero style (Geist 500), a caption beneath ("of 2,460 kcal") and the counterpart on the right in Geist 600 at Heading size ("620 to go", or "On track" in `--success-ink` with a popping check). Digits count when the value changes |
| Wheel | For bounded values: birth year, height, weight, goal weight, body fat. Five rows of `--wheel-row` (44 at default text), the selected row on a full width `--surface-2` band at radius 16; wheels side by side share one band. Rows in Geist 600 at Heading size, tabular; the selected row ink, the rest `--ink-3`, the edges masked. The unit sits once, beside the band. Native scroll snap does the momentum. A decimal has a whole and a tenths column. Tapping the selected row, or Enter, swaps in a 16 px or larger text field. Each column is a slider for assistive tech |
| Wheel sheet | A sheet with the title, a hint caption, the wheel, an optional plain Clear, and the pinned primary Save. Weigh in, goal weight and body fat use it |
| Stepper | Minus and plus as 44 ink rounded squares (grey at a bound) around a number in Geist 600 at Heading size, which can be typed. Holding repeats. For small counts near a start: days, minutes, sets, reps, grams |
| Number field | Exact, wide range values (Quick add): a native field with the number pad (`inputmode`), not `type="number"` |
| Input | `input-field`: 56 high, radius 16, `--surface-2`, label in Caption above. Focus draws a 2 px ink ring |
| Disclosure | A title and one short line that open what is behind them, a chevron that turns; the head is one 44 high tap. Closed by default; the height moves with `collapse` |
| Coach card | `CoachCard`: the coach's words (a Subhead headline, two or three Callout lines about numbers the engine already worked out), skeleton lines while it loads, a small sparkle line when real AI wrote it. A status card in the style's card |
| Sheet | vaul Drawer. Top radius `--r-sheet` (40 Tray, 24 Bento), grabber 36 by 5, title in Heading beside a 44 close button, a back chevron when the sheet has a step. The backdrop is the `--scrim` (blurred in Tray). Header and footer are plain, with no fades; the main action is pinned to the bottom above the safe area. Opens to content height, at most 92 percent of the visible height. Opaque: no glass in the content layer |
| Dock | A floating pill with three tabs and, to its right, the 64 ink plus circle with `--shadow-action`, both 64 high, 12 above the safe area. The selected tab sits on a pill 8 inside the dock's edge that slides to the pick; its look is the style's (section 6); the others are `--ink-2`. A small violet dot on a tab says something is waiting (Progress, when the check-in is ready) |
| Header | 56 high, sticky: the page's title in Heading on the left, then the sync mark, the friends and map button (signed in, with a badge counting requests) and the person button, which opens Profile (Settings is reached from there) or Sign in. The style sets its look at rest and once scrolled (section 6) |
| Week strip | Six sliding days and a pinned Today chip, cells 64 high (48 under 620 high): the weekday letter in Caption, the date in Body 600 tabular, a 5 px dot at the foot in `--success-ink` when that day was on track (`--success` on the ink pill). The day in view is an ink pill; today, when another day is in view, keeps a 2 px ink ring. Days slide six at a time and snap |
| Toast | R5, the owner: a 44 high pill that hugs its words, top centre under the header, one line, optional Undo as violet words filling the pill's height. Tray: the dock's glass (`liquid-clear` with the dock's blur and a 30 percent surface tint); Bento: the theme's surface with the float shadow. One at a time |
| Source label | Caption text: Database, Estimate, Yours (the user's remembered numbers), Quick add, Open Food Facts, Label or Typical. Estimate carries a small outlined circle before it. No colour |
| Sync mark | An 8 px dot beside the avatar: hidden when idle, `--ink-3` pulsing when syncing, hollow when offline, `--attention` when it needs attention. Tapping it explains the state |
| Empty state | A line of body text saying what will appear here and one button to make it appear. No illustrations |
| Skeleton | Blocks in `--surface-2` at the final layout's sizes, with a slow opacity pulse |

### Cards

Five kinds, each with a fixed order, so a card's job shows before its words are read. Like things share one list card; an item gets a card of its own only when it has its own status or action. In Tray each is a white card; in Bento a grey box (a hero is the bare group).

| Kind | Parts, in the order the eye takes them | Space | Corners | Where |
| --- | --- | --- | --- | --- |
| Hero | One card holding small boxes: a gradient panel (Today's haze with the figure, its caption, the counterpart, the track and the glass chip; Train's featured panel with the week ring and Done; Progress's two gradient boxes), then grey boxes (macros, sessions and weigh-in, the week, the chart's three) | Shell 8; panel 20 inside; boxes 16 inside | 48 shell; panel 40 then 24; boxes 24, 40 at a shell corner | Today, Train, Progress, Profile, Your plan |
| Summary | Eyebrow, the figure (Display) with a Caption under it, the chart or bars, a Meta line, one second action | 24 inside; blocks 16 apart | 32 in Tray | Progress's Intake, Maintenance and Training; Train's summary (its Eyebrow is the program) |
| Status | Eyebrow (the subject), Subhead (the status), Meta (why it matters), then one small button, or the rows or steps it needs | 24 inside; 4 between the head's lines, 16 from the head to what follows | 32 in Tray | Today's one card (check-in, easy adds, Getting started, nothing logged, the style card), Train's suggestion and analysis, the coach's words, session expired |
| List | Rows: a 48 tile, the title in Body 600, a Meta line, a trailing value or one control; hairlines inset to the text. A list that is one card on its screen opens with an Eyebrow | 24 at the sides, rows 64 high at least | 32 in Tray; tiles 16 | Meals, Check-ins, History, Train's suggestions |
| Featured | A Heading or Body 600 label and a Caption or Meta line on `--grad-feature` | 16 to 20 inside | the style's card radius; Scan the tub's tile 24 | One a screen: Today's protein gap, Train's next session (the hero's panel), Scan the tub |

**One highlight.** An item stands apart by one means only: a gradient (the hero's panel, the featured card), an ink fill (the day in view, a selected chip, a done box) or a pill (the hero's day chip). Never two at once, never by size alone inside a list, and at most one featured card a screen.

## 8. Banned

These are what make an app look machine made. None of them ship.

1. Neon outlines, glows behind text, mesh backgrounds, and any gradient section 6 does not name. A gradient, bevel, inner light, rim or glow on any button.
2. Emoji or sparkle icons standing in for icons. Any "AI" badge next to the photo feature. (A small sparkle line under the coach's own words, saying an AI wrote them, is the disclosure, not a badge.)
3. A dashboard of small stat cards with icons in tinted circles.
4. Rings and doughnuts for calories or macros. Rainbow macro colours.
5. Borders on cards, or a border and a shadow together (a glass chip's white edge is its glass, not a border; Bento's hairline on its solid dock and header stands in for a shadow). Shadows only as `--shadow-card`, `--shadow-float`, `--shadow-action` and `--shadow-liquid`.
6. One radius used everywhere in Tray. Cards inside cards: Tray's one shell holding boxes is the only nest, and Bento has none. Glass on a content card.
7. Centred body text, centred forms, marketing copy inside the app.
8. Wide letter spacing. Capitals typed into the words. Mixed title case and sentence case.
9. A serif or editorial look, cream backgrounds, drop caps.
10. Stock illustrations, mascots, streak flames, achievement badges, and OneFin's own artwork, photos, people or logo. Confetti: the one celebration is the small green burst on Done (section 10).
11. Red or green used to judge food or weight.
12. Em dashes, en dashes, middle dots, exclamation marks, and the words unlock, supercharge, journey, crush, smart.
13. A spinner as the only loading state. A modal dialog where a sheet or inline message would do.
14. A calculator keypad. Bounded values use a wheel, free amounts the native number pad or a stepper.
15. A fade under a header or above a footer.

## 9. Rubric

The `design-critic` subagent checks screenshots against these, side by side with the owner's picks it is given (15, the "Withdraw" card, and 16, the invoice card, at least). Each is pass or fail. Check Tray and Bento both.

1. Tokens only: every colour, radius and type size on screen exists in `design/tokens.css`.
2. Colour roles: at most one ink primary pill on a screen or sheet, plus the dock's plus (Today's per box Done and Add excepted). Violet only in section 4's brand uses. Any green is a reached target.
3. One focus: the screen has one clearly largest element, and it is the thing the screen is about.
4. Type scale: every text matches a style in section 5. Display styles are condensed capitals; numbers are tabular.
5. Alignment: content aligns to the 16 px gutter outside cards and the 24 px inset inside them (in Bento a list's words line up with the boxes' words). Numbers in a list align on the right edge.
6. Spacing: gaps come from the 4 px grid, and equal things have equal gaps.
7. Depth: Tray cards are solid and carry only `--shadow-card` (light) or a hairline ring (dark); Bento's boxes carry none; only the dock, toasts and dragged rows float. No button has a gradient, bevel or glow: the ink pill's only depth is `--shadow-action`, and tappable cards (choices) keep a card's `--shadow-card`, without which they vanish on the canvas.
8. Gradients: at most one per screen, on its hero, light and photographic, from `design/gradients/`. Named exceptions: Progress's two hero boxes and Today's featured card. None on Settings, a button, a row, a chip or text. Glass only where section 6 allows it, and none in Bento.
9. Nothing from the banned list.
10. Copy: sentence case in the words, no banned punctuation or words, numbers formatted with grouping and units.
11. Touch: every control is at least 44 px and has a visible pressed state in the interaction screenshots. One button height per role (56, 48, 36 in 44).
12. Both themes: the dark and light screenshots have the same structure, and no text falls below its contrast bar.
13. Fit: no clipping or overflow on the SE in Safari (375 by 548) or at the largest text size; a page's main content fits one screen at 390 by 664. The main action is reachable without scrolling on a sheet.
14. States: empty, loading and error states exist for the screen and follow sections 7 and 2.
15. The spec: the screen contains what its section of `docs/SCREENS.md` lists, in that order.
16. Identity: beside the owner's picks, the screen reads as the same family: condensed capitals for titles, the flat ink pill, solid cards (Tray) with big nested radii, grey boxes, the gradient on the hero only, small glass chips (Tray), violet as the brand.
17. Corners nest: a filled shape 8 or less inside another's corner has the outer radius less the gap, and no text or control sits closer to a corner than half its radius. Look at the hero's panel and boxes, list cards, sheets, toasts and bars holding a button.
18. Controls stand apart: in both themes, every selected state (chip, segment, choice, the week's day in view, the dock's tab) and every control known by its shape (switch, field focus) is plainly visible against what is next to it; in dark, the page, cards, grey buttons, boxes and the dock's edge are told apart at a glance.
19. Dock: Tray's selected tab sits on a grey pill with its icon and label violet; Bento's on a solid ink pill with canvas coloured words; the others are grey.
20. No fades: content under the header, a sheet's header or above a pinned footer meets the bar edge to edge.
21. Facts: two facts on one line are set apart by the thin divider, never a comma, full stop or middle dot, and the second is one step lighter.
22. Status bar: the area above the content continues the colour at the top of the screen (the sky on the landing page and in onboarding, the canvas elsewhere), with no band of another colour.
23. Style: Tray has one shell holding its boxes and glass only where section 6 allows; Bento has no card inside a card, one radius, no glass and no scrim blur. The landing page is Tray whatever was picked.

## 10. Motion and feedback

Fixed values from MOTION.md, as tokens in `design/tokens.css`. JavaScript reads the same tokens through `dur()` (0 under reduced motion) and `ms()` in `src/lib/haptics.ts`, so there is no second set of numbers. Motion explains a change: where something came from, where it went, that a number moved, that a wait is working. It is never decoration, and it never holds the next tap.

| Token | Value | Used for |
| --- | --- | --- |
| `--d-press` | 120 ms | a press: scale 0.97 and a fill step |
| `--d-fade` | 150 ms | a cross fade (a day's cards, a step's words); the one motion reduced motion may keep |
| `--d-settle` | 240 ms, `--ease-out` | a dragged row or page settling when the finger lifts; a tab, a Settings page, a sheet step or an onboarding step sliding in |
| `--d-leave` | 280 ms, `--ease-out` | a row or card leaving: things go faster than they come |
| `--d-count` | 400 ms, `--ease-out` | a number counting to its value (`Count.svelte`) |
| `--d-ui` | 420 ms, `--spring-default` | state changes: chips, segments, switches, the dock's sliding pill |
| `--d-move` | 420 ms, `--ease-out` | tracks filling, a row or card arriving, bars growing |
| `--d-pop` | 520 ms, `--spring-pop` | a check popping in: a target reached, a session done |
| `--d-appear` | 600 ms, `--spring-appear` | first paint and arrival: Today's cards, a chart's line, onboarding's rise |
| `--d-beat` | 640 ms | one step of a made-up wait (Building your plan's rows and the percent that moves with them) |
| `--d-reveal` | 1400 ms | Your plan's target counting up from nothing, with `--ease-out` |
| `--d-step`, `--d-sweep` | 1.6 s, 1.8 s | a real wait: the words under a photo being read, the sweep across it |

The pieces a new screen reuses: `Count` (a number counts to its value over `--d-count`, from `from` on arrival, then from where it stands; a `children` snippet renders the text, as `Figure` does), `Burst` (one ring and twelve dots in `--success` going out of a check, 480 and 640 ms, decoration only), `pop` (a check or mark arrives past its size and settles, only when its state changes), `collapse` (a row or card arrives or leaves with its height, opacity and the flex gap), `reach` (a track reaching its zone swells once with a green ring), `ink-in` and `ink-out` (rule 6), `landed` (a meal just logged lands with a lavender glow, 1.6 s), `appear` (Today's cards rise 8 px, 40 ms apart, on a session's first paint), `rise` and `reveal` (onboarding's entrance, 70 ms apart with a short blur, and a block that settles as it scrolls into view), `fill-in`, `grow-up` and `draw-in` (Progress on arrival), `scan-sweep` (a flat lavender band with a bright edge sweeping over a photo being read) and `swap-in` and `swap-out` (the Add composer's example line).

Rules:

1. **Every tap answers within 100 ms.** Buttons, icon buttons, tiles and cards scale to 0.97 with a fill step (the ink pill to `--action-press`); rows take the grey fill. A light haptic on select (chips, segments, choices, switches), on every log (a meal, a supplement, a weigh-in, a session done or undone, a check-in decided), on every delete and on reaching a target. None on navigation, wheels or a day picked in the strip.
2. **One selection, one moving mark.** The dock's pill and a segmented control's ink segment slide to what was picked (`--d-ui`, `--spring-default`) rather than one switching off and another on.
3. **Numbers move; lists move.** A number counts from where it stood: Today's eaten figure and macros when a meal is logged, edited or removed or another day is picked; each session's burn; Train's week figures; Progress's figures from nothing on arrival (the weight from where the chart starts, so the change itself moves); the check-in's new target from today's. Tracks fill to their value. A new row grows in (`collapse`, `--d-move`), a removed one collapses (`--d-leave`), carrying the flex gap so nothing jumps. A day picked in the strip swaps its cards in one cross fade: rows never collapse for a change of day.
4. **Swipe to delete is iOS Mail's.** The row follows the finger over a red action that fills exactly the space it leaves, full height, under the card's clip and into its padding, so no white edge shows. Let go past half the button and it stays open on Delete (88 wide); past half the row the label jumps to the row's edge, and letting go deletes with a haptic: the row slides out (`--d-settle`), then collapses, and Undo stays 5 s. A tap on an open row closes it; one row is open at a time.
5. **A wait shows its work.** A photo being read sits under the sweep, with its steps in words beneath, one every `--d-step`; the last holds until the answer. Skeletons at the final layout's size, never a spinner alone, never a blank sheet.
6. **Done: the ink and the burst (the owner, 18 and 19 November).** Marking a session done is one tap, with no set logging and no timer. The box turns the action's ink as a circle growing from the button tapped (`ink-in`, 560 ms, centred by `--x` and `--y`); its words turn to `--on-action` a quarter second in, once the ink reaches them; a green check pill (`--success`, night glyph) pops in holding the burn, which counts from 0 down to a negative number (exercise kcal reads negative everywhere); `Burst` plays once on it; Done becomes a grey `on-ink` Undo, same place and size. Undo plays it back: the check shrinks away, the ink closes into the button (`ink-out`, 380 ms), and the session unmarks once it is gone. The weigh-in box works the same way (Add before, Edit after, the check above the weight). Train's hero pops the check and slides a black Undo in from where Done was, and back.
7. **Satisfaction, never guilt.** A target reached turns its track green, swells it once with a green ring going out (`reach`), pops a check beside its words (the hero's "On track", a macro box) and plays one haptic. Only a change made while looking: a day picked in the strip shows its checks without the pop and plays no haptic. No streaks, and no confetti beyond the Done burst.
8. **Arrivals are first paints only.** Today's cards rise on the first paint of a session (`appear`); Progress's bars grow and its line draws once on arrival. Coming back to a tab does not replay them.
9. **Reduced motion: nothing moves, nothing loops.** Every transition and animation collapses to an instant change (the global rule in `app.css`, and `dur()` returns 0 for Svelte's transitions and counts). Anything that loops is not drawn at all (the sweep, the skeleton and sync pulses), since a looping animation at 0 s would still be running. A wait still changes its words. `tests/e2e/motion.spec.ts` proves both: each animation reaches its end, and with reduced motion none is left running.
10. Sheets use the vaul spring. Swiping between tabs follows the finger and settles with `--d-settle`. A tab stays mounted once opened, so coming back is instant and replays nothing.
11. **Changes on the same page move.** A sheet's next step slides in 24 px and fades up (`Sheet`'s `step`), from the left after Back; a new range on Progress draws its line and grows its bars again; a row that opens its citations (Your plan's lines, Train's Why) or a Disclosure grows and shrinks with `collapse`; the portion's calories count.

## 11. Icons and imagery

- Lucide icons at 24 px, stroke 2, in `currentColor`. Tab icons: a track for Today, a barbell for Train, a rising line for Progress.
- Icon tiles come in three tones (section 7), OneFin's tile treatment in Ontrack's colours.
- Imagery is the user's own meal photos, the gradients, the landing page's real screens of the app, and decoration drawn in CSS or SVG in OneFin's manner (glass tiles, tilted chips). No stock art and none of OneFin's 3D renders, mockups, photos or screen images.
- A meal without a photo gets a neutral tile with an icon for how it was logged.

## 12. Accessibility

- Text contrast 4.5 to 1 or better against its background, 3 to 1 for large text. `--ink-3` passes 4.5 to 1 on the page and cards, for the second fact on a line. What identifies a control or shows its state has 3 to 1 against its neighbours (section 4 rule 7). `tests/unit/contrast.test.ts` checks the token pairs in both themes.
- The green fill of a reached track is about 1.8 to 1 on white. It is never the only signal: the value is always also text, and "On track" is also a word and a dot or a check.
- Every control has an accessible name. Sheets trap focus and restore it. The track exposes its value as text. Wheel columns are sliders with a value text ("168 cm") and arrow, page and home or end keys.
- Pinch zoom stays enabled. Text size follows the device by default.

## 13. Landing page (L1)

The landing page is the one marketing screen: a visitor reads it top to bottom, once, before deciding to start. It takes the landing-only patterns the owner picked from OneFin and section 6 left out on purpose, and it is the only place they appear. Its job is one tap on "Build your plan", so every pattern either says what Ontrack does or moves the eye toward that action. It is always Tray, whatever style the visitor picked. Spec in `docs/SCREENS.md` section 3, code in `src/flows/landing/` (`landing.css` is its own stylesheet, so the app never loads it).

| Pattern (pick) | Where | Why it helps there |
| --- | --- | --- |
| Tilted sticker eyebrows, "01 BENEFITS" (01, 05, 12) | Over each section headline: 01 Logging, 02 Training, 03 Check-in, 04 Friends, 05 Sources | Numbered chapters tell a scanning visitor how far they are; each tag takes its own palette colour with night words |
| Huge condensed capitals ending in a full stop (01, 05, 10, 12) | The hero (Poster) and every section (Section) | A statement, not a slogan: one claim per block, readable at a glance on a phone |
| Inline word pills in big body text (08), floating tilted icon tiles (08) | The statement under the hero | The three things Ontrack does are the pills (the last one ink); the four ways in (photo, barcode, training, weigh-in) are violet tiles that move a little with the scroll |
| Dark sections (06, 09, 12) with flat palette panels (`--mist`, `--peach`) and number badges | 02 Training, and the run from 05 Sources to the footer | Changes the pace of a long page and marks the two blocks about the method. No glow and no gradient in them |
| Lavender led field with rings and tilted glass cards, the 1-2-3 stepper (07) | 03 Check-in | The check-in is a sequence; the stepper says so, the cards repeat its own words |
| Colour-washed cards (10) | 05 Sources | Where OneFin puts testimonials, Ontrack puts its sources: honest proof, read from `constants.ts` so it cannot drift |
| Violet icon tiles beside short points (05) | 04 Friends | The food map raises who sees it and where; three points answer that beside the real map |
| A short footer (L5, the owner) | The footer | A normal footer, all of it on the page: "Keep your calories" in Poster capitals over the wordmark at the same width, the wellness line, the contact and legal links with a faint divider, the year and the version on one line. No pull to open, no bend, no lanes |
| OneFin's sky and glass bar, tilted glass chips flying in (hero, nav, 15; glass-03) | The hero and the fixed bar | The first screen reads as OneFin at once. The bar is a capsule across the page's width less a 36 gutter, 8 below the safe area: over the sky it has no glass, and once content scrolls under it the glass grows out of Sign in, night glass over dark sections. The chips are clear glass with night words; the On track chip turns night glass over dark screen pixels (`overDark`) |
| Phones with real screens (05, 12) | Every feature | Proof by showing: each is a screenshot of the app, never a mock-up, in an iPhone 16 drawn in CSS from its published sizes (393 by 852, a 54 point status bar at 9:41, the island 126 by 37, 55 point corners), no shadow. A scale drawing: its sizes are shares of its own width (`cqw`), not tokens. The meal in every phone is the owner's pad kra pao (`tests/fixtures/krapao.jpg`) |

Rules that bend here, and only here:
- **Gradients.** The photo gradients of section 6: `--grad-sky` (the hero), `--grad-lavender` (the check-in's field), the four `--wash-*` (the source cards), `feature` on 01 Logging's first card and `--grad-call` on the closing call's panel. Still never on a button, a row, a chip or text. The words on each are checked in `contrast.test.ts` and `landing.spec.ts`.
- **Liquid Glass.** The two materials of section 6, always on here. `liquid` on the bar and the floating action's tray, which anything scrolls under; `liquid-clear` where the words already read: the hero's chips, the check-in's cards, the Sources cards' icon tiles and the closing call's mark tile. `data-theme` on a glass is its scheme (the bar over dark sections). `liquid-touch` lights the glass under the pointer and `liquid-grow` grows it under a finger (`interactive` in `glass.ts`, styles in `landing.css`). Never on a button, and never with a parent that clips it with rounded corners. No SVG filters and no lens layers: one backdrop filter per glass, so Safari scrolls smoothly and CI's WebKit draws it without a GPU. Every tap on the page has a pressed state: a fill step, and 0.97 when motion is welcome (`.tap`).
- **Centred text.** Headlines, leads and the statement are centred on a phone, as OneFin's are; the hero is left aligned on a wide screen.
- **More than one primary.** "Build your plan" appears in the hero, floating and in the closing call, but never two pills on screen at once: the floating one shows only between the hero's and the closing call's. Ink on light, white on dark. The bar's Sign in is the ink pill too (`sm`), the owner's one exception, so it shares the screen with Build your plan.
- **Dark sections in the light theme.** A section marked `data-theme="dark"` takes the dark tokens (`design/tokens.css` applies the dark block to any element so marked). Use `overflow-clip`, never `overflow-hidden`, on a section that holds scroll-driven motion: a scroll container captures `view()` timelines. `--night`, `--on-night` and `--lavender` stay the same in both themes.
- **Safari's bars.** The page's background follows the section at the top of the screen (`edge.ts`), and nothing fixed touches the top or bottom edge, where Safari 26 would take its colour for its bars.
- **Width.** The page is full width, with content up to 1200; it is not the app's 480 column.

What still holds: tokens only, the type scale (Poster, Section and Statement are the landing's three sizes, and `text-pill` the statement's pills), ink means act and violet is the brand, green only in the "On track" chip that shows the app's reached state, 44 px targets, 4.5 to 1 for words, no emoji, the catalog rules for words, and no OneFin artwork: the phones, chips and tiles are CSS and SVG.

Motion, from MOTION.md, all inside `prefers-reduced-motion: no-preference` (with reduce, everything is at rest at once and nothing animates; an end to end test checks it):

| Id | What | How |
| --- | --- | --- |
| M1 | The bar settles in from just below its place (never through the top edge) | CSS on load, 0.9 s, `--spring-appear`, delay 0.15 |
| M2 | The promise, drawn from the first frame, tumbles into line word by word from its own tilts | CSS on load, 1.1 s, `--spring-pop`, 45 ms apart |
| M3 | Build your plan pops in | `--spring-pop`, delay 0.6 |
| M4, M5 | Today rises; its chips fly in from tilted offsets | `--spring-fly`, 2.35 s |
| M9 | Section headlines drop in word by word from alternate tilts; stickers pop in | In view (`inview.ts`), `--spring-pop`, 60 ms apart, once |
| M15 | The hero chips and the statement's tiles drift with the scroll | `animation-timeline: view()` |
| M16 | The statement fills in word by word, its pills popping as it fills | A named view timeline on the statement |
| M17 | Every card settles from its own side, tilt and depth, the phone inside turning the other way | `view()`, entry to cover 38 percent |
| M18 | "Plan. Log. Adjust." slides in from the left | `view()`, entry to cover 45 percent |
| Exit | The hero leaves at three paces; leads rise a beat after their headline; steps and points swing in from alternate sides; the closing mark spins in | `view()`, and in view once |
| Loops | The hero phone floats, chips and tiles bob, the check-in's rings breathe, icon tiles and stickers wiggle now and then | CSS, each on its own period, paused while its section is off screen (`live`) |
| Touch | Glass lights under the pointer and grows under a finger; tiles spin when touched; cards lean toward a mouse; link underlines draw in | Pointer and hover, springs |
| Theme ease | The bar, the floating action and the chips ease between their light and dark looks as the section under them changes | `--theme-ease` in `landing.css` |

Scroll-scrubbed motion runs where `animation-timeline` exists (Safari 26, Chrome); elsewhere those parts stay at rest. The phones' screens are regenerated with `LANDING_SHOTS=1 pnpm exec playwright test --project=shots` whenever the app's look changes; update `t.landing.alt` when their numbers do.
