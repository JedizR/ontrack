# Photo analysis: evaluation notes

What the vision model got right and wrong on real photos, and what changed because of it. Newest first.

## N1, 12 November 2026: Thai photos before and after the Thai table

**What changed between the passes.** Before: `main` at v0.8.0, 512 foods (USDA SR Legacy) and the M6 prompt. After: this branch, 571 foods (138 Thai, from SG FoodID and USDA FNDDS added to SR Legacy) and one prompt change: a whole dish in the catalog is one item with its `food_id`, rather than its parts. Nothing else; `est_per_100g` is still asked for (below).

**Method.** As in M6: `scripts/eval-vision.ts` (1024 px JPEG at 0.8, the system prompt with the catalog, the schema, the zod check and resolution against the table), timing the provider call alone from the Mac, `gemini-3.6-flash` with thinking at minimal, the free development key. The "before" pass ran from a worktree of `main`. Eight Thai photos from Wikimedia Commons, kept outside the repository: M6's six Thai photos (numbers 1 to 6 in the M6 table below) plus [Phat Thai kung, Chang Khien street stall](https://commons.wikimedia.org/wiki/File:Phat_Thai_kung_Chang_Khien_street_stall.jpg) (Takeaway, CC BY-SA 3.0) and [Mango sticky rice served in Thailand](https://commons.wikimedia.org/wiki/File:Mango_sticky_rice_served_in_Thailand.jpg) (Arthur Taksin, CC BY 4.0). Every photo has one answer per pass. The free tier answered 503 or timed out on five calls, which were retried once after a pause; with the retries the run used about 21 requests, the day's allowance.

### Results

| Photo | Before: items (from the table), kcal, time | After: items (from the table), kcal, time |
| --- | --- | --- |
| Pad kra pao crispy pork, rice | 2 (1), 782, 17.8 s | 2 (1), 676, 30.0 s |
| Khao man kai | 5 (2), 522, 3.9 s | 1 (1) Khao man kai, 515, 3.7 s |
| Beef green curry | 1 (0), 508, 3.4 s | 1 (0), 473, 10.3 s |
| Khao soi | 1 (0), 560, 8.3 s | 1 (0), 672, 22.0 s |
| Massaman beef, brown rice | 2 (1), 551, 17.0 s | 2 (1), 540, 3.4 s |
| Som tam, sticky rice, kai yang, jaew | 4 (1), 826, 4.6 s | 4 (2), 695, 4.8 s |
| Pad thai with shrimp | 7 (5), 645, 6.4 s | 1 (1) Pad thai with shrimp, 515, 4.5 s |
| Mango sticky rice | 3 (1), 555, 4.1 s | 1 (1) Mango sticky rice, 571, 28.1 s |

| | Before | After |
| --- | --- | --- |
| Items that resolve to the table | 11 of 25 (44 percent) | 7 of 13 (54 percent) |
| Photos whose dish resolves whole | 0 of 8 | 3 of 8 (khao man kai, pad thai, mango sticky rice) |
| Calories that come from the table | 1,086 of 4,949 (22 percent) | 2,633 of 4,657 (57 percent) |
| Items per photo | 3.1 | 1.6 |
| Reply size, mean characters | 691 | 409 (41 percent shorter) |
| Time to an answer, median (fastest four) | 5.5 s (3.4 to 4.6 s) | 7.6 s (3.4 to 4.8 s) |

**Reading it.**
- The table now carries the dish when the dish is there. Pad thai was seven items (four from the table, the noodles an estimate); it is now one line of FNDDS pad thai with shrimp. Khao man kai was five items with "oily rice" estimated; it is now SG FoodID's laboratory analysis of the whole plate. Mango sticky rice was three items; it is now one.
- Dishes the table does not have stay estimates: khao soi, massaman, beef green curry (the table has green curry with chicken, and the model rightly did not use it for beef), crispy pork kra pao (the table has minced pork), som tam and kai yang. These are the gap a Thai table would close (`docs/BLOCKERS.md`, the INMU licence).
- Time: the free tier dominated both passes. The four fastest answers took the same 3.4 to 4.8 s; the slow ones (17 to 30 s) came while it was answering 503 to other calls, and the after pass hit more of them. A median from eight free tier calls cannot show a change of this size. What the change does cut deterministically is output: replies are 41 percent shorter, because a dish is one line instead of three to seven.
- `est_per_100g` was kept. For items with a `food_id` it is 14 percent of a reply before and somewhat more after (most items now match), about 0.3 s of output at Flash speeds, well inside the free tier's noise; and it is the fallback when a `food_id` is not in the table. Drop it when the billed key gives stable timings that show the saving (`docs/DECISIONS.md`).

### Open

- Measure time to a review sheet on the deployed function with the billed key (M9), where a median means something.
- The owner's own Thai meals (the N1 owner check).

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

**Speed.** Provider call alone, from the Mac: pass 1 median 4.1 s (slowest 11.0 s), pass 2 median 5.9 s with three calls of 18 to 23 s while the free tier was answering 503 to other requests. Through the deployed function on a pull request preview, from Bangkok, with a 1024 px photo (curl's total time, upload included): with the functions in Washington (`iad1`, Vercel's default) 3 photos took 8.8, 10.0 and 11.3 s, about 4 s of it outside Gemini; with the functions moved to Singapore (`sin1`, next to the database) one photo took 4.8 s and the free tier answered the rest with 429 (shown as busy) within 1 to 2.4 s. One full sample is not a median: measure it on the phone over 4G with the billed key. The free tier's limits (20 requests a day per model, and bursts of 429 and 503) are the main risk to speed and success until then.

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
