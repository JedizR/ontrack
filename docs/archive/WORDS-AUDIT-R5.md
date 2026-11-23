# Ontrack words audit (23 Nov)

Source: `src/lib/i18n/en.ts` (read whole), `docs/DESIGN.md` section 2, `docs/SCREENS.md`. No file was edited. Skipped: `science` labels block, `landing.alt`.

Rule check on the whole catalog: no em or en dashes, no middle dots, no exclamation marks, no emoji (the baht sign is a currency). The rule breaks I found are of the softer kind: first person "my/I" beside "your" (DESIGN O1 rule 2), "Continue" used outside a step flow (rule 1), "we" mixed with "Ontrack" and with impersonal errors, and singular/plural bugs ("1 changes").

Dead keys, left alone: `add.photo`, `empty.today`, `weigh.promptEyebrow/promptTitle/promptLast/promptNone`, `paywall.plans` (aria label only).

## Term decisions

| Thing | Use | Retire | Where it shows now |
| --- | --- | --- | --- |
| One meal logged with AI | **AI log** (`5 AI logs a day`) | "AI meal log", "photo analysis", "analyses", "analyse the photo" | review.limit, scan.limit, review.offline/busy/failed, paywall rows, membership, landing plans |
| One scheduled workout | **session**; the act is **Done** (one word, one meaning) | "workout" (move.caption) | Today, Train, Progress |
| The weekly set of sessions | **program** | "training plan" (paywall.rows.training, landing freeHas) | Train, plans lists |
| The calorie and protein plan | **plan** (Your plan, Save this plan) | using "Plan" for the subscription | Settings group "Your plan" vs box "Plan" |
| The subscription | **membership** (title), Free, Pro | "Plan" as the box title | Settings |
| The daily numbers | **target**; **goal** only for what you train for and **goal weight** | "budget" (not used, keep it out) | all |
| "How it is calculated" | one string: **How your target is calculated** | three variants (today.how, settings.how, plan.how) | Today, Settings, Your plan |
| A food in a meal | **food** | "item" in people-facing words | Review, Meal |
| Saving a day or a file to the account | **back up** | "sync" (Sync now) | Settings, sync marks |
| The AI features | **Ask Ontrack** (questions), **Adjust with AI** (program), **Written by AI** (label) | "the coach" in user words | programAi.*, coach.ask.offline, landing proLine |
| Tray and Bento | **Style** (the setting and the card) | "looks" in style.line | Today's style card, Settings. Tray and Bento are the owner's names and say nothing on their own; the lines under them carry the meaning. Owner's call whether to rename to Glass and Flat |
| Voice | "you" and "Ontrack"; errors impersonal ("Could not read the photo"); first person only in text the user types or taps as their own words (the Ask chips) | "I", "my" in labels; "We" in error messages | Friends and map, Review |
| Spelling | American, to match "program" | analyse, millilitres, Tick | review.failed, after.millilitres, screening.lead |

## Today

| # | Key | Current | Proposed | Why |
| --- | --- | --- | --- | --- |
| 1 | today.nothingLine | Log a meal with the plus button. | (delete the line; `CardHead` takes `line?`) | The card already has "Nothing logged yet today" and an "Add a meal" button. The line says the same a third time |
| 2 | settings.how, plan.how (today.how already reads this way) | How it is calculated / How this was calculated | How your target is calculated | One string for one sheet, "it" and "this" had no subject, past tense was odd |
| 3 | style.line | Ontrack comes in two looks. Tap one and the app changes right away. | Two styles. Tap one to try it. | 12 words to 7, and "looks" vs "style" |
| 4 | style.later | Change it any time: tap your profile at the top right, then Settings. | Change it any time in Profile, then Settings. | Shorter path, still says where |

## Add sheet and logging sheets (Describe, Search, Quick add, Scan, Supplement)

