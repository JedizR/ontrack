# Photo analysis: evaluation notes

What the vision model got right and wrong on real photos, and what changed because of it. Newest first.

## M6, 12 November 2026: ten Wikimedia Commons photos

The owner's own photos were not available in this unattended run, so this used the fallback in `STARTING_PROMPT.md`: ten freely licensed food photos from Wikimedia Commons, six of them Thai, kept outside the repository. The owner's ten real meals are still an owner check (`docs/BLOCKERS.md`).

**Method.** `pnpm eval:vision <folder> <out>` (`scripts/eval-vision.ts`) runs each photo as `/api/analyze` would: resized to 1024 px on the longest edge as JPEG at 0.8, the system prompt with the catalog, the JSON schema, the zod check and resolution against the food table. It times the provider call only, from the Mac. Free tier development key.

**Model.** `gemini-3.8-flash` (the newest Flash) answered 503 "high demand" or hung for over a minute on every call during the run, so the evaluation used `gemini-3.6-flash` with thinking at minimal, as the tech spec asks; 3.8 Flash refuses minimal. `GEMINI_MODEL` is `gemini-3.6-flash` everywhere.

**Free tier limit.** The development key allows 20 requests a day per model on `gemini-3.6-flash`. The second pass hit it after eight photos, so photos 2 and 8 have one pass only. The app's own limit is 40 a person a day, so production needs the billed key (M9).

### Photos

