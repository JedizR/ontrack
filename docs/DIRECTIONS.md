# The owner's directions

Everything the owner has asked for that still holds, gathered from every session from 11 to 23 November 2026, grouped by topic. Where a later call replaced an earlier one, only the later one is here. The owner's words in chat always win over this file. When you get a new standing direction, add it here in the same form.

## 1. What Ontrack is

- **A course product built like a real one.** Ontrack is the owner's project for a product management class. It is a proof of concept that will not launch publicly, but the owner wants it "closest to the real thing". Course deliverables (MoSCoW, RICE, user stories, revenue model) live in `/Users/admin/destination/assignment/`. Keep them lean, plain and human sounding, and only what the assignment asks for.
- **Claude owns the code and the product.** Decide scope and order yourself, record why in `docs/DECISIONS.md`, and tell the owner in one line. The owner's explicit calls win. Taste calls on a screen the owner is directing are theirs.
- **A phone browser app.** Safari on iPhone first, Chrome on Android too. Do not promote "Add to Home Screen" in the UI; everyone uses it in the browser. Nothing that needs a paid Apple developer account or the OS: no push notifications, no Apple Health, no Watch. Reminders are in-app only.
- **English only,** for the class.
- **Spend nothing** without asking: no paid plan, trial or billing change. Gemini runs on the owner's Google Cloud credits (a 150 baht prepayment is on the billing account).
- **Hard limits** (from the first run's rules, still in force): never change billing or plans, never change account security, never send email or messages to anyone, never make the repo public or publish the Google consent screen, never delete, rename or reconfigure existing infrastructure. Do not route around a refused permission (merging before the owner says so, reading `.env.local`, downloading private storage with the server key); ask the owner to supply what is needed.

## 2. Product

- **Thai food is the main reason the app exists** (17 Nov). Least friction and the most accurate analysis. Every protein variant of a dish is its own row (pad kra pao with chicken, pork, beef, duck, shrimp, and with rice, and with rice and egg). Oil is counted by default, because most Thai cooking uses it. Nutrition comes from the food table; the AI names the dish and estimates the portion, and calibrates, never invents.
- **Remembered corrections.** When a user fixes a food's nutrition, the same food later uses their numbers. Fixing a result should be by typing what is wrong and letting the AI recalculate, not by editing a name while the numbers stay.
- **Supplements are one tap.** Whey sits at the very top of the plus. Creatine is not a preset there (25 Nov): it is added and logged from the plus beside it. Brands differ, so setup encourages the user to set it from their own tub (per scoop), with a default.
- **The plus is camera first** (18 Nov). One in-app camera: Meal and Label, and a barcode is read in any mode. No guide frames; a small chip says barcodes are read. Typing a barcode number only when the camera cannot open.
- **The camera works like the iPhone's** (25 Nov): a macro toggle for phones whose main camera cannot focus close (the owner's iPhone 14 Pro), zoom chips with a slider for phones without macro, a white shutter, and a white light button with a black line icon.
- **Speaking is multilingual** (25 Nov): the mic in Describe takes Thai, English or both, not English only.
- **Recent shows five, then all** (25 Nov): a way under Recent to every meal ever logged.
- **Pills hug their content** (25 Nov): the Whey chip is as wide as its name, not stretched.
- **Training reads as a habit grid** (25 Nov; centred on its squares, the dates to their left, 27 Nov): Progress's Train chart is four weeks of seven rounded squares, Sunday to Saturday, rows named by their Sunday ("1 NOV"), green with a workout, grey without, an outline on a rest day, the days to come faint, and as tall as the other charts. The other charts stay as they are.
- **The week starts on Sunday** on Train (25 Nov): Your week runs Sunday to Saturday.
- **The business is priced on a Chinese model** (25 Nov): the financial model and the deck use Qwen3.8-Omni-Flash's price for the AI, not Gemini's. The app still runs on Gemini until the switch is built and tested.
- **Training is marked, not logged** (18 Nov). No set by set logging and no workout timer: every session, lifting or cardio, is marked Done. The focus is calorie tracking. Editing the schedule must be easy and update the calorie target at once. Cardio has a setup (machine, speed, incline, time). The owner's own program: a 4 day upper and lower split, 60 minutes, then 30 minutes of cardio.
- **Today's figure is calories eaten,** not left (17 Nov). Food suggestions are data driven: your own logged foods first, then the table.
- **Progress always shows its chart;** with no data it says so in the middle of the chart. Keep cards short.
- **Goal weight is its own onboarding step,** with a recommended range that is safe for the height and current weight.
- **Social:** friends by request, a profile with an optional program, and opt-in meal photos on a map at where the photo was taken (never live location), like Instagram's map and Strava.
- **Friends' requests that shipped:** a gain weight goal for skinny people who want muscle, strength and cardio planned together, training analysis and suggestions.
- **More useful AI is welcome:** the week recap, Ask about your week, Adjust with AI for the program from the user's request. The AI explains and proposes; the engine decides every number.
- **No in-app words name the AI provider** (22 Nov): a provider change must not touch the app. Only the privacy page says where photos go.
- **On track is loose and directional** (22 Nov): "a missed day is just a day". A day off target in the goal's own direction still counts; nothing resets.
- **The goal can change anywhere it shows** (22 Nov): Progress and Profile open the goal, people move from losing fat to building muscle.
- **A rest day can take an activity** (22 Nov), for that day only; the program and next week never change.
- **Freemium** (22 Nov): a fair free tier (all tracking, a few AI logs a day), Pro for unlimited AI and the AI features, the plans shown after Save the plan and at a limit, prices in round baht from the pricing model, Stripe used properly with a 0 THB bill while it is a preview. **Pro is 149 baht a month and 990 a year** (25 Nov): Thai users are cost-sensitive, and 199 reads as a streaming plan.
- **Well thought, one-hand UX is the bar** (23 Nov): the owner loved the "Any activity today?" drawer (type tiles with icons, quick minutes, effort, the kcal it adds over the action) and wants that quality everywhere, starting with Train's Add a session. Keep checking animations, words (not too many, never confusing or redundant) and cards on every page.
- **Both means both on each day** (27 Nov): "4 days a week, both" is 4 training days, each a lift then cardio after it, not 2 and 2.
- **The free plan is usable, with real AI** (27 Nov): 5 AI meal logs a day and 10 AI answers a month (Ask Ontrack and Adjust with AI together), generous in general; Pro takes the limits off.
- **Ask Ontrack is a personal advisor** (27 Nov): it knows everything about the user, stays on their food, weight and training (no jailbreaks, nothing off topic), and answers super concisely.
- **Users fill in missing barcodes** (27 Nov): a barcode we do not know opens a drawer asking for a label photo, and what they confirm goes into the shared database so the next scan finds it.
- **Two styles** (21 Nov): Tray is the default, Bento is the flat option, and the user picks on Today's one-time card or in Profile, Settings. The landing page is always Tray with its full glass.