| # | Key | Current | Proposed | Why |
| --- | --- | --- | --- | --- |
| 1 | supplement.fromTub | Set from your tub's label (caption under each of the 6 kinds) | (delete the caption; `supplement.tubLine` says it on the next step) | The same line six times on one list |
| 2 | scan.missing | This barcode is not in Open Food Facts yet. Photograph the nutrition label and Ontrack keeps it for your next scan. | Not in Open Food Facts yet. Photograph the label and Ontrack saves it for next time. | 22 words to 15 |
| 3 | scan.empty | Open Food Facts has this product without its nutrition. Photograph the label and Ontrack keeps it for your next scan. | Open Food Facts has no nutrition for this one. Photograph the label and Ontrack saves it for next time. | Plainer, shorter, same wording as scan.missing |
| 4 | supplement.why | Brands differ, so the label on your tub is more accurate than this average from ${source}. | Typical values from ${source}. The label on your tub is more accurate. | Says what the numbers are first. "Brands differ" is already in tubLine |
| 5 | scan.denied | Camera access is off for Ontrack. Type the number, or allow the camera for this site in your browser's settings. | Camera is off for Ontrack. Type the number, or allow the camera in your browser settings. | Two lines on a 375 wide hint to one and a half |

## Review and Meal sheet

| # | Key | Current | Proposed | Why |
| --- | --- | --- | --- | --- |
| 1 | review.limit, scan.limit | You have used today's ${n} photo analyses. Search and quick add still work. / ... You can still type the numbers. | You have used today's ${n} AI logs. Search and quick add still work. / You have used today's ${n} AI logs. You can still type the numbers. | One term. It also covers Describe and label reads, which are not photo analyses |
| 2 | review.failed, review.failedText | Could not analyse the photo. Try again or add it by hand. / Could not analyse the description. ... | Could not read the photo. Try again or add it by hand. / Could not read the description. Try again or add it by hand. | Plain verb, one spelling |
| 3 | review.offline, review.busy | Photo analysis needs a connection. / Photo analysis is busy right now. Try again in a few minutes, or add it by hand. | Logging by photo needs a connection. / AI is busy right now. Try again in a few minutes, or add it by hand. | Drops the technical noun |
| 4 | review.saveMeal, meal.saveAs | Save meal | Save for next time | Next to the primary "Add 720 kcal" it reads as the log action. This says what it does |
| 5 | review.notFood, review.notFoodText, scan.notLabel | We could not find food in that photo. / We could not find food in that description. Name the foods, like rice with chicken curry. / We could not read a nutrition label in that photo. Take it straight on and close enough to read. | No food found in that photo. / No food found in that description. Name the foods, like rice with chicken curry. / Could not read a label in that photo. Take it straight on, close enough to read. | Impersonal like the other errors; the Try again and Add by hand buttons already carry the way out |
| 6 | review.empty, meal.addItem, meal.empty | Add each food with Add an item. / Add an item / No items left. Add one, or delete the meal. | No foods yet. Add one below. / Add a food / No foods left. Add one, or delete the meal. | "item" and "food" for the same thing, and the first line was circular |
| 7 | meal.correct | Correct | Edit numbers | Sits beside Fix, Replace and Remove. "Correct" could mean any of them |

## Train

| # | Key | Current | Proposed | Why |
| --- | --- | --- | --- | --- |
| 1 | train.useBody | ${name} replaces your current program. Your targets follow it from tomorrow. | ${name} replaces your current program. Your targets follow it from today. | Verify first: `changeProgram` (TemplatesSheet, AI sheet, Suggestion) writes the plan from today, and `aiProgram.used` already says "from today". Only a profile edit starts tomorrow. If today is right, one string is wrong |
| 2 | programAi.offline, programAi.signedOut | Changing your program with the coach needs a connection. / Sign in to ask the coach to change your program. | Adjust with AI needs a connection. / Sign in to use Adjust with AI. | The user never saw the word "coach"; the button says Adjust with AI |
| 3 | programAi.limit, programAi.busy, programAi.failed, coach.ask.offline | You have used all of today's coach requests. Change your program by hand, or ask again tomorrow. / The coach is busy right now. Try again in a few minutes. / The coach could not change your program. Try again, or change it by hand. / The coach needs a connection to answer that. Here is what your numbers say. | You have used today's AI requests. Change your program by hand, or try again tomorrow. / AI is busy right now. Try again in a few minutes. / AI could not change your program. Try again, or change it by hand. / Ask Ontrack needs a connection. Here is what your numbers say. | Same reason; names match the feature |
| 4 | train.suggest.title | Suggested for your week | A program for your week | "Suggested" is also the eyebrow of the protein card on Today and the word over the analysis "Suggestions" |

## Progress