| # | Photo | What is on the plate | Licence |
| --- | --- | --- | --- |
| 1 | [Basil fried crispy pork with rice](https://commons.wikimedia.org/wiki/File:Basil_fried_crispy_pork_with_rice_-_Chiang_Mai_-_2017-07-11_(002).jpg), Iudexvivorum | Pad kra pao with crispy pork belly, rice | CC0 |
| 2 | [Kao mun gai](https://commons.wikimedia.org/wiki/File:Kao_mun_gai.jpg), Calliopejen | Khao man kai: chicken, rice cooked in chicken fat, cucumber, blood jelly, sauce | CC BY-SA 4.0 |
| 3 | [Beef green curry](https://commons.wikimedia.org/wiki/File:Beef_green_curry_-_Chiang_Mai_-_2017-07-08_(001).jpg), Iudexvivorum | Beef green curry, no rice | CC0 |
| 4 | [Khao Soi](https://commons.wikimedia.org/wiki/File:Khao_Soi_(4422322856).jpg), Alpha from Melbourne | Khao soi with lime | CC BY-SA 2.0 |
| 5 | [Beef Massaman curry with brown rice](https://commons.wikimedia.org/wiki/File:Beef_Massaman_curry_with_brown_rice.jpg), Vee Satayamas | Massaman beef with potato, brown rice | CC BY-SA 4.0 |
| 6 | [Som tam khao niao kai yang](https://commons.wikimedia.org/wiki/File:Som_tam_khao_niao_kai_yang.jpg), Takeaway | Som tam, sticky rice, grilled chicken, jaew | CC BY-SA 3.0 |
| 7 | [A Caesar salad](https://commons.wikimedia.org/wiki/File:A_Caesar_salad.jpg), Altitonantis | Caesar salad | CC0 |
| 8 | [Bacon, egg, sausage and beans](https://commons.wikimedia.org/wiki/File:Bacon_egg_sausage_and_beans_at_Starmugs_Cafe_on_Lordship_Lane_Tottenham_London_England_01.jpg), Acabashi | Two fried eggs, beans, sausage, gammon | CC BY-SA 4.0 |
| 9 | [Burger on plate](https://commons.wikimedia.org/wiki/File:Burger_on_plate.jpg), Anushka10patel | Three small burgers on steel saucers | CC BY-SA 4.0 |
| 10 | [Fruit and Honey French Oatmeal](https://commons.wikimedia.org/wiki/File:Fruit_and_Honey_French_Oatmeal_2.jpg), Bajinra | Oatmeal under milk or yoghurt, almonds, fruit | CC0 |

### Results

Calories are the app's totals after resolution. Pass 1 is the spec's prompt; pass 2 is the tuned prompt.

| # | Pass 1 | Pass 2 | Right | Wrong |
| --- | --- | --- | --- | --- |
| 1 | 929 kcal, 3 items, 3.6 s | 746 kcal, 2 items ("Pad krapow moo krob", rice), 20.8 s | Dish and crispy pork recognised; rice weight plausible | Pass 1 matched the fried pork to raw pork belly from the table |
| 2 | 515 kcal, 5 items, 4.1 s | (daily limit) | Every component found, blood jelly and the sauce cup included | Rice cooked in chicken fat matched to plain white rice, so the table's 130 kcal per 100 g replaced the model's own 160: too low |
| 3 | 508 kcal, "Beef curry", 2.5 s | 508 kcal, "Beef green curry", 3.2 s | Portion and energy density of a coconut curry plausible | Pass 1 dropped "green" from the name |
| 4 | 580 kcal, one item, 2.8 s | 513 kcal, "Khao soi" and lime, 18.4 s | Pass 2 named it correctly | Pass 1 spelled it "Kao soi" |
| 5 | 621 kcal, "Beef curry", 2.6 s | 634 kcal, "Massaman beef curry", 5.9 s | Brown rice matched; potatoes seen | Pass 1 did not name massaman |
| 6 | 730 kcal, 4 items, 11.0 s | 779 kcal, 4 items with Thai names, 3.9 s | All four parts, half chicken with skin, sticky rice portion | Grilled chicken matched to rotisserie chicken, the nearest the table has |
| 7 | 322 kcal, 5 items, 4.6 s | 328 kcal, 5 items, 5.0 s | Dressing and parmesan as their own items, from the table | |
| 8 | 696 kcal, 4 items, 4.5 s | (daily limit) | Two eggs, beans, sausage, bacon, all from the table | |
| 9 | 1,185 kcal, three lines of 150 g, 3.7 s | 1,184 kcal, one line of 450 g, 22.8 s | Three burgers counted; pass 2 merged them | Small burgers on saucers read as full size: likely about twice too high |
| 10 | 342 kcal, "Yogurt bowl", 4.4 s | 330 kcal, "Yogurt bowl", 4.1 s | Toppings itemised from the table | The oatmeal under the milk was missed in both passes |

**Speed.** Provider call alone: pass 1 median 4.1 s (slowest 11.0 s), pass 2 median 5.9 s with three calls of 18 to 23 s while the free tier was answering 503 to other requests. The time to a review sheet adds the resize, the upload and the function (about 1 to 2 s on 4G), so a typical photo lands near 6 to 8 s and a slow one over the 8 s target. The deployed end to end median on the live key was not measured: the day's free requests ran out. Measure it on the phone with the billed key.

### What the prompt tuning changed (once)

- `food_id` only when the entry matches the food and how it was cooked: rice cooked in chicken fat, stock or coconut milk is not plain rice, fried is not boiled. (Photo 2 could not be rerun to confirm.)
- `hidden_fat` not for poached, steamed, boiled or raw items (pass 1 flagged poached chicken).
- Names specific, the way a menu names them, with the common romanised name for Thai dishes. This fixed photos 3, 4, 5 and 6.
- Identical items as one line with the combined weight (fixed photo 9's three lines).
- Size judged against the plate or bowl, a saucer holding a small portion (did not fix photo 9).
- In code, not the prompt: item names now start with a capital letter, since pass 2 wrote them in lower case.

### Open

- Portions on small or unusual plates run high (photo 9). Grams are editable and the weekly check-in corrects from outcomes.
- Food hidden under a topping is missed (photo 10).
- The table lacks Thai cooked forms (rice cooked in chicken fat, crispy pork, kai yang), so those are estimates or near matches. A Thai food table is in the PRD's later list.
- Rerun photos 2 and 8 with the tuned prompt, and run the owner's ten real meals, when the daily free requests allow or with the billed key.
