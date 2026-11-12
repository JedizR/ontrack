// Every number the engine uses, with its unit, source and status. Sources: docs/SOURCES.md. Spec: docs/SCIENCE.md.
// No other engine file contains a numeric literal other than 0 and 1 (tests/unit/invariants.test.ts checks).

export const ENGINE_VERSION = 1;

/** S1 to S25 are papers and guides in docs/SOURCES.md. OT is an Ontrack engineering choice, documented there too. */
export type SourceId =
  | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9' | 'S10'
  | 'S11' | 'S12' | 'S13' | 'S14' | 'S15' | 'S16' | 'S17' | 'S18' | 'S19'
  | 'S20' | 'S21' | 'S22' | 'S23' | 'S24' | 'S25' | 'OT';
/** verified: read in the source. assumption: a choice, labelled "Working assumption" in the app. provisional: not yet checked. */
export type Status = 'verified' | 'assumption' | 'provisional';
export type Constant = { value: number | Readonly<Record<string, number>>; unit: string; source: SourceId; status: Status; note?: string };

const k = <T extends Constant['value']>(value: T, unit: string, source: SourceId, status: Status, note?: string) =>
  ({ value, unit, source, status, ...(note ? { note } : {}) });

export const C = {
  // Resting energy, section 2
  mifflin: k({ weight: 10, height: 6.25, age: 5, male: 5, female: -161 }, 'kcal/day per kg, per cm, per year, and sex term', 'S1', 'verified'),
  mifflinUnspecified: k(-78, 'kcal/day, sex term', 'OT', 'assumption', 'Mean of the male and female terms'),
  cunningham: k({ intercept: 370, perKgFfm: 21.6 }, 'kcal/day, and kcal/day per kg of fat-free mass', 'S2', 'verified'),
  bodyFatRange: k({ min: 5, max: 60 }, 'percent', 'OT', 'assumption', 'Outside this range the Mifflin-St Jeor path is used'),

  // Daily movement outside workouts, section 3
  neat: k({ seated: 1.2, light: 1.3, moving: 1.45, physical: 1.6 }, 'times resting energy', 'S4', 'assumption',
    'FAO/WHO/UNU physical activity levels (1.40 to 2.40) include exercise; Ontrack adds exercise separately and corrects at the check-in'),
  neatSteps: k({ seated: 5000, light: 7500, moving: 12500 }, 'steps/day, upper bound of each level', 'S3', 'verified'),

  // Exercise energy, sections 4 and 5. Compendium codes in the notes
  restingMet: k(1, 'MET', 'S5', 'verified', 'Already counted in the baseline, so subtracted from each session'),
  kcalPerMetHour: k(1, 'kcal per kg per hour', 'S5', 'verified', '1 MET is about 1.0 kcal/kg/h'),
  metStrength: k({ light: 3.5, moderate: 5, hard: 6 }, 'MET', 'S5', 'verified', 'Codes 02054, 02052, 02050'),
  metCircuit: k({ light: 3.5, moderate: 5, hard: 7.5 }, 'MET', 'S5', 'verified', 'Codes 02034, 02035, 02040'),
  metCardio: k({ light: 4, moderate: 6.8, hard: 9 }, 'MET', 'S5', 'verified', 'Codes 01010, 01200, 02049'),
  metMobility: k({ light: 2.3, moderate: 2.8, hard: 4 }, 'MET', 'S5', 'verified', 'Codes 02175, 02105, 02160'),
  metWalk: k({ light: 2.8, moderate: 3.8, hard: 4.8 }, 'MET', 'S5', 'verified', 'Codes 17152, 17190, 17200'),
  metSport: k({ light: 4, moderate: 6, hard: 8 }, 'MET', 'S5', 'assumption', 'No general sport code; values sit in the moderate and vigorous bands'),
  moderateMet: k(3, 'MET', 'S5', 'verified', 'Moderate intensity starts here'),
  vigorousMet: k(6, 'MET', 'S5', 'verified', 'Vigorous intensity starts here'),

  // Maintenance and the goal adjustment, section 6
  kcalPerKg: k(7700, 'kcal per kg of body weight change', 'S6', 'assumption',
    'The 3,500 kcal per pound rule; it overstates the energy of weight change for leaner people. The check-in absorbs the error'),
  losePace: k({ gentle: 0.25, steady: 0.5, faster: 0.75 }, 'percent of body weight per week', 'S9', 'verified', 'Source band 0.5 to 1; gentle is below it'),
  gainPace: k({ lean: 0.25, standard: 0.5 }, 'percent of body weight per week', 'S7', 'verified', 'Advanced lifters: 0.25'),
  // The faster gain pace (T1, PRD F19). No source recommends more than 0.5 a week for anyone (S7), so it is provisional
  gainPaceFaster: k(0.75, 'percent of body weight per week', 'S20', 'provisional',
    'Middle of the 0.7 to 0.8 a week the large surplus group aimed for in S20 (trained lifters), whose extra gain was mostly fat. The surplus cap still applies'),
  fasterGainMaxBmi: k(20, 'kg/m2', 'OT', 'assumption',
    'Offered below this BMI, never to advanced lifters. Thin people put 60 to 70 percent of an overfeeding gain into lean tissue (S21); no source gives a BMI cut'),
  fasterPaceMinBmi: k(25, 'kg/m2', 'S15', 'verified', 'Overweight threshold'),
  deficitCap: k(0.25, 'share of maintenance', 'OT', 'assumption'),
  surplusCap: k(0.2, 'share of maintenance', 'S7', 'verified', 'Top of the 10 to 20 percent band for novice and intermediate lifters'),
  surplusCapAdvanced: k(0.1, 'share of maintenance', 'S7', 'verified', 'Top of the 5 to 10 percent band for advanced lifters'),

  // Daily targets, section 7
  floor: k({ female: 1200, male: 1500, unspecified: 1350 }, 'kcal/day', 'S14', 'assumption',
    'The guide recommends 1,000 to 1,200 for women and 1,200 to 1,600 for men on a low calorie diet; Ontrack keeps the higher floors'),
  targetStep: k(10, 'kcal', 'OT', 'assumption', 'Targets are rounded to this step'),

  // Macros, section 8
  atwater: k({ protein: 4, carbs: 4, fat: 9 }, 'kcal/g', 'S19', 'verified'),
  // Labels and Open Food Facts that give energy only in kilojoules (B1)
  kjPerKcal: k(4.184, 'kJ per kcal', 'S19', 'verified', 'Section 3.1: 1 kcal = 4.184 kJ'),
  // Photo analysis: checks on the model's own estimate when a food is not in the table (TECH-SPEC section 8)
  estimateKcalMax: k(900, 'kcal per 100 g', 'OT', 'assumption', 'Pure fat is about 884'),
  estimateKcalTolerance: k(0.25, 'share of the energy from the macros', 'OT', 'assumption',
    'A model estimate further from 4p + 4c + 9f is recomputed from its macros; alcohol is not counted'),
  // Food table rows (N3): a Thai row whose numbers disagree is left out rather than shown
  tableKcalTolerance: k({ share: 0.25, kcal: 40 }, 'share of the energy, or kcal per 100 g if more', 'OT', 'assumption',
    'A row whose energy is further than this from 4p + 4c + 9f is left out'),
  derivedCarbsMin: k(-2, 'g per 100 g', 'OT', 'assumption',
    'Carbohydrate worked out as (energy - 4p - 9f) / 4 below this means the energy is wrong; above it, rounding, so it counts as 0'),
  proteinPerKg: k({ gain: 1.8, lose: 2, maintain: 1.6 }, 'g per kg of reference weight', 'S8', 'verified',
    'Within 1.6 to 2.2 (S7, S8) and 1.4 to 2.0 (S10); 2.3 to 3.1 g per kg of lean mass when cutting (S9)'),
  proteinRefBmi: k(30, 'kg/m2', 'S15', 'verified', 'Above the obesity threshold, protein uses the weight at this BMI'),
  fatShare: k(0.25, 'share of energy', 'S16', 'verified', 'Within 20 to 35 percent'),
  fatMinPerKg: k(0.6, 'g per kg', 'S7', 'verified', 'Within 0.5 to 1.5'),
  fatFloorPerKg: k(0.5, 'g per kg', 'S7', 'verified', 'Bottom of 0.5 to 1.5'),

  // On track, section 9
  onTrackBand: k({ gainMin: 0.95, gainMax: 1.15, maintainMin: 0.9, maintainMax: 1.1, loseMin: 0.9, loseMax: 1.05 }, 'share of the day target', 'OT', 'assumption'),
  proteinOnTrack: k(0.9, 'share of the protein target', 'OT', 'assumption'),

  // Trend and check-in, section 10
  trendSmoothing: k(0.1, 'share of the gap closed per weigh-in', 'S17', 'verified'),
  rateWindowDays: k(21, 'days', 'OT', 'assumption'),
  minWeighIns: k(8, 'weigh-ins', 'OT', 'assumption'),
  minSpanDays: k(14, 'days', 'OT', 'assumption'),
  completeMinItems: k(2, 'logged items', 'OT', 'assumption'),
  completeMinShare: k(0.5, 'share of the day target', 'OT', 'assumption'),
  minCompleteDays: k(10, 'days', 'OT', 'assumption'),
  checkinEveryDays: k(14, 'days since the plan started or changed', 'OT', 'assumption'),
  rateOnlyClamp: k(100, 'kcal/day', 'OT', 'assumption'),
  onTrackChange: k(50, 'kcal/day', 'OT', 'assumption', 'A smaller change is reported as on track'),
  observedWeight: k(0.5, 'share of measured maintenance in the blend', 'OT', 'assumption'),
  tdeeClamp: k(0.1, 'share of current maintenance', 'OT', 'assumption'),
  moveClamp: k(200, 'kcal/day', 'OT', 'assumption'),
  adherence: k({ gainMin: 0.9, loseMax: 1.1 }, 'mean intake over mean target', 'OT', 'assumption'),

  // Training analysis, section 11
  setPrimary: k(1, 'sets per set', 'OT', 'assumption'),
  setSecondary: k(0.5, 'sets per set', 'OT', 'assumption'),
  setsBuilding: k(5, 'weekly sets per muscle', 'S11', 'verified', 'Below this is low'),
  setsRange: k(10, 'weekly sets per muscle', 'S11', 'verified', 'From here hypertrophy was greatest'),
  setsHigh: k(20, 'weekly sets per muscle', 'OT', 'assumption', 'The source found too little data above 12 sets to set an upper limit'),
  sessionsPerMuscle: k(2, 'sessions per week', 'S12', 'verified'),
  strengthSessions: k(2, 'sessions per week', 'S13', 'verified'),
  aerobicMinutes: k({ min: 150, max: 300 }, 'moderate minutes per week', 'S13', 'verified'),
  vigorousFactor: k(2, 'moderate minutes per vigorous minute', 'S13', 'verified', 'Implied by the paired 150 to 300 and 75 to 150 minute ranges'),
  restDays: k(1, 'days per week with no hard session', 'OT', 'assumption'),
  longSession: k(120, 'minutes', 'OT', 'assumption'),
  // Lifting and cardio in one week (T1, PRD F20)
  hybridGapHours: k(6, 'hours between lifting and cardio on the same day', 'S23', 'verified',
    'Less than 6 h apart dulled strength gains; 24 h did not. A gap of 3 h or more spared explosive strength in S24'),

  // Guardrails, section 12
  minAge: k(18, 'years', 'OT', 'assumption', 'Product rule, PRD section 7'),
  underweightBmi: k(18.5, 'kg/m2', 'S15', 'verified'),
  gentleOnlyBmi: k(20, 'kg/m2', 'OT', 'assumption'),
  doctorBmi: k(16, 'kg/m2', 'S15', 'verified', 'Severe thinness'),
} as const;

type Values<T> = { [K in keyof T]: T[K] extends { value: infer V } ? V : never };
/** The values alone: `V.kcalPerKg` is 7700. */
export const V = Object.fromEntries(Object.entries(C).map(([key, c]) => [key, c.value])) as Values<typeof C>;

/** Unit conversions, not science. They live here so engine files hold no numeric literals. */
export const U = { daysPerWeek: 7, minutesPerHour: 60, percent: 100, cmPerM: 100 } as const;