| # | Key | Current | Proposed | Why |
| --- | --- | --- | --- | --- |
| 1 | coach.week.sessions, coach.week.protein | You finished ${n} sessions. / Protein was on track on ${days} days. | `n === '1'` gives "You finished 1 session." / "Protein was on track on 1 day." | Plural bug at one |
| 2 | progress.trainingSoon | Sessions you mark done on Today will show here. | Tap Done on a session and it shows here. | Names the action and the button |
| 3 | progress.intakeNone | Log two or more items on a day, at least half its target, to see your weekly average. | A day counts at two or more items and half its target. Log a few to see your weekly average. | The old line is one run-on with a comma bridge |
| 4 | progress.historyLine | Any day, opened as Today | Open any past day | Says what a tap does |
| 5 | coach.week.headline | Your week at a glance | At a glance | The eyebrow above it already says "Your week" |
| 6 | after.kcalInAvg, after.gAvg | kcal eaten a day, average / g a day, average | kcal a day on average / g a day on average | Reads as a phrase, not a label with a comma |

## Check-in

| # | Key | Current | Proposed | Why |
| --- | --- | --- | --- | --- |
| 1 | progress.readyLine | Ready to read | Ready to review | Today's card says "Ready to review" for the same check-in |
| 2 | checkin.needData | We need a few more weigh-ins to be sure. Keep going and we will check again next week. | Not enough weigh-ins to be sure yet. Keep going and the next check-in will tell. | Drops "we", one fewer clause. Same promise |
| 3 | checkin.tookIt | You took the new target. | You used the new target. | Matches the button, "Use the new target" |

## Profile, Settings, Sign in, Account

| # | Key | Current | Proposed | Why |
| --- | --- | --- | --- | --- |
| 1 | membership.title | Plan | Membership | The box sits under the group "Your plan", which is the calorie plan |
| 2 | account.waiting, account.unsent | ${n} changes waiting to back up / ${n} changes are not backed up yet. Signing out deletes them from this browser. | `n === '1'`: 1 change waiting to back up / 1 change is not backed up yet. Signing out deletes it from this browser. | Plural bug at one |
| 3 | settings.sex | Sex for the equation | Sex used for your target | "The equation" is internal |
| 4 | settings.profileLine | What your resting energy is worked out from | Sex, age, height and movement | Says what the page holds, not why |
| 5 | settings.syncNow, sync.offline | Sync now / Offline. Changes stay in this browser until you reconnect | Back up now / Offline. Changes wait in this browser | Everything else says "back up", and settings.offline already says "wait" |
| 6 | settings.remindersLine | Cards on Today when you open Ontrack. No notifications. | Cards on Today. No notifications. | "When you open Ontrack" is the only way a card on Today can show |
| 7 | signin.lead | Your plan stays in this browser and backs up to your account for your other devices. | Save your plan to your account and use it on any device. | Outcome first, 16 words to 11 |

## Friends and the map

| # | Key | Current | Proposed | Why |
| --- | --- | --- | --- | --- |
| 1 | social.locate, social.useLocation, social.showProgram | Go to where I am / Use my location / Show my program to friends | Go to where you are / Use your location / Show your program to friends | O1 rule 2: "my" and "your" on one screen (the Edit profile and Share sheets say "your") |
| 2 | social.continue | Continue | Allow location | "Continue" is for steps in one flow; this answers a permission, and Not now sits beside it |
| 3 | social.onMapLine | Friends can see it on the map. | Friends can see this meal. | Title is "On the map"; the line repeated it |

## Onboarding

| # | Key | Current | Proposed | Why |
| --- | --- | --- | --- | --- |
| 1 | sex.q | Which sex should the equation use? | Which sex should Ontrack use? | "The equation" means nothing to a person |
| 2 | sex.caption | Resting energy differs by sex. Used only for this calculation. | What your body uses at rest differs by sex. Used only for this. | Resting energy is explained where it first appears |
| 3 | advice.title | Plan this with your clinician | Plan this with your doctor | "Clinician" is a word for staff. The body already says doctor or dietitian |
| 4 | advice.body | Your energy needs can differ from what general equations predict. We recommend setting targets with your doctor or a dietitian. | General formulas may not fit you. We recommend setting targets with your doctor or a dietitian. | One fact, as O1 rule 6 asks, and no "equations" |
| 5 | screening.lead | Tick any that apply. | Select any that apply. | Phone UI, American spelling |
| 6 | plan.recomp | The gentle pace with a cut's protein, so muscle can still grow while you lift. | The gentle pace with extra protein, so muscle can still grow while you lift. | "A cut's protein" is gym slang |
| 7 | sex.unspecifiedLine | Uses the midpoint. | Uses an average of both. | "Midpoint" of what is unsaid |
| 8 | move.caption | Not counting workouts. | Not counting training. | The question just before it says "train" |

