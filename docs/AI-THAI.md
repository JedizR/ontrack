# Thai meal recognition: how a dish reaches its table entry (R2)

Thai food is the reason Ontrack exists, and one dish comes in many plates: pad kra pao with pork, minced pork, crispy pork, chicken, beef, duck, shrimp, squid or seafood, alone, on rice, or on rice with a fried egg. The model has to land on the right one of those, and nutrition per 100 g must come from the food table whenever it can.

## Decision

**One call, as now. The model also reports each Thai dish's parts (`dish`, `protein`, `extras`). The server resolves them to the table's variant deterministically, from the names and aliases the table already has.** The catalog stays in the prompt as `id|name` lines.

- `server/vision/thai.ts` reads every Thai table name as a plate: a base dish, a protein, rice or not, a fried egg or not ("Pad kra pao chicken with rice and fried egg", "Rad na with mixed seafood"). Each alias, without its own protein and extra words, becomes a name for its base: "kaprao moo" gives "kaprao", "ข้าวกะเพราไก่" gives "กะเพรา".
- An item resolves in this order: the exact plate the model reported (or its name reads as); the model's own `food_id`, unless it is the same dish with another protein; the nearest plate (same dish, the same or a near protein, then rice, then the egg; a plate that names no protein, like plain pad thai, last); a Thai name or alias that matches the item's name whole; else the model's estimate.
- A typed or recognised name parses on its own: "กะเพราหมูกรอบไข่ดาว" is pad kra pao, crispy pork, rice, fried egg; "kaprao gai" is pad kra pao, chicken. Thai script matches by substring (Thai has no spaces), romanised words by whole word, and nothing may be left over, so "stir fried pork with holy basil" stays with the model.
- A user's correction already goes to the model as an instruction over the photo; the model's protein then wins over a stale `food_id` (duck over pork), so the correction holds.
- `hidden_fat` is false whenever an item resolves to a table entry, whose values already include their cooking oil, and the model's flag otherwise. The prompt has stir-fried and deep-fried items always flagged; the app defaults the oil question to 1 tsp when any item is.

## What else was considered

| Option | Verdict |
| --- | --- |
| Catalog in the prompt, `id\|name` (what exists) | Kept. About 4,300 tokens at 670 foods, so above Gemini 3.6 Flash's 4,096 token floor for implicit caching, which is on by default: repeated calls reuse it with no code. |
| Catalog with aliases | Rejected. 12,500 tokens now, about 37,000 at 2,000 foods; at the free tier's reported 10 requests and 250,000 tokens a minute that no longer fits. The server matches aliases instead, at no token cost. |
| Closed enum of ids in the JSON schema | Rejected. Google names enums with many values as a cause of 400 errors on complex schemas, and developers report failures at about 100 to 120 values; the table has 670 and grows. |
| Two-stage classification | Taken, inside the one call: the parts are three small fields, the resolver is code. A second call would double requests against the free tier's per-minute limit. |
| Lexical retrieval (BM25, MiniSearch, Orama) | Rejected. Their tokenisers split on spaces, which Thai does not have, and the table is small enough to match in full in under a millisecond. The app's search already matches Thai by substring. |
| Small open embedding models at build time | Rejected. Open-KNEAD (2026) finds a modern multimodal model's direct estimate now matches or beats a full retrieval pipeline; the remaining gain is grounding each item to a table code, which the deterministic resolver does without a model to ship. |
| Explicit context caching | Not needed. Implicit caching already applies to the prompt's identical prefix; an explicit cache adds storage and its lifetime to manage. |

## Sources

