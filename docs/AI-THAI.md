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
