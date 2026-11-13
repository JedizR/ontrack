// The science screen's data: every constant in exactly one group with a heading and a plain name, every source cited.
import { expect, test } from 'vitest';
import { C } from '../../src/lib/model/engine';
import { SCIENCE } from '../../src/lib/data/science';
import { SOURCES } from '../../src/lib/data/sources';
import { en } from '../../src/lib/i18n/en';

test('every key of C is in exactly one group, and every group has a heading', () => {
  const listed = SCIENCE.flatMap((g) => g.keys);
  expect([...listed].sort()).toEqual(Object.keys(C).sort());
  for (const { group } of SCIENCE) expect(en.science.groups[group], group).toBeTruthy();
});

test('every key of C has a plain name, and no name is left over', () => {
  expect(Object.keys(en.science.names).sort()).toEqual(Object.keys(C).sort());
});

test('every source id C uses, other than OT, has a citation', () => {
  for (const id of new Set(Object.values(C).map((c) => c.source))) {
    if (id !== 'OT') expect(SOURCES[id]?.cite, id).toBeTruthy();
  }
});
