// Short names and citations for the sources a plan breakdown links to. The ledger is docs/SOURCES.md; M9's science
// screen adds the rest. Citations are data, like food and exercise names, not interface words.
import type { SourceId } from '$lib/model/engine';

export const SOURCES: Partial<Record<SourceId, { short: string; cite: string }>> = {
  S1: { short: 'Mifflin and St Jeor, 1990', cite: 'Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO. Am J Clin Nutr. 1990;51(2):241-247' },
  S2: { short: 'Cunningham, 1991', cite: 'Cunningham JJ. Am J Clin Nutr. 1991;54(6):963-969' },
  S4: { short: 'FAO, WHO and UNU, 2004', cite: 'FAO/WHO/UNU. Human energy requirements. FAO Food and Nutrition Technical Report Series 1, 2004' },
  S5: { short: 'Adult Compendium of Physical Activities, 2024', cite: 'Herrmann SD, Willis EA, Ainsworth BE, et al. 2024 Adult Compendium of Physical Activities. J Sport Health Sci. 2024;13(1):6-12' },
  S6: { short: 'Hall, 2008', cite: 'Hall KD. What is the required energy deficit per unit weight loss? Int J Obes. 2008;32(3):573-576' },
  S7: { short: 'Iraki and others, 2019', cite: 'Iraki J, Fitschen P, Espinar S, Helms E. Nutrition recommendations for bodybuilders in the off-season. Sports (Basel). 2019;7(7):154' },
  S9: { short: 'Helms and others, 2014', cite: 'Helms ER, Aragon AA, Fitschen PJ. J Int Soc Sports Nutr. 2014;11:20' },
  S14: { short: 'NHLBI Practical Guide, 2000', cite: 'NHLBI and NAASO. The Practical Guide: Identification, Evaluation, and Treatment of Overweight and Obesity in Adults. NIH Publication 00-4084, 2000' },
};
