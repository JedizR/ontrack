// Short names and citations for the sources a plan breakdown or a training recommendation links to. The ledger is docs/SOURCES.md; M9's science
// screen adds the rest. Citations are data, like food and exercise names, not interface words.
import type { SourceId } from '$lib/model/engine';
import type { FoodSet } from './foods';

export const SOURCES: Partial<Record<SourceId, { short: string; cite: string }>> = {
  S1: { short: 'Mifflin and St Jeor, 1990', cite: 'Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO. Am J Clin Nutr. 1990;51(2):241-247' },
  S2: { short: 'Cunningham, 1991', cite: 'Cunningham JJ. Am J Clin Nutr. 1991;54(6):963-969' },
  S4: { short: 'FAO, WHO and UNU, 2004', cite: 'FAO/WHO/UNU. Human energy requirements. FAO Food and Nutrition Technical Report Series 1, 2004' },
  S5: { short: 'Compendium, 2024', cite: 'Herrmann SD, Willis EA, Ainsworth BE, et al. 2024 Adult Compendium of Physical Activities. J Sport Health Sci. 2024;13(1):6-12' },
  S6: { short: 'Hall, 2008', cite: 'Hall KD. What is the required energy deficit per unit weight loss? Int J Obes. 2008;32(3):573-576' },
  S7: { short: 'Iraki and others, 2019', cite: 'Iraki J, Fitschen P, Espinar S, Helms E. Nutrition recommendations for bodybuilders in the off-season. Sports (Basel). 2019;7(7):154' },
  S9: { short: 'Helms and others, 2014', cite: 'Helms ER, Aragon AA, Fitschen PJ. J Int Soc Sports Nutr. 2014;11:20' },
  S11: { short: 'Schoenfeld and others, 2017', cite: 'Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly resistance training volume and increases in muscle mass. J Sports Sci. 2017;35(11):1073-1082' },
  S12: { short: 'Schoenfeld and others, 2016', cite: 'Schoenfeld BJ, Ogborn D, Krieger JW. Effects of resistance training frequency on measures of muscle hypertrophy. Sports Med. 2016;46(11):1689-1697' },
  S13: { short: 'WHO guidelines, 2020', cite: 'Bull FC, Al-Ansari SS, Biddle S, et al. World Health Organization 2020 guidelines on physical activity and sedentary behaviour. Br J Sports Med. 2020;54(24):1451-1462' },
  S14: { short: 'NHLBI, 2000', cite: 'NHLBI and NAASO. The Practical Guide: Identification, Evaluation, and Treatment of Overweight and Obesity in Adults. NIH Publication 00-4084, 2000' },
};

/** The food tables foods.json is built from (TECH-SPEC section 9), cited under a food in Search. SG FoodID's licence
 * asks for the source, the date it was read and a link to its terms wherever its data shows. A Thai FCD page read
 * online links to that page instead (the food's `source.url`). */
export const FOOD_SOURCES: Record<FoodSet, { name: string; terms?: string }> = {
  'usda-sr-legacy': { name: 'USDA FoodData Central, SR Legacy' },
  'usda-fndds': { name: 'USDA FoodData Central, FNDDS 2021 to 2023' },
  'sg-foodid': { name: 'SG FoodID, Health Promotion Board, Singapore, read on 12 November 2026', terms: 'https://go.gov.sg/termsofuse-hpbsgfoodid' },
  'thai-fcd': { name: 'Thai Food Composition Database, INMU, Mahidol University, read on 12 November 2026', terms: 'https://inmu.mahidol.ac.th/thaifcd/content/term-and-condition' },
  'thai-fcd-owner': { name: 'Thai Food Composition Database, INMU, Mahidol University', terms: 'https://inmu.mahidol.ac.th/thaifcd/content/term-and-condition' },
};

/** Open Food Facts (B1, F22): its data is open under the Open Database License, credited wherever it shows. */
export const OFF_SOURCE = { name: 'Open Food Facts, open data under the ODbL', terms: 'https://world.openfoodfacts.org/terms-of-use' };