## Plans sheet and paywall

| # | Key | Current | Proposed | Why |
| --- | --- | --- | --- | --- |
| 1 | paywall.heads.limit[0] | That's today's free AI logs | Today's free AI logs are used | The old line is not a sentence |
| 2 | paywall.heads.onboarding[1], paywall.heads.settings[1] | Log every meal with AI, ask about your week and reshape your training whenever you like. | Log every meal with AI, ask about your week and adjust your program. | "Reshape your training" vs "adjust your program", and "whenever you like" is filler |
| 3 | paywall.welcomeTitle, paywall.welcomeLine | Welcome to Pro (title, then "Pro is on", then the hero line again) / Log every meal with AI, ask about your week and adjust your program whenever you like. | Ontrack Pro / AI logs have no daily limit. Ask Ontrack and Adjust with AI are open. | Title, heading and line said "Pro" three times and the line repeated the hero. Now the line says what changed |
| 4 | AI log term: paywall.rows.ai, membership.freeLine, landing.plans.freeAi, landing.plans.proHas[0] | AI meal logs / ${n} AI meal logs a day / ${n} AI meal logs a day / Unlimited AI meal logs | AI logs / ${n} AI logs a day / ${n} AI logs a day / Unlimited AI logs | Review already says "free AI logs" |
| 5 | paywall.rows.training, paywall.rows.adjust, landing.plans.freeHas[2], landing.plans.proHas[2] | Training plan / Adjust with AI / Training plan with Done / Adjust with AI | Training program / Adjust program with AI / Training program / Adjust program with AI | "Plan" is the calorie plan. "Adjust" needed an object in a list |
| 6 | paywall.fine (end) | This preview bills 0 THB through Stripe. | This preview charges 0 THB. | Processor name is internal |
| 7 | paywall.heads.limit[1] | Pro logs every meal by photo, words or label, as often as you eat. You can still log this one by hand. | Pro logs every meal by photo, words or label. You can still log this one by hand. | Cuts the filler clause |

## Landing page

| # | Key | Current | Proposed | Why |
| --- | --- | --- | --- | --- |
| 1 | landing.lead | Your daily calories and protein, from published equations and how you train. Raised on training days, and checked against your weigh-ins every week. | Daily calories and protein, higher on training days, corrected by your weigh-ins every week. | 24 words to 14. The statement and closing line already repeat the same idea |
| 2 | landing.cta.line | Your calories and protein for training days and rest days, from how you train. | Your calories and protein for training days and rest days. | "From how you train" is the third mention on the page |
| 3 | landing.train.cards[1] title, line | A floor for lifters who struggle to gain / With a gain goal the target is a floor to reach, not a ceiling. If the scale stays flat, the check-in raises it. | A floor when you gain / Reach it or go past it. If the scale stays flat, the check-in raises it. | The title and the line both said "floor"; the title was a line long on a phone |
| 4 | landing.log.cards[2].line | Thai dishes from published food tables, Thai ones first, found in English or in Thai script. | Search in English or Thai script. Thai dishes rank first. | "Thai" three times in one line; the title already says Thai food |
| 5 | landing.log.lead | Ontrack names each food and estimates the grams. Calories come from published food tables wherever there is a match, and an estimate says it is one. | Ontrack names each food and estimates the grams. Calories come from food tables, and an estimate says it is one. | 28 words to 21 |
| 6 | landing.friends.lead | Add friends by their handle. Share a meal to the map when you want to, and see where your friends ate theirs. | Share a meal to the map when you want to, and see where your friends ate. | The handle sentence is the first point below it |
| 7 | landing.plans.lead, landing.plans.proLine | Every way to track stays free. Pro adds unlimited AI logging and the AI that answers and adapts. / AI on every meal, and a coach that adapts. | Every way to track stays free. Pro adds unlimited AI. / AI on every meal, and a program that adapts. | The lead and the card line said the same; "coach" is not a feature name |
| 8 | landing.footer.keep | Keep your calories | Stay on track (owner's call) | "Keep your calories" can read as holding on to them. The brand name already carries "on track" |

## Count

Today 4, Add and logging 5, Review 7, Train 4, Progress 6, Check-in 3, Settings 7, Friends 3, Onboarding 8, Plans 7, Landing 8: 62 rows.
