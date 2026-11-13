# For the owner

Everything that needs you, in one place. Newest first within each section.

## Needs your action

Each entry: what is blocked, what Claude tried, the exact steps for you, and what to tell Claude afterwards.

### B1: a contact address for Open Food Facts (optional)

- Open Food Facts asks apps to name themselves with a contact email. Ontrack sends `X-User-Agent: Ontrack/<version> (https://ontrack-black.vercel.app)` and no email, because Claude does not put your address in requests to outside services. If you want one added, tell Claude: "Add <address> to the Open Food Facts user agent".

### N1: a Thai food composition table Ontrack may use (optional now)

- **Update, 12 November 2026:** the owner decided Ontrack is a class proof of concept that will not launch publicly, so N3 takes Thai values from Thai pages and the owner's finds instead. N3 now reads 115 foods from the INMU database itself (the owner's extract and INMU's own pages; `docs/DECISIONS.md`, N3). The email below is needed only if Ontrack is ever made public.

- **Blocked:** nutrition from a Thai source. N1 ships 138 Thai foods from SG FoodID (Singapore) and USDA FNDDS, but dishes those tables lack stay model estimates: khao soi, massaman, red and panang curry, beef green curry, tom kha, som tam, larb, nam tok, kai yang, moo ping, pad see ew, khao kha moo and most Thai desserts (`docs/EVAL-NOTES.md`, N1).
- **Tried:** the three Thai sources and their terms (`docs/DECISIONS.md`, N1). The INMU Thai Food Composition Database (online version 3, August 2025, 313 dishes) lets non-commercial users use the data, but asks that reproducing or distributing it be applied for by email, and it has no downloadable file. The Department of Health's 2018 table is a scanned PDF whose website forbids distribution without permission. The ASEAN database has 29 Thai dishes under INMU's terms. Asking permission means sending email, which Claude may not do.
- **Your steps:** email the Institute of Nutrition, Mahidol University, at `kunchit.jud@mahidol.ac.th` (copy `piyanut.sri@mahidol.ac.th`). Ask for (1) permission to include the per 100 g energy, protein, fat, carbohydrate and fibre of the Thai FCD's mixed dishes (group T, "Mixed foods: main dishes, one-plate dishes, desserts, snacks") in Ontrack, a free calorie tracker, with "Thai Food Composition Database, INMU, Mahidol University" cited under each food, and (2) the data as a CSV or Excel file. If they send a file, put it outside the repository.
- **Then tell Claude:** "INMU allows Ontrack to use the Thai FCD; the file is at <path>" (Claude adds it as a fourth table in `pnpm foods:build`, with the licence in `docs/DECISIONS.md`), or "INMU said no".

## Needs your eyes

Each entry: what to look at (URL or screenshot paths), what to look for, and which milestone it belongs to.

### L1: scroll the landing page on your iPhone in Safari

