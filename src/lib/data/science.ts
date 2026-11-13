// The science screen (SCREENS.md, Settings): every constant in C, grouped as constants.ts and docs/SCIENCE.md are, in
// display order. Headings and plain names are in t.science; citations in SOURCES. tests/unit/science.test.ts checks
// that every key appears once.
import type { C } from '$lib/model/engine';

export type ScienceGroup =
  | 'resting' | 'movement' | 'exercise' | 'pace' | 'targets' | 'macros' | 'foodChecks' | 'onTrack' | 'checkin'
  | 'training' | 'guardrails';

export const SCIENCE: { group: ScienceGroup; keys: (keyof typeof C)[] }[] = [
  { group: 'resting', keys: ['mifflin', 'mifflinUnspecified', 'cunningham', 'bodyFatRange'] },
  { group: 'movement', keys: ['neat', 'neatSteps'] },
  {
    group: 'exercise',
    keys: ['restingMet', 'kcalPerMetHour', 'metStrength', 'metCircuit', 'metCardio', 'metMobility', 'metWalk', 'metSport', 'moderateMet', 'vigorousMet'],
  },
  {
    group: 'pace',
    keys: ['kcalPerKg', 'losePace', 'gainPace', 'gainPaceFaster', 'fasterGainMaxBmi', 'fasterPaceMinBmi', 'deficitCap', 'surplusCap', 'surplusCapAdvanced'],
  },
  { group: 'targets', keys: ['floor', 'targetStep', 'easyAdds'] },
  { group: 'macros', keys: ['atwater', 'kjPerKcal', 'proteinPerKg', 'proteinRefBmi', 'fatShare', 'fatMinPerKg', 'fatFloorPerKg'] },
  { group: 'foodChecks', keys: ['estimateKcalMax', 'estimateKcalTolerance', 'tableKcalTolerance', 'derivedCarbsMin'] },
  { group: 'onTrack', keys: ['onTrackBand', 'proteinOnTrack'] },
  {
    group: 'checkin',
    keys: ['trendSmoothing', 'rateWindowDays', 'minWeighIns', 'minSpanDays', 'completeMinItems', 'completeMinShare', 'finishDayHour', 'minCompleteDays',
      'checkinEveryDays', 'rateOnlyClamp', 'onTrackChange', 'observedWeight', 'tdeeClamp', 'moveClamp', 'adherence'],
  },
  {
    group: 'training',
    keys: ['setPrimary', 'setSecondary', 'setsBuilding', 'setsRange', 'setsHigh', 'sessionsPerMuscle', 'strengthSessions', 'aerobicMinutes',
      'vigorousFactor', 'restDays', 'longSession', 'hybridGapHours'],
  },
  { group: 'guardrails', keys: ['minAge', 'underweightBmi', 'gentleOnlyBmi', 'doctorBmi'] },
];
