// Short names and citations for the sources a plan breakdown or a training recommendation links to, and The science lists
// (every id in docs/SOURCES.md, the ledger). Citations are data, like food and exercise names, not interface words.
import type { SourceId } from '$lib/model/engine';
import type { FoodSet } from './foods';

export const SOURCES: Partial<Record<SourceId, { short: string; cite: string }>> = {
  S1: { short: 'Mifflin and St Jeor, 1990', cite: 'Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO. Am J Clin Nutr. 1990;51(2):241-247' },
  S2: { short: 'Cunningham, 1991', cite: 'Cunningham JJ. Am J Clin Nutr. 1991;54(6):963-969' },
  S3: { short: 'Tudor-Locke and Bassett, 2004', cite: 'Tudor-Locke C, Bassett DR Jr. Sports Med. 2004;34(1):1-8' },
  S4: { short: 'FAO, WHO and UNU, 2004', cite: 'FAO/WHO/UNU. Human energy requirements. FAO Food and Nutrition Technical Report Series 1, 2004' },
  S5: { short: 'Compendium, 2024', cite: 'Herrmann SD, Willis EA, Ainsworth BE, et al. 2024 Adult Compendium of Physical Activities. J Sport Health Sci. 2024;13(1):6-12' },
  S6: { short: 'Hall, 2008', cite: 'Hall KD. What is the required energy deficit per unit weight loss? Int J Obes. 2008;32(3):573-576' },
  S7: { short: 'Iraki and others, 2019', cite: 'Iraki J, Fitschen P, Espinar S, Helms E. Nutrition recommendations for bodybuilders in the off-season. Sports (Basel). 2019;7(7):154' },
  S8: { short: 'Morton and others, 2018', cite: 'Morton RW, Murphy KT, McKellar SR, et al. Br J Sports Med. 2018;52(6):376-384' },
  S9: { short: 'Helms and others, 2014', cite: 'Helms ER, Aragon AA, Fitschen PJ. J Int Soc Sports Nutr. 2014;11:20' },
  S10: { short: 'Jager and others, 2017', cite: 'Jager R, Kerksick CM, Campbell BI, et al. J Int Soc Sports Nutr. 2017;14:20' },
  S11: { short: 'Schoenfeld and others, 2017', cite: 'Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly resistance training volume and increases in muscle mass. J Sports Sci. 2017;35(11):1073-1082' },
  S12: { short: 'Schoenfeld and others, 2016', cite: 'Schoenfeld BJ, Ogborn D, Krieger JW. Effects of resistance training frequency on measures of muscle hypertrophy. Sports Med. 2016;46(11):1689-1697' },
  S13: { short: 'WHO guidelines, 2020', cite: 'Bull FC, Al-Ansari SS, Biddle S, et al. World Health Organization 2020 guidelines on physical activity and sedentary behaviour. Br J Sports Med. 2020;54(24):1451-1462' },
  S14: { short: 'NHLBI, 2000', cite: 'NHLBI and NAASO. The Practical Guide: Identification, Evaluation, and Treatment of Overweight and Obesity in Adults. NIH Publication 00-4084, 2000' },
  S15: { short: 'WHO, 2000', cite: 'WHO. Obesity: preventing and managing the global epidemic. Technical Report Series 894, 2000. For BMI 16: WHO EMRO. Field guide on rapid nutritional assessment in emergencies, 1995' },
  S16: { short: 'Institute of Medicine, 2005', cite: 'Institute of Medicine. Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids. National Academies Press, 2002/2005' },
  S17: { short: 'Walker, 1994', cite: "Walker J. The Hacker's Diet. fourmilab.ch, 1994, fourth edition 2005" },
  S18: { short: 'Frankenfield and others, 2005', cite: 'Frankenfield D, Roth-Yousey L, Compher C. J Am Diet Assoc. 2005;105(5):775-789' },
  S19: { short: 'FAO, 2003', cite: 'FAO. Food energy: methods of analysis and conversion factors. Food and Nutrition Paper 77, 2003' },
  S20: { short: 'Helms and others, 2023', cite: 'Helms ER, Spence AJ, Sousa C, et al. Effect of small and large energy surpluses on strength, muscle, and skinfold thickness in resistance-trained individuals: a parallel groups design. Sports Med Open. 2023;9:102' },
  S21: { short: 'Forbes, 2000', cite: 'Forbes GB. Body fat content influences the body composition response to nutrition and exercise. Ann N Y Acad Sci. 2000;904:359-365' },
  S22: { short: 'Eddens and others, 2018', cite: 'Eddens L, van Someren K, Howatson G. The role of intra-session exercise sequence in the interference effect: a systematic review with meta-analysis. Sports Med. 2018;48(1):177-188' },
  S23: { short: 'Robineau and others, 2016', cite: 'Robineau J, Babault N, Piscione J, Lacome M, Bigard AX. Specific training effects of concurrent aerobic and strength exercises depend on recovery duration. J Strength Cond Res. 2016;30(3):672-683' },
  S24: { short: 'Schumann and others, 2022', cite: 'Schumann M, Feuerbacher JF, Sunkeler M, et al. Compatibility of concurrent aerobic and strength training for skeletal muscle size and function: an updated systematic review and meta-analysis. Sports Med. 2022;52(3):601-612' },
  S25: { short: 'Wilson and others, 2012', cite: 'Wilson JM, Marin PJ, Rhea MR, et al. Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises. J Strength Cond Res. 2012;26(8):2293-2307' },
};

/** The food tables foods.json is built from (TECH-SPEC section 9), cited under a food in Search. SG FoodID's licence
 * asks for the source, the date it was read and a link to its terms wherever its data shows. A Thai FCD page read
 * online links to that page instead (the food's `source.url`). */
export const FOOD_SOURCES: Record<FoodSet, { name: string; terms?: string }> = {
  'usda-sr-legacy': { name: 'USDA FoodData Central, SR Legacy' },
  'usda-fndds': { name: 'USDA FoodData Central, FNDDS 2021 to 2023' },
  'sg-foodid': { name: 'SG FoodID, Health Promotion Board, Singapore, read on 12 November 2026', terms: 'https://go.gov.sg/termsofuse-hpbsgfoodid' },
  'thai-fcd': { name: 'Thai Food Composition Database, INMU, Mahidol University, read on 12 November 2026', terms: 'https://inmu.mahidol.ac.th/thaifcd/content/term-and-condition' },
  'thai-fcd-owner': { name: 'Thai Food Composition Database, INMU, Mahidol University, via an extract the owner supplied', terms: 'https://inmu.mahidol.ac.th/thaifcd/content/term-and-condition' },
};

/** Open Food Facts (B1, F22): its data is open under the Open Database License, credited wherever it shows. */
export const OFF_SOURCE = { name: 'Open Food Facts, open data under the ODbL', terms: 'https://world.openfoodfacts.org/terms-of-use' };