- **Where:** the pull request's Vercel preview in Safari on the iPhone, signed out (a private tab), and on a Mac browser. Screenshots: `screenshots/landing/` after `pnpm screenshots -- --grep landing` (each view as you scroll, every phone size, light and dark, and `desktop`), and the scroll-through in the pull request.
- **Look for:** whether the page reads as OneFin beside your picks (stickers, condensed headlines, pills, tiles, the dark sections, the footer); whether the scroll motion feels smooth in Safari, above all the statement filling in word by word and the cards settling (Playwright's WebKit cannot show those; Safari 26 runs them); whether Build your plan floating at the bottom helps or crowds; whether the eight screens are the right ones to show; the words, and whether the hero says enough to tap.
- **Then tell Claude:** what to change, or "keep L1 as is".

### O1: hand the phone to someone who has never seen Ontrack, and time them

- **Where:** the pull request's Vercel preview in Safari on the iPhone, signed out (a private tab), or `pnpm dev` on the Mac against the mock (code 123456). Screenshots of every step in `screenshots/onboarding/` after `pnpm screenshots -- --grep onboarding` (light and dark, 390, SE and Pro Max), plus `screenshots/today/first-day-*`, `screenshots/shell/train-*`; a few on branch `pr-assets`, folder `o1/`.
- **Time five people who have never seen it,** from the tap on "Build your plan" to the tap on "Save this plan", without help. The research's targets: median under 75 seconds, nobody over 120, four of five finish alone. If the median is under 60 seconds, tell Claude and "About a minute." can go under Build your plan (the owner's rule; it does not ship on a model).
- **Look for:** whether the number card in the footer reads as the plan forming (it grows from daily movement on, and Your plan counts up from it); whether the 240 ms before a screen slides feels quick or sluggish on the phone; the pace control on Your plan, and the faster gain pace with "Being checked"; Today's Getting started card, Train's "Suggested for your week", and the Add sheet's shake line.
- **Decide:** whether experience should also be asked of people losing or maintaining (it changes no target for them, but Train's set advice and the suggestion read it); whether "Getting started" should last one day or two.
- **Decided for you:** the O1 list in `docs/DECISIONS.md`, notably training days before "What do you train?", the defaults and their costs, the faster pace's wording, the main action labels app-wide, and the supplement setup in serving terms with milk in ml.

### S1a: who can see what, before friends use it

- **Where:** the table "What others can see" in `docs/DECISIONS.md`, section S1a. No screen yet; S1b builds them.
- **What to look for:** whether you agree that anyone signed in can find a profile (handle, name, photo) by its handle, that friends see a shared meal's own calories and macros with the place rounded to about 100 m, and that a former friend keeps what they could already reach (a photo they saw stays fetchable with their old sign-in for up to an hour, or longer through a link they made while friends; a Supabase limit). Say "S1 privacy: change ..." to Claude if any of it should differ; otherwise nothing to do.

### T1b: hybrid training and the training card, with the friends who asked

- **Where:** the pull request's Vercel preview in Safari on the iPhone. Train, Change program, Full body and cardio 3 days (or Upper lower and cardio 5 days); then the Lifting and cardio card at the bottom of Train. Progress, the Training card after Consistency (it fills as you mark sessions done on Today). Screenshots in the pull request (branch `pr-assets`, folder `t1/`); every state in `screenshots/train/hybrid*`, `screenshots/train/templates-hybrid*`, `screenshots/progress/training*` after `pnpm screenshots`.
- **Look for:** whether the three points read as advice the friends would follow (lift first, 6 hours apart if they can, cycle on leg days), and whether naming the days in every sentence is too much; whether the training card's numbers match what they did (a session counts only once marked done); whether strength and cardio as weekly averages are clearer than week by week.
- **Then tell Claude:** what the friends said, or "keep T1 as is".

### T1a: the faster gain pace ships provisional (optional)

- **Where:** `docs/DECISIONS.md` under T1a, `docs/SCIENCE.md` section 6 and vectors H and I, the S7 and S20 to S25 rows in `docs/SOURCES.md`. Nothing new to see in the app until T1b: the pace is left out of onboarding until it has its words and label; the two hybrid templates already show in Train, Change program.
- **Look for:** whether you agree to ship a pace no source recommends. No paper gives a rate above 0.5 percent a week, so 0.75 is labelled Being checked; the 20 percent surplus cap binds first for most lean people (about 75 kcal a day over the standard pace for the hardgainer). Who may choose it: BMI under 20 and under three years of lifting, an Ontrack choice; once chosen it holds as weight rises until changed. Also: 6 hours between lifting and cardio (the more cautious of 6 and 3 hours), and cycling rather than running on leg days.
- **Then tell Claude:** "Keep the faster pace as is", or "drop it", or a different BMI limit.

### D2: the refined look on your iPhone

- **Where:** the pull request's Vercel preview in Safari on the iPhone, light and dark (Settings, Display). Before and after screenshots of Today, an onboarding step, the Add sheet, a sheet and the dock are in the pull request (branch `pr-assets`, folder `d2/`); every screen is in `screenshots/` after `pnpm screenshots`.
- **Look for:** the ink pill (white on dark) as the one action on each screen, with its soft drop and a visible press; violet only as the brand (tiles, links, the promise's key words, progress, the Photo card); Today's hero as a white card with the haze panel and three grey macro tiles; the "Training day" glass chip and the dock's glass, whose blur only Safari draws (Playwright does not); the ONTRACK wordmark on Welcome.
- **Decide:** whether the stepper's ink keys are welcome or too heavy beside the ink Save (grey keys are one line to change), and whether close, back, more and again should be ink squares too (the plan says icon buttons are ink; Claude kept these quiet so a sheet does not fill with black squares); whether Photo should stay the violet featured card or become a white card; whether Train's summary should also lead with a haze hero (it does not: at most one, and Train has none).
- **Decided for you:** the D2 list in `docs/DECISIONS.md`, notably the white pill on dark, violet progress, the Hero number in Geist, and the header losing its glass.

### N3: Thai nutrient facts you find, and five dishes you eat often

- **Where:** the pull request's Vercel preview in Safari on the iPhone, or `pnpm dev` on the Mac (code 123456). Search a Thai dish in English or Thai script (ข้าวซอย, มัสมั่น, ส้มตำ, ขาหมู, ไก่ย่าง); the portion step names the Thai Food Composition Database and links to the dish's page on INMU's site.
- **Judge five dishes you eat often:** do the calories for your usual plate look right? The values are INMU's per 100 g; the plate and bowl weights are Claude's guesses (a plate about 300 to 350 g, a noodle soup 450 g, a curry bowl 250 g). Say if your plate is far off, or correct it once with Correct and Ontrack remembers it.
- **Send Thai nutrient facts you find** for dishes still missing: larb moo, nam tok, moo ping, hor mok, pad pak boong, kai jeow, kaeng jued and the drinks (`docs/EVAL-NOTES.md`, N3). A page link or a photo of the table is enough; Claude puts it in `data/thai/owner/` with where it came from, and the build reads it.
- **Decide:** whether white rice should stay on INMU's cooked rice (136 kcal in 100 g, total carbohydrate) rather than USDA's (130); whether sticky rice at INMU's 232 kcal in 100 g (USDA had 97, a much wetter rice) matches the bag you buy.
- **Decided for you:** the N3 list in `docs/DECISIONS.md`, notably using INMU's values for this class project, the owner's file first and INMU's pages for the rest, and the rows left out.

### B1: scan ten packaged foods, and set your whey from the tub

- **Where:** the pull request's Vercel preview (https, so the camera can open) in Safari on the iPhone, and in Chrome on an Android phone if you have one. Screenshots: `screenshots/scan/` after `pnpm screenshots -- --grep scan` (the Add sheet, the camera, typing with wrong digits and with the camera denied, finding, a product from Open Food Facts and its credit, a new product, reading, the Label step and its error, a product from its label, Today with it, a photo that is not a label, offline; light and dark, 390, SE and Pro Max), and `screenshots/supplements/source-whey-*`, `amount-typical-*`, `add-typical-*`. A few are on branch `pr-assets`, folder `b1/`.
- **Scan ten packaged foods** at home or in a 7-Eleven: the plus, Scan, hold the pack up. Most Thai products should be in Open Food Facts; for one that is not, Photograph the label and check the numbers it read. Scan one of them again with the phone offline.
- **Look for:** how fast the camera opens and reads on the iPhone (the first open loads about 400 KB); Safari's camera prompt (it may ask again on each visit); whether the framing guide fits real barcodes; the light, which shows only where the camera has one (likely not in Safari); serving chips and the amount in ml for drinks; the source label (Open Food Facts, Label, Yours) on Today.
- **Set your whey from the tub:** Supplements, Add a supplement, Whey protein, Scan the tub (or Photograph the label). Check the scoop and the numbers per scoop against the tub. A supplement on "Use typical values for now" shows Typical with "Set it from your tub".
- **Decide:** whether Scan should also be the violet main tile instead of Photo; whether a lookup you do not log should still be kept; whether products need a "Use default values" like foods.
- **Also seen by the design critic, from before B1 (for M9):** on the SE, Today's training card caption "60 min. Adds 240 kcal" wraps to a second line (`screenshots/scan/today-light-se.png`).

### N2: your own whey from the tub, and the morning shake for a few days

- **Where:** the pull request's Vercel preview in Safari on the iPhone, or `pnpm dev` on the Mac against the mock (code 123456). Screenshots: `screenshots/supplements/` after `pnpm screenshots -- --grep supplements` (the entry, the kinds, the label from USDA, with no calories and with the error, the Add sheet with supplements, the amount with milk, taken, an entry in edit mode, the milk not loaded, Today with a shake and creatine taken; light and dark, 390, SE and Pro Max), and `screenshots/fonts/iphone-se-xl/logging/supplement-*.png` for the largest text. A few are on branch `pr-assets`, folder `n2/`.
- **Set up your whey from the tub:** the plus, Supplements, Whey protein. Type the scoop and the numbers from your label, and the scoops you take. Then log your morning shake for a few days: the plus, Whey protein, Add. Try milk once, and a half scoop more or less. If you take creatine, set it up and log it: it shows as a chip under Taken, with no calories.
- **Look for:** three taps for the usual shake; calories and protein on Today matching your label times your scoops; the Add sheet starting at your last amount and mix; editing a shake from Today (change the scoops, Save changes) and deleting it with Undo.
- **Decide:** whether asking "Scoops you take" in the setup is welcome; (decided after N2, built in O1: the setup takes the label's serving and the scoops in it); whether the five milks are the right ones (no oat milk in the table); whether correcting an old entry should also change where the next shake starts (it does not, today).
- **Decided for you:** the N2 list in `docs/DECISIONS.md`, notably plant protein from USDA's soy powder, casein, gainer and creatine starting from the label, and creatine taken not counting toward a complete day.

### N1: five Thai meals you eat often, and Yours

- **Where:** the pull request's Vercel preview in Safari on the iPhone, or `pnpm dev` on the Mac against the mock (code 123456; photos are answered by fixtures there, so use Search). Screenshots: `screenshots/thai/` after `pnpm screenshots -- --grep thai` (Thai script search, a Thai dish's portion step with its citation, the Review of a Thai dish, Correct open, Yours in Review and in Search; light and dark, 390, SE and Pro Max), and `screenshots/fonts/*-xl/logging/review-correct.png` for the largest text. A few are on branch `pr-assets`, folder `n1/`.
- **Log five Thai meals you eat often**, by photo and by Search, typing Thai script once (ข้าวมันไก่, กะเพรา, ก๋วยเตี๋ยว). Judge the numbers: do the calories for a plate of khao man kai, pad kra pao with rice and egg, boat noodles or pad thai look right for the plates you buy? Portions are drafted (a plate about 350 g, a noodle soup about 450 g); say if your usual plate is far off.
- **Then try Yours:** open an item, Correct, change the calories, add the meal. Log the same food again (photo or Search): it reads Yours with your number. Open it and tap Use default values: the table's number comes back. On a second device signed in to the same account, the remembered number arrives after a sync.
- **Decide:** whether Thai-Chinese dishes measured in Singapore (khao man kai, khao mu daeng, jok) are close enough to yours; and whether "Use default values" should also be offered in Today's Meal sheet for a food Ontrack has no table entry for (it is not, today).
- **Decided for you:** the N1 list in `docs/DECISIONS.md`, notably SG FoodID and FNDDS as the table while no Thai source is licensed, the names and portions, keeping `est_per_100g`, remembering on save rather than on each change, and step 0.5 for macros.

### M8: each seeded check-in, and Progress, on your iPhone

- **Where:** `pnpm dev` on the Mac (with `--host` to open it on the iPhone in Safari), mock backend. Sign in with the email `raise@seed.test`, then `lower@seed.test`, `on_track@seed.test`, `adherence@seed.test` and `need_data@seed.test`, code 123456 for each (sign out between them). Each is four weeks of meals, sessions and weigh-ins on plan A (the hardgainer) with the check-in due today. Screenshots: `screenshots/progress/` after `pnpm screenshots -- --grep progress` (Today's card, the three steps, Progress from the top, History, an adherence step, a stored check-in; light and dark, 390, SE and Pro Max), `screenshots/stress/*/progress/` and `screenshots/fonts/*-xl/progress/`. A few are on branch `pr-assets`, folder `m8/`.
- **Walk each check-in:** Today's card, Open, then Next twice. Does the sentence on "What it means" match what the numbers on "Your last three weeks" show? `raise` is vector F (gaining 0.1 percent a week against 0.5 while eating 2,300 against 2,357: raise by 100 to 2,560 and 2,320); `adherence` is vector G (eating 87 percent of the target: no change, "You averaged 310 under it"); `lower` gains about 0.8 percent a week; `on_track` about 0.5; `need_data` has 6 weigh-ins in three weeks. Try Use the new target on one and Keep on another, then Progress, Check-ins, and open the stored one.
- **Look for on Progress:** the weight chart (dots are weigh-ins, the line the trend, the grey wedge the target rate give or take what the check-in still calls on track), "0.1 percent a week. Target 0.5", maintenance measured against the formula, the weekly intake bars with the target line, the consistency dots, and History opening a past day in Today.
- **Decide:** the check-in card also shows with too few weigh-ins and then says so (PRD F9 says it appears only with enough data); a program change does not restart the two weeks to the next check-in.
- **Decided for you:** the M8 list in `docs/DECISIONS.md`, notably the plan a check-in makes carrying the week's sessions, the band's width, weeks as the seven days ending today, step 3 named "Your next target", and every outcome stored when the sheet is finished.

### D1: your OneFin template licence

- **Question:** does your licence for the OneFin template (N!nh Studio, single use) cover reusing its artwork in Ontrack: the 3D coins and stars, the phone mockups, the app screen images and videos?
- **Until you say so, none of it ships.** D1 adopted the identity only (colour, type, components, effects, motion); every decoration in the app is drawn in CSS or SVG, and OneFin's logo and wordmark are not used. The artwork is in `/Users/admin/destination/ontrack-design/onefin/framer/assets/` and `onefin/site/assets/` for reference.
- **Then tell Claude:** "The licence covers the OneFin artwork" (L1's landing page could use it), or "Keep it out".

### D1: the new look and the wheels on your iPhone, in Safari

- **Where:** the pull request's Vercel preview in Safari on the iPhone (not added to the home screen), `/` for the app and `/gallery` for every component; or `pnpm dev` on the Mac against the mock (code 123456). Screenshots: branch `pr-assets`, folder `d1/` (before, after and the OneFin reference for Today, an onboarding wheel step, Add and Search, Review, Weigh in and Train), and after `pnpm screenshots` every screen in `screenshots/` (light and dark at 390 by 664, the SE at 375 by 548 and the Pro Max at 430 by 739; `screenshots/xl/` for the largest text).
- **Look for, by thumb:** the wheels. Birth year (step 4), height and weight side by side (step 5), Weigh in from Today's card, and Your plan's Body fat and Goal weight. Flick a column: does it glide and land on a row, and is the value right after it settles? Tap a row above or below the band: it should come to the band. Tap the row on the band: a field opens with the number pad; type and press Done. Steppers (grams in Search and Review, minutes and sets in Train): tap the number and type 125. Quick add: does the number pad come up for calories when the sheet opens?
- **Look for, by eye:** the violet 3D buttons and their press, the condensed capital titles, the lavender hero, the dock's glass and the sheet's blurred backdrop (the test browser draws no blur), fonts that load without a flash on a second visit, and both themes. With Safari's toolbars showing and collapsed: is Continue on screen at first paint in onboarding, does the dock clear Safari's bar, and do sheets sit above it? On an SE, if you have one: check that nothing is cut off; the tests assume Safari gives it 375 by 548.
- **Decide:** Welcome's drawn decoration (the track on a tilted glass tile and an "On track" chip), and the green fill being 1.8 to 1 on white (the words carry the state; a darker green would pass but is less OneFin).
- **Decided for you:** the D1 list in `docs/DECISIONS.md`, notably the 16 px gutter, radius 20 on the large button rather than a capsule, darker green for "On track" words, one field for typing a whole wheel value, and Lucide icons kept.

### M7: your real program on your iPhone

- **Where:** the pull request's Vercel preview or, once merged, `https://ontrack-black.vercel.app`, installed; or `pnpm dev` on the Mac against the mock (code 123456). Screenshots: `screenshots/train/` after `pnpm screenshots -- --grep train` (no exercises, the Session sheet with an exercise open, the picker, recommendations with a source, Templates and the confirm, a template's analysis, no program; light and dark, 390, SE and Pro Max), and `screenshots/stress/*/training/` and `screenshots/fonts/*-xl/training/` for every device and the largest text. A few are on branch `pr-assets`, folder `m7/`.
- **Enter your real program:** Train, then each day: tap Rest to add a session, or a session to edit it. Name, day, type, minutes, intensity, then Add exercise for each lift with its sets and reps. Or start from Change program and edit the template.
- **Look for:** are the recommendations right for you? Each names a muscle or the week and says what to add or remove; "Why" shows the study. Does the muscle balance match how you think about your split (a set counts 1 for each main muscle and 0.5 for each helper)? Does "Adds N kcal a day on average" look plausible? Drag a session by its handle (the six dots) to another day: on the phone only, the feel of the drag, and whether you can reach Sunday from Monday on a small screen without the list scrolling (the Day chips in the Session sheet do the same job). After any change Today keeps today's target, and tomorrow follows the new program.
- **Decide:** the Session sheet saves with a Save button instead of saving every tap; intensity is three chips (as in onboarding) instead of a segmented control.
- **Decided for you:** the M7 list in `docs/DECISIONS.md`, notably plans keeping the week's sessions so past days never change, the week as one row per session with a weekday tile, templates as sections in the sheet, and a new exercise starting at 3 sets of 8 to 12.

### M6: photo logging on your iPhone

- **Where:** the pull request's Vercel preview once sign in works there (Gemini is set up: `gemini-3.6-flash` with the development key); or `pnpm dev:live` on the Mac, which uses the key in `~/.config/ontrack/gemini-api-key`; or `pnpm dev` against the mock (code 123456), where every photo is answered by fixtures. Screenshots: `screenshots/photo/` after `pnpm screenshots -- --grep photo` (the first photo notice, the review loading and loaded, the oil control, Today with the thumbnail, the Meal sheet, not food, the daily limit, Describe; light and dark, 390, SE and Pro Max), `screenshots/today/add-*` for the Add sheet's four tiles, and `screenshots/stress/*/logging/review.png` and `screenshots/fonts/*-xl/logging/review.png` for every device and the largest text.
- **Your ten meals:** photograph ten real meals over two days, at least five of them Thai, put them in a folder outside the repository and tell Claude "The meal photos are in <folder>". Claude runs `pnpm eval:vision` on them and adds the results to `docs/EVAL-NOTES.md` (this run used ten Wikimedia Commons photos instead). The development key allows only 20 analyses a day per model on the free tier, so production needs the billed key (M9).
- **Look for:** in the installed app, the plus, then Photo: the notice once, then the camera opens straight away (not a menu). Does the review come back in under 8 seconds on 4G? Are the items, grams and the Database or Estimate labels believable for Thai dishes? Try "Cooked with oil?", the stepper and the portion chips, Save meal, then the thumbnail on Today. Turn on airplane mode and take a photo: the message, then Try again once back online. On the phone only: the camera handoff, a portrait photo's orientation, the review photo's crop, and how soft the 320 px thumbnail looks at the top of the Meal sheet.
- **Decide:** the Review photo is cropped to 4 by 3 so the items show above the fold; at the largest text on the SE the photo still fills most of the sheet. Options: accept, or a shorter photo on small phones. The design critic also noted that the undo toast can sit over a sheet opened within five seconds of logging (as in M5); left as it is.
- **Decided for you:** the M6 list in `docs/DECISIONS.md`, notably `gemini-3.6-flash` with minimal thinking (3.8 Flash was overloaded and refuses minimal; `docs/EVAL-NOTES.md`), the quota counting on the server's UTC day (it resets at 07:00 in Thailand), Add by hand keeping the photo, the limit error offering only Add by hand, and the alcohol limit of the calorie check.

### M5: a full day of logging on your iPhone

- **Where:** the pull request's Vercel preview on the iPhone once sign in works on the live backend (the two M3 entries above); until then `pnpm dev` on the Mac against the mock (code 123456). Screenshots: `screenshots/today/` after `pnpm screenshots -- --grep today` (typical, past day, empty day, every logging sheet, light and dark, 390, SE and Pro Max), and `screenshots/stress/*/logging/` and `screenshots/fonts/*-xl/logging/` for every device and the largest text.
- **Look for:** use it for a full day with Search and Quick add only, and note every moment of friction. Logging a recent meal is the plus, then the plus on its row. Swipe a meal left to delete it and try Undo. Tap the hero for How it is calculated. Mark the training session Done, then Undo, then Skip today from the row's menu: the target drops to the rest day number. Pick yesterday in the week strip and log something there. On the phone only: the swipe feel, the keyboard over the search field, the time field in the Meal sheet.
- **Decide:** with three meals the third sits under the dock at 390 by 844, as in the M1 reference (`/gallery/today`), so F3's "fits without scrolling" is not met. Options: accept, or tighten the hero and week strip.
- **Decided for you:** the M5 list in `docs/DECISIONS.md`, notably the week strip showing the last seven days instead of Monday to Sunday, the Add sheet with two tiles until photo logging, Skip today behind a menu button instead of a long press, and the food list (512 USDA foods, names and portions drafted by Claude).

### M4: onboarding on your iPhone, twice

- **Where:** the pull request's Vercel preview in Safari on the iPhone for the install guide, then the installed app. Saving the plan needs sign in, so the last step waits for the two M3 entries above; until then `pnpm dev` on the Mac runs the whole flow against the mock (code 123456). Screenshots: `screenshots/onboarding/` after `pnpm screenshots -- --grep onboarding` (every step, light and dark, 390, SE and Pro Max), and `screenshots/stress/*/onboarding/` for every device and text size.
- **Look for:** run it once as yourself (Build muscle) and once as someone losing weight. In Safari: do the install steps match the menu on your iOS version (the button beside the address bar, Share, View More, Add to Home Screen)? Time each run with a stopwatch from Get started to Save my plan: under 90 seconds. The keypad opens by itself for the birth year and for height then weight; is that welcome or abrupt? Do the numbers on Your plan look right for you, and does tapping a line of "How this was calculated" show its source? Close the app on any step and reopen: it should come back to the same step. Then Save my plan, sign in, and land on Today.
- **Decided for you:** the M4 list in `docs/DECISIONS.md`, notably the eating disorder screen's main action being Leave setup, the typed week's weekdays, the training day hero being an average training day, and no Privacy and Terms line until M9.

### M3: sign in and sync on your iPhone

- **Where:** after both entries above are done, the pull request's Vercel preview or `https://ontrack-black.vercel.app` once merged, installed to the home screen. Until then, `pnpm dev` on the Mac shows the same flow against the mock (code 123456). Screenshots: `screenshots/signin/`, `screenshots/account/`, `screenshots/today/session-expired-*` and `bringing-*` after `pnpm screenshots`.
- **Look for:** in the installed app: tap the avatar, Continue with Google, and check it comes back into the app (not Safari) signed in. Close the app fully and reopen: still signed in. Avatar, Sign out. Then sign in with an email code: the code arrives, iOS offers it above the keyboard, and it signs in. Report anything that opens Safari or loses the session. Also look at the sign in sheet with the keyboard up, the six code boxes, and the shake on a wrong code.
- **Decided for you:** the M3 list in `docs/DECISIONS.md`, notably the account sheet on the avatar until Settings, typing your email to delete the account, and no Privacy and Terms line until M9.

### M2: three science calls kept against their source (optional)

- **Where:** `docs/SOURCES.md`, the rows marked Working assumption, and the M2 list in `docs/DECISIONS.md`. Nothing to see in the app yet.
- **Look for:** whether you agree with keeping these. (1) Movement factors 1.20 to 1.60: FAO/WHO/UNU puts even a sedentary office worker at 1.53, but that includes all activity, and Ontrack adds workouts separately. If the seated start feels low, 1.40 is the alternative. (2) 7,700 kcal per kg: Hall (2008) says it overstates the energy of weight change for leaner people; the weekly check-in corrects from your weigh-ins. (3) The 1,200 and 1,500 kcal floors are not stated in the NHLBI guide, which gives 1,000 to 1,200 (women) and 1,200 to 1,600 (men) for low calorie diets; the floors are the safer end. Corrections that changed behaviour: moderate walking is 3.8 MET, low weekly volume is under 5 sets, advanced lifters gaining get the lean pace and a 10 percent surplus cap.
- **Then tell Claude:** "Keep the science as is", or which value to change.

### M1: the design system on your iPhone

- **Where:** the pull request's Vercel preview (it asks for your Vercel login), at `/gallery` for every component and `/gallery/today` for Today built from them. The gallery is not in production builds. Screenshots: branch `pr-assets`, folder `m1/`, and after `pnpm screenshots` in `screenshots/gallery/`, `screenshots/today/` (composed and the reference mock side by side) and `screenshots/xl/` (largest text on the SE).
- **Look for:** does it look like Ontrack to you: the lime, the type, the spacing, the track bar. On `/gallery/today`, compare with `design/reference-today.html`. Then on the phone only: the dock's blur (the test browser does not draw it), the press feel of buttons, chips and keypad keys, a light haptic on chips, the theme control and the keypad's save, holding the stepper's plus, dragging a sheet down to close it, and the sheet staying above the keyboard. Switch Theme and Text size at the top of `/gallery`.
- **Decided for you:** every choice is listed under M1 in `docs/DECISIONS.md`, for example unselected tabs in `--ink-2` and macro values on two lines. Approve, or tell Claude what to change.

### M0: the installed shell on your iPhone

- **Where:** `https://ontrack-black.vercel.app` once M0 is merged to `main`. Previews (each pull request's Vercel link) ask for your Vercel login. Screenshots: branch `pr-assets`, folder `m0/`, and `screenshots/shell/` after `pnpm screenshots`.
- **Look for:** open it in Safari, Share, Add to Home Screen. The icon is the lime track on an ink tile. It opens full screen with no Safari bars. The header reads Today with the round avatar on the right. The floating dock shows Today, Train, Progress and the lime plus. Tapping or swiping changes the tab and its title. Switch the phone to dark mode and back. The plus and the avatar do nothing yet.

## Resolved during the run

- **Google sign in (M3):** done by Claude after Yab came back (through the `yab` command; the MCP link stayed refused). Google Cloud project `ontrack` (`ontrack-514502`): consent screen "Ontrack", External, in Testing, test user `teenday.jedi@gmail.com`; Web client "Ontrack Supabase" with the Supabase callback. The client JSON is at `~/.config/ontrack/google-oauth-client.json` (mode 600). The Supabase Google provider is on (pushed with the CLI from a scratch config, so `supabase/config.toml` does not declare it and pushes leave it alone). Google linked the new project to your billing account on its own; you disabled billing on it.
- **Email codes (M3):** you set Gmail SMTP in Supabase; Claude pushed the code template (`supabase/config.toml`, `supabase/templates/code.html`) and sent one test code to `teenday.jedi@gmail.com` (HTTP 200).
- **Gemini key (M6):** made by Claude in a new AI Studio project "Ontrack Gemini" (`gen-lang-client-0967924647`), Free tier, no billing. File `~/.config/ontrack/gemini-api-key`; in Vercel as `GEMINI_API_KEY` for production and preview.
- **Supabase MCP (M0):** you connected it. It is at user scope with account tools, not limited to this project; the project scoped command was `claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=sbexrpzbzkzofnbpaauu"`. It loads in new sessions.
