// The four starting programs named in PRD F7. Each lands inside the bands of docs/SCIENCE.md section 11 for every
// muscle (tests/unit/data.test.ts checks). Weekday 0 is Monday.
import type { Session } from '../../../shared/records';

export type Template = { id: string; name: string; daysPerWeek: number; sessions: Session[] };

// [id, sets, reps from, reps to]
type Line = [string, number, number, number];
const session = (key: string, weekday: number, name: string, minutes: number, lines: Line[]): Session => ({
  key,
  weekday,
  name,
  type: 'strength',
  minutes,
  intensity: 'moderate',
  exercises: lines.map(([exerciseId, sets, repsMin, repsMax]) => ({ exerciseId, sets, repsMin, repsMax })),
});

export const TEMPLATES: Template[] = [
  {
    id: 'full-body-3',
    name: 'Full body 3 days',
    daysPerWeek: 3,
    sessions: [
      session('a', 0, 'Full body A', 75, [
        ['back-squat', 3, 5, 8], ['bench-press', 4, 6, 10], ['barbell-row', 3, 6, 10], ['romanian-deadlift', 2, 8, 12],
        ['lateral-raise', 2, 12, 15], ['barbell-curl', 2, 8, 12], ['triceps-pushdown', 2, 10, 15],
        ['standing-calf-raise', 3, 10, 15], ['plank', 2, 30, 60],
      ]),
      session('b', 2, 'Full body B', 75, [
        ['deadlift', 3, 3, 6], ['incline-db-press', 3, 8, 12], ['lat-pulldown', 3, 8, 12], ['leg-press', 3, 10, 15],
        ['db-shoulder-press', 2, 8, 12], ['hammer-curl', 2, 10, 15], ['seated-calf-raise', 4, 12, 20],
        ['hanging-leg-raise', 2, 8, 15],
      ]),
      session('c', 4, 'Full body C', 75, [
        ['front-squat', 3, 6, 10], ['db-bench-press', 3, 8, 12], ['seated-cable-row', 3, 8, 12],
        ['lying-leg-curl', 4, 10, 15], ['hip-thrust', 2, 8, 12], ['overhead-cable-extension', 2, 10, 15],
        ['incline-db-curl', 2, 10, 15], ['lateral-raise', 2, 12, 15], ['standing-calf-raise', 3, 10, 15],
        ['cable-crunch', 2, 10, 15],
      ]),
    ],
  },
  {
    id: 'upper-lower-4',
    name: 'Upper lower 4 days',
    daysPerWeek: 4,
    sessions: [
      session('a', 0, 'Upper A', 70, [
        ['bench-press', 4, 5, 8], ['barbell-row', 4, 6, 10], ['overhead-press', 3, 6, 10], ['lat-pulldown', 3, 8, 12],
        ['barbell-curl', 3, 8, 12], ['triceps-pushdown', 3, 10, 15],
      ]),
      session('b', 1, 'Lower A', 70, [
        ['back-squat', 4, 5, 8], ['romanian-deadlift', 3, 8, 12], ['leg-extension', 3, 10, 15],
        ['lying-leg-curl', 3, 10, 15], ['standing-calf-raise', 5, 10, 15], ['hanging-leg-raise', 3, 8, 15],
      ]),
      session('c', 3, 'Upper B', 70, [
        ['incline-db-press', 4, 8, 12], ['seated-cable-row', 4, 8, 12], ['pull-up', 3, 6, 10], ['cable-fly', 3, 10, 15],
        ['lateral-raise', 3, 12, 15], ['hammer-curl', 3, 10, 15], ['overhead-cable-extension', 3, 10, 15],
      ]),
      session('d', 4, 'Lower B', 70, [
        ['deadlift', 3, 3, 6], ['leg-press', 4, 10, 15], ['seated-leg-curl', 3, 10, 15], ['hip-thrust', 3, 8, 12],
        ['seated-calf-raise', 5, 12, 20], ['cable-crunch', 4, 10, 15],
      ]),
    ],
  },
  {
    id: 'push-pull-legs-6',
    name: 'Push pull legs 6 days',
    daysPerWeek: 6,
    sessions: [
      session('a', 0, 'Push A', 60, [
        ['bench-press', 3, 5, 8], ['overhead-press', 3, 6, 10], ['incline-db-press', 3, 8, 12],
        ['lateral-raise', 2, 12, 15], ['triceps-pushdown', 3, 10, 15],
      ]),
      session('b', 1, 'Pull A', 60, [
        ['deadlift', 2, 3, 6], ['pull-up', 3, 6, 10], ['barbell-row', 3, 6, 10], ['face-pull', 2, 12, 15],
        ['barbell-curl', 3, 8, 12],
      ]),
      session('c', 2, 'Legs A', 60, [
        ['back-squat', 3, 5, 8], ['romanian-deadlift', 3, 8, 12], ['leg-extension', 2, 10, 15],
        ['standing-calf-raise', 5, 10, 15], ['hanging-leg-raise', 4, 8, 15],
      ]),
      session('d', 3, 'Push B', 60, [
        ['db-bench-press', 3, 8, 12], ['db-shoulder-press', 3, 8, 12], ['cable-fly', 3, 10, 15],
        ['cable-lateral-raise', 3, 12, 15], ['overhead-cable-extension', 3, 10, 15],
      ]),
      session('e', 4, 'Pull B', 60, [
        ['lat-pulldown', 3, 8, 12], ['seated-cable-row', 3, 8, 12], ['db-row', 2, 8, 12], ['hammer-curl', 3, 10, 15],
      ]),
      session('f', 5, 'Legs B', 60, [
        ['leg-press', 3, 10, 15], ['lying-leg-curl', 4, 10, 15], ['hip-thrust', 2, 8, 12], ['walking-lunge', 2, 10, 12],
        ['seated-calf-raise', 5, 12, 20], ['cable-crunch', 4, 10, 15],
      ]),
    ],
  },
  {
    id: 'minimal-2',
    name: 'Minimal 2 days',
    daysPerWeek: 2,
    sessions: [
      session('a', 0, 'Full body A', 90, [
        ['back-squat', 4, 5, 8], ['bench-press', 4, 6, 10], ['chin-up', 4, 6, 10], ['romanian-deadlift', 4, 8, 12],
        ['lying-leg-curl', 3, 10, 15], ['overhead-press', 3, 6, 10], ['triceps-pushdown', 2, 10, 15],
        ['standing-calf-raise', 5, 10, 15], ['hanging-leg-raise', 3, 8, 15],
      ]),
      session('b', 3, 'Full body B', 90, [
        ['deadlift', 3, 3, 6], ['leg-press', 5, 10, 15], ['dip', 4, 6, 12], ['incline-db-press', 2, 8, 12],
        ['barbell-row', 4, 6, 10], ['lateral-raise', 2, 12, 15], ['barbell-curl', 4, 8, 12],
        ['seated-calf-raise', 5, 12, 20], ['cable-crunch', 4, 10, 15],
      ]),
    ],
  },
];
