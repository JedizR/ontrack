// Actions validate before they write, stamp through the store, and hand back an undo for deletes.
import 'fake-indexeddb/auto';
import { beforeAll, expect, test } from 'vitest';
import { db } from '../../src/lib/db/store.svelte';
import { deleteMeal, logAgain, logSaved, logWeight, saveMeal, saveSaved } from '../../src/lib/actions';

beforeAll(() => db.open('actions-test'));

test('a write that fails its schema never reaches the store', () => {
  expect(() => logWeight('11/12/2026', 80)).toThrow();
  expect(() => logWeight('2026-11-12', 4000)).toThrow();
  expect(db.pending).toBe(0);
  logWeight('2026-11-12', 80.2);
  expect(db.get('weight', 'weight:2026-11-12')).toEqual({ date: '2026-11-12', kg: 80.2 });
  expect(db.pending).toBe(1);
});

test('a delete is a tombstone with an undo that brings the record back, newer', () => {
  const id = saveMeal({ date: '2026-11-12', at: '2026-11-12T12:00:00+07:00', title: 'Rice', method: 'quick', items: [{ name: 'Rice', kcal: 200, protein: 4, carbs: 44, fat: 0.4, source: 'manual' }] });
  const before = db.data.meal[id].updatedAt;
  const undo = deleteMeal(id);
  expect(db.get('meal', id)).toBeUndefined();
  expect(db.data.meal[id].deleted).toBe(true);
  undo();
  expect(db.get('meal', id)?.title).toBe('Rice');
  expect(db.data.meal[id].updatedAt).toBeGreaterThan(before);
});

test('a meal logs again with a fresh day and time; a saved meal counts a use, and its undo takes both back', () => {
  const items = [{ name: 'Oats', grams: 80, kcal: 303, protein: 10.5, carbs: 54, fat: 5.5, source: 'db' as const }];
  const again = logAgain({ date: '2026-11-10', at: '2026-11-10T01:00:00.000Z', title: 'Oats', method: 'photo', items, thumb: true }, '2026-11-12', '2026-11-12T02:00:00.000Z');
  expect(db.get('meal', again)).toEqual({ date: '2026-11-12', at: '2026-11-12T02:00:00.000Z', title: 'Oats', method: 'saved', items });

  const sid = saveSaved({ title: 'Breakfast', items, uses: 2, lastUsedAt: '2026-11-01T01:00:00.000Z' });
  const undo = logSaved(sid, '2026-11-12', '2026-11-12T03:00:00.000Z')!;
  const meal = Object.values(db.data.meal).find((r) => r.data.at === '2026-11-12T03:00:00.000Z')!;
  expect(meal.data.method).toBe('saved');
  expect(db.get('saved', sid)?.uses).toBe(3);
  undo();
  expect(db.get('meal', meal.id)).toBeUndefined();
  expect(db.get('saved', sid)).toEqual({ title: 'Breakfast', items, uses: 2, lastUsedAt: '2026-11-01T01:00:00.000Z' });
});
