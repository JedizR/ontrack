import { describe, expect, it } from 'vitest';
import { heaviest, lastSets, newBests, totals } from '../../src/lib/model/workout';
import type { Workout } from '../../shared/records';

const w = (lifts: Workout['lifts']): Workout => ({ startedAt: '2026-11-10T03:00:00.000Z', seconds: 3000, lifts });
const bench = (...sets: [number, number][]) => ({ exerciseId: 'bench-press', sets: sets.map(([kg, reps]) => ({ kg, reps })) });

describe('workout log', () => {
  it('adds up the sets, reps and volume, and leaves out a set with no reps', () => {
    expect(totals(w([bench([60, 8], [60, 8], [60, 0]), { exerciseId: 'squat', sets: [{ kg: 100, reps: 5 }] }]))).toEqual({ sets: 3, reps: 21, volumeKg: 60 * 16 + 500 });
  });
  it('starts from the latest workout that lifted the exercise', () => {
    const logs = [{ date: '2026-11-03', workout: w([bench([55, 8])]) }, { date: '2026-11-10', workout: w([bench([60, 8], [60, 7])]) }, { date: '2026-11-12' }];
    expect(lastSets(logs, 'bench-press')).toEqual([{ kg: 60, reps: 8 }, { kg: 60, reps: 7 }]);
    expect(lastSets(logs, 'squat')).toBeNull();
  });
  it('finds the heaviest weight, the more reps winning a tie', () => {
    const logs = [{ date: '2026-11-03', workout: w([bench([60, 6])]) }, { date: '2026-11-10', workout: w([bench([60, 8], [55, 10])]) }];
    expect(heaviest(logs).get('bench-press')).toEqual({ kg: 60, reps: 8, date: '2026-11-10' });
  });
  it('calls a lift a new best only when it beats an earlier one', () => {
    const before = [{ date: '2026-11-03', workout: w([bench([60, 8])]) }];
    expect(newBests(before, w([bench([62.5, 6])]))).toEqual([{ exerciseId: 'bench-press', kg: 62.5, reps: 6 }]);
    expect(newBests(before, w([bench([60, 10])]))).toEqual([]);
    expect(newBests([], w([bench([60, 8])]))).toEqual([]); // the first time has nothing to beat
  });
});
