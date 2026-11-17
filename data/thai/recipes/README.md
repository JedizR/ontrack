# Recipes, the `recipe:<id>` source (R2)

A dish nobody has analysed in a lab (pad kra pao with duck, rad na with crispy pork) gets its values worked out from what is in it. The source id in `data/food-list.csv` is `recipe:<id>`, and the numbers come from `data/thai/recipes/<id>.json` and the rows of its ingredients. A recipe never states a nutrient: this folder holds a composition, `pnpm foods:build` does the arithmetic.

## Order of sources

For a new dish try, in this order: an INMU page (`inmu:<code>`), the owner's extract (`owner:<code>`), SG FoodID, USDA, and only then a recipe. A recipe is the last resort, so a dish a table already has never gets one.

## A recipe file

```json
{
  "name": "Pad kra pao duck",
  "sources": ["https://rachelcooksthai.com/pad-kaprow-moo/", "https://www.eatingthaifood.com/..."],
  "ingredients": [{ "food": "duck-grilled", "grams": 75 }, { "food": "oil-vegetable", "grams": 15 }],
  "yield_g": 148,
  "notes": "Which pages said what, which amounts were averaged, what was left out and why."
}
```

- `sources`: at least 2 different recipe pages you read, with their full URLs. Say in `notes` what each gave you.
- `ingredients`: food ids from the table (the first column of `food-list.csv`), each with its grams. A recipe may use another recipe's dish (a rice plate is the dish plus rice), in any order in the list.
- Grams are in the state of the ingredient's row: a raw row (squid, tofu) takes raw grams, a cooked row (rice, grilled beef) cooked grams. Do not use a row that already holds the pan's oil (a "fried" Thai FCD row) and add oil as well.
- `yield_g`: the weight of the dish as served. The build refuses a yield above 1.2 times or below half the ingredients' weight. A stir fry loses about 5 to 10 percent to frying and wilting; a curry with water as an ingredient loses about 10.
- Cooking oil and sugar are ingredients like any other. Thai stir fries take 1 to 2 tablespoons of oil a plate (14 to 28 g); the recipes here use 1 tablespoon for kra pao and pad prik gaeng, about 1.5 for noodles and fried rice. Say which you used in `notes`.
- Missing ingredients (curry pastes, palm sugar, holy basil) are added to `food-list.csv` first as ordinary sourced rows.

## What the build does

Per 100 g of the dish: the sum over ingredients of (per100 x grams / 100), times 100 / `yield_g`. Energy is rounded to a whole kcal, protein, carbohydrate and fat to two decimals. Fibre is given only when every ingredient has it. `source.url` is the first page in `sources`. The build fails on a missing file, an unlisted ingredient, a recipe with fewer than 2 sources and recipes that wait on each other.

## Limits

- Herbs and aromatics under about 5 g (galangal, kaffir lime leaves, toasted rice powder beyond a spoon, chilli flakes) are left out or stood in for, and each recipe's notes say so.
- A recipe is one cook's plate, not an average of Thailand's. Its numbers sit within the spread of the sources' own amounts, and the table cites them as a recipe, not as a measurement.
- The grams of protein and rice per plate are the street-plate sizes the pages serve; a bigger plate is the user's portion, not a second recipe.