- Google, [Context caching](https://aistudio.google.com/docs/caching): implicit caching on by default for Gemini 2.5 and newer; minimum 4,096 tokens for Gemini 3.6 Flash.
- Google Cloud, [Structured output](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output): "enums with many values" among the causes of `InvalidArgument: 400`; developer reports of the limit at about 100 to 120 values on the [Gemini forum](https://discuss.ai.google.dev/t/max-number-of-enums-in-response-schema-for-structured-output/40860).
- Coburn and others, [Open-KNEAD: Knowledge-grounded Nutrition Estimation via Agentic Decomposition](https://arxiv.org/abs/2607.12911), July 2026: direct MLLM estimates match or beat retrieval; per-item grounding to a food table code and a recipe prior for cooking oil the image cannot show.
- Free tier limits (10 requests and 250,000 tokens a minute for Flash) are third-party summaries of [Google's rate limit page](https://aistudio.google.com/docs/rate-limits), which no longer lists Flash; production runs on the billed key (`docs/EVAL-NOTES.md`, M9b).

## Measured

`docs/EVAL-NOTES.md`, R2: 30 Thai text cases (`tests/fixtures/vision/thai-eval.json`), `pnpm eval:vision --text`. Before 30 of 30, after 30 of 30: once the table has the variants, the prompt's catalog finds them from text, so the resolver changes no case there. What it adds is measured offline: with every `food_id` removed, it still reaches all 30 from the model's names and dish fields. Photos are not yet measured.

## R5, 23 November 2026: the reply is checked against the table, and the prompt says more

Still one call. What changed is what happens to the model's answer, what the prompt tells it, and how a busy model is handled. Everything here is offline work: no photo was run, no model was called, so none of it has a measured gain yet.

**After the model answers** (`server/vision/resolve.ts`, thresholds in `constants.ts` under "AI resolver, R5"):
- The table row is compared with the model's own kcal per 100 g, which until now was thrown away whenever a row matched. A row more than 35 percent (or 25 kcal) away swaps to a sibling plate that sits closer: the same dish and extras with the same or a near protein (pork and minced pork, seafood and shrimp). With no closer sibling the row stays, since the table wins, and confidence drops to low. An item the model flagged for hidden oil keeps the flag when its fat is more than 5 g per 100 g above the row's; before, any table row cleared it.
- A photo's grams are compared with the table's usual serving (the first portion that is a plate, bowl, cup or piece, not a spoon). Outside 0.3 to 3 times it is clamped to the edge and marked low. Inside, a low confidence item moves 25 percent of the way toward the serving in log space and a medium one 10 percent. A note that counts pieces ("2 eggs") must give a believable weight per piece, else grams become the count times the table's piece. A described meal keeps the user's own grams.
- The model also gives a range (`grams_low`, `grams_high`). It replaces grams only when grams falls outside it, and a wide range caps confidence.
- `alternatives` (up to 3, each with its kcal at the item's grams) come from the model's own second guess (`alt_food_id`) and the same plate with each other protein, and are returned only when one differs from the choice by more than 15 percent in kcal.
- A name no plate, id or whole name reached is matched by its words: protein and extras canonicalised (moo, หมู and pork are one token), fillers dropped, Thai script by letter triples. Every word of the name must be in the row, the row may not add a protein the name lacks, and the overlap must be 0.75 with a 0.1 lead over the runner up. So beef cannot land on pork by construction. Offline, on the table's 484 Thai names with `food_id` and `dish` removed: words reversed, 48 of 484 found before and 437 after; wrapped in "the ... plate", 0 and 292; "... thai style", 0 and 26; wrong protein, 0 in every set. A one letter typo is not helped (99 of 484 before and after).

**The prompt** (`server/vision/prompt.ts`): each catalog line ends with the table's usual serving in grams (`egg-fried|Fried egg|46 each`), the model is told to scale from it (0.7 to 1.4 times is usual), and one line of scale anchors (plate, saucer and bowl sizes, a fork, a can, a card, and the table's own rice cup, rice plate and egg). The 171 Thai variant rows are now 58 family lines (`Pad kra pao|alone 130 to 172|on rice 330 to 426`) with no id: the model sets `food_id` to null and gives `dish`, `protein` and `extras`. This was allowed because the resolver rebuilds every one of the 171 rows from its own dish, protein and extras (a unit test checks all of them). The whole prompt is 30,884 characters against 31,193 before, so the serving column cost nothing extra. The schema asks for a `scene` (vessel and size, references) before the items, and `grams_low`, `grams_high` and `alt_food_id` per item. They are optional when reading a reply, so saved replies and old fixtures still parse.

**The server**: a 503 on the main model is tried once more after 700 ms before Flash-Lite answers (a 429 still goes straight to Lite). A reply from Lite never says high confidence. `GEMINI_THINKING` (minimal, low or medium, default minimal) sets the thinking level of both models. The provider logs the call's token counts (prompt, cached, thoughts, output) in its own `gemini` line.

**Not measured, and the risks**
- Whether any of it makes totals closer to a weighed plate. There is still no photo ground truth (`docs/EVAL-NOTES.md`, Step 0 of the audit). The 30 text cases were not rerun; they can only change if the new catalog confuses the model.
- Anchoring: the stated serving may pull the model's grams toward it. Compare the share of items within 5 percent of the stated serving before and after.
- The model may fill `dish`, `protein` and `extras` less carefully for a family line than it picks an id. The resolver is the net, but a family item with `dish` left null falls to name matching. Check the share of Thai items that resolve to a row.
- Property order with `responseJsonSchema` (scene before items) and the range fields need one live reply to confirm. Token counts and the cache hit rate will show in the `gemini` log line.
- The range's width and the shrink weights are guesses; tune them on a weighed set.
- Skipped on purpose: clamping an estimate's kcal to its lexical neighbours (too weak a signal for an unknown name) and a larger shrink for Lite (its confidence is capped at medium instead).

Re-score saved replies offline after any resolver change: `pnpm exec tsx scripts/eval-vision.ts --replay <folder the eval wrote>`.
