# Owner-supplied Thai nutrition dataset

- File: `nutrition_dataset.csv`, 1,005 rows, SHA-256 `42703598c7ba5eeb5980d9b74545d81abf81f2c67036b2bb6002321f8036ca80`. Copied from the owner's Downloads on 12 November 2026.
- Where it came from: the owner found it on the internet and gave it to Claude for N3 ("I have this attached Thai nutrition facts for you"). The food codes (A1 rice, T285 green curry with pork, Z060001 packaged crackers and so on) and the Thai and English names match the INMU Thai Food Composition Database (Institute of Nutrition, Mahidol University). Cite it as "Thai Food Composition Database, INMU, Mahidol University, via an extract the owner supplied". The use rests on the owner's decision recorded for N3: Ontrack is a class proof of concept that is not launched publicly.
- Columns: Food_Code, Thai_Name, English_Name, Scientific_name, SUGAR(g), Protein(g), Fat(g), Energy(kcal) by calculation, CHOCDF (g) Carbohydrate, FIBTG (g) Dietary fibre. "-" means no value. Values are per 100 g, or per 100 mL where the name says so (drinks, oils, milks).

## What the conductor checked before handing it over

Groups: A cereals 77, B starchy roots 19, C legumes, nuts and seeds 90, D vegetables 90, E fruit 90, F meat 90, G fish and shellfish 90, H eggs 32, J milk 49, K fats and oils 42, M sugars 8, N seasonings and pastes 83, Q drinks 29, S fast food 16, T Thai mixed dishes and desserts 90, U insects and others 29, Z packaged crackers 81.

- Calories can be worked out for about 727 rows: 49 have protein, fat, carbohydrate and energy; 404 have energy but no carbohydrate (carbohydrate can be derived as (energy - 4 protein - 9 fat) / 4); 274 have carbohydrate but no energy (energy can be derived with Atwater factors). Derived values must be marked as derived in the build output.
- Only 32 of the 90 mixed dishes (group T) can give calories; the rest have protein and fat only. Dishes still need the web sources in N3's plan.
- About 20 rows fail an Atwater consistency check. Some are small rounding gaps in lean fish (derived carbohydrate a little below zero, which should clamp to 0). Others look wrong and should be excluded and listed in `docs/EVAL-NOTES.md`: C2 roasted white sesame (energy 356 against 949 by Atwater), C14 snap bean, G126 and G128 striped catfish, G162 salted mangrove crab (energy 8), G175 canned oyster.
- J36 "Whey protein, powder" reads 7.8 g protein per 100 g, which cannot be a protein powder (whey isolates are about 75 to 90 g). Do not use it for the whey preset.
- Some rows are raw ingredients only (raw meat, raw rice). Logging needs cooked forms where they exist (A11 cooked rice, A23 steamed sticky rice, G9 boiled prawn, H18 boiled egg).
- The Z group is packaged crackers by brand. They may suit B1's product lookups less than Open Food Facts does; leave them out unless a match is useful.
- A few rows have stray characters from the source's encoding (for example "Yakultฎ", "Cocos nucifera�L.").
