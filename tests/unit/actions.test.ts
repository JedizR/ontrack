// Actions validate before they write, stamp through the store, and hand back an undo for deletes.
import 'fake-indexeddb/auto';
import { beforeAll, expect, test } from 'vitest';
import { db } from '../../src/lib/db/store.svelte';
import { deleteMeal, logWeight, saveMeal } from '../../src/lib/actions';

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