## 3. Onboarding

- Tremendously engaging and easy, personalising the app with the least effort. Fun and interactive, in the landing page's look.
- Back is a small button to the left of Continue, at the bottom.
- Never auto-advance: a choice selects, Continue moves on. Tapping a disabled Continue shakes the choices a little. The disabled Continue must look disabled and still look good on the glass.
- The "building your plan" wait and the calorie count-up always play, even with Reduce motion on.
- Metric is selected by default.
- The first goal reads "Lose weight", not "Lose fat" (27 Nov).
- Your plan keeps only the target, the pace, the goal weight and "Same target every day" (27 Nov): no Your training, no How your target is calculated, no Body fat.
- Use the fewest words that carry the message; tuck what is not essential behind a chevron.

## 4. Look

- **Identity from OneFin** (https://creative-hands-463340.framer.app/), through the owner's curated picks in `/Users/admin/destination/ontrack-design/onefin/owner-picks/`, not the whole template. Clean and flat: no 3D, bevel or glow on buttons. Glass and gradients only on some elements.
- **Brand colours** `#381ac9` and `#bebeff`, plus the wider palette for occasional use.
- **Gradients** are made on https://photogradient.com/ (or `scripts/gradients.sh`), each one unique, grainy, calm and fresh: salmon and pink as the main colours, white and light purple as support, only a little blue, never dark colours. Dark mode uses the same light gradients. One gradient per screen, except Progress's two hero boxes. Settings never has a gradient.
- **Glass** follows iOS 26 Liquid Glass and callstack/liquid-glass. The Add sheet's glass is the one that rendered right on the iPhone and is the material everywhere. The dock is glass; the header becomes the landing's glass capsule when scrolled, and its title moves in to 24 px.
- **Tray layout:** each page leads with one white card holding small grey boxes, compact, so the main content fits one screen height. Bento keeps the grouping without the shell.
- **No fades** at the top or bottom of a page, header or sheet (18 Nov). In Tray, no drop shadow on the header capsule, the dock or its plus either (25 Nov): the glass keeps only its rim. The week strip keeps its soft edge before today, except when yesterday is picked (19 Nov). In Safari, no coloured band above or below the page.
- **Corners:** one consistent system, nested corners concentric.
- **Feel:** the owner judges by feel on the iPhone (13 Nov: "UI 70%, UX 30%"). Every in-page change gets a small, good transition; numbers count; Done spreads ink from the button with a green burst, and Undo plays it back; light and dark changes ease.
- **Selected states are obvious,** in dark mode too.
- **Toasts** (22 and 23 Nov): small pills that hug their words, in the theme's colours; in Tray they use the dock's glass.
- **The landing page may be louder than the app** (22 Nov): more wow motion for the first impression; the app itself stays precise.
- **Small calls still in force:** the week strip's chips show one letter, the big day title three letters; the weigh-in action's icon sits above its text; the sheet colour runs behind the keyboard, with no gap.
- **No emoji anywhere.** Use a real icon.
- **The app icon is frozen** as `design/brand/app-icon.svg`; the wordmark uses the mark as its O.

## 5. Words

- The main action and headline words are chosen to get the tap, with the fewest words, never through guilt or false urgency. No streaks, rankings or shaming.

## 6. The landing page

- Sources cards turn over (27 Nov): a tap flips a card horizontally to a short summary of what the source found, centred; another tap flips it back.
- Glass throughout, the hero's calm sky gradient (keep it), the check-in section's gradient (keep it).
- Every phone is the whole iPhone 16 at its real 71.6 by 147.6 mm ratio. Demo screens are real app screens (`landing-shots.spec.ts`), Tray, made from the owner's own account and real food photos.
- The ink Sign in (black, white words). The bar's parent has 36 px side padding; the bar's glass appears on scroll.
- The footer (14 Nov, the L5 session): "Keep your calories" over the Ontrack wordmark, solid and centred at equal width, then a minimal footer: the wellness line ("general wellness guidance, not medical advice") centred, mail, privacy and terms with faint dividers, the year at the far left and the version at the far right. The owner tried a "You are what you eat" quote there and removed it; no moving lines, numbers or blob.

## 7. How the owner wants to work

- **Decks for the class** (25 Nov): black cards on a white background, the app's type, concise. Words read as written by people (news and pitch-deck sentence patterns, no AI tics such as "it's not X, it's Y"); the teacher marks down AI-written work. Build slides around the class's own frameworks.

- **Local first.** Work on one branch, show it on localhost (the owner's own `pnpm dev --host` on :5173 serves their iPhone), no long CI while iterating. Deploy only when the owner says so. "If the tests fully pass, deploy; otherwise fix and try again."
- **The gate is two phrases:** "let me see it on localhost", then "approved, deploy". If "wait" or a new ask follows "deploy", stop at once and take the new ask first.
- **Small means small.** "A bit" or "half of last time" is a small step. Every overshoot was rolled back (the On track chip, outlined footer words, a burst too big and too colourful, Progress as loose boxes). After a rollback, try half the move.
- **What the owner praised,** to build on: Today's top card, OneFin's Withdraw button and invoice glass card, the Add sheet redesign, Ask about your week, Adjust with AI. Their 14 curated OneFin screenshots outrank the rest of the template: "extract from these, improvise the rest in the same style".
- **Reviewing your own work:** treat it as a stranger's. Compare against production (a `main` worktree on its own port with the same seeded data), give a better, worse or equal table per page and a keep, drop or revisit list, then wait.
- **Keep background tasks few and bounded.** The owner reads the task list.
- **"Write every detail into the PR"** means the PR body is the session record: the owner's instructions, likes, dislikes, rejected suggestions, mistakes, checks and risks (PR #50 is the model).
- **"Pause"** means: commit the work in progress on its branch, write the resume order into `docs/STATE.md`, stop background jobs and remove worktrees.
- **Experiments stay on their own branch** until the owner says merge.
- **Build exactly what the owner describes.** Suggest extras, ask, do not build them unasked.
- **Check it yourself before handing over:** look at the screens at 390 by 844, 390 by 664 or 692 (Safari's toolbars), and 375 by 548 or 667, and fix what looks wrong.
- **Feedback screenshots with red notes:** read every note in order and act on each.
- **Reports are short lists** the owner can mark keep or drop.
- **Tokens matter, quality matters more:** rework costs more than care.
- **Sonnet at xhigh effort** is a good subagent when the direction is exact; its suggestions are input, not decisions.
