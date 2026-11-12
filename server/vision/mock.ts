// The mock provider for dev and tests: fixtures from tests/fixtures/vision/, chosen by a hash of the input. A
// description that says "not food" or "fail" picks those cases; the mock backend can also name the next fixture.
import { createHash } from 'node:crypto';
import type { VisionProvider } from './provider.js';
import basilPork from '../../tests/fixtures/vision/basil-pork.json' with { type: 'json' };
import chickenRice from '../../tests/fixtures/vision/chicken-rice.json' with { type: 'json' };
import oatsBanana from '../../tests/fixtures/vision/oats-banana.json' with { type: 'json' };
import notFood from '../../tests/fixtures/vision/not-food.json' with { type: 'json' };
import fail from '../../tests/fixtures/vision/fail.json' with { type: 'json' };
import padThai from '../../tests/fixtures/vision/pad-thai.json' with { type: 'json' };
import labelSnack from '../../tests/fixtures/vision/label-snack.json' with { type: 'json' };
import labelWhey from '../../tests/fixtures/vision/label-whey.json' with { type: 'json' };
import notLabel from '../../tests/fixtures/vision/not-label.json' with { type: 'json' };

// pad-thai (N1, a Thai dish from the table) is chosen by name only, so the hash below picks what it always did
// the labels (B1) answer label reads: rice crackers by default, whey and not a label by name
const FIXTURES: Record<string, object> = { 'basil-pork': basilPork, 'chicken-rice': chickenRice, 'oats-banana': oatsBanana, 'not-food': notFood, fail, 'pad-thai': padThai, 'label-snack': labelSnack, 'label-whey': labelWhey, 'not-label': notLabel };
const FOOD = ['basil-pork', 'chicken-rice', 'oats-banana'];
export const isFixture = (name: unknown): name is string => typeof name === 'string' && Object.hasOwn(FIXTURES, name);

/** The fixture's reply, or the HTTP failure it stands for. */
export function fixture(name: string): unknown {
  const f = FIXTURES[name];
  if ('fail' in f) throw Object.assign(new Error('mock provider failure'), { status: f.fail });
  return structuredClone(f);
}

export const mockProvider: VisionProvider = {
  model: 'mock',
  async analyze(i) {
    if (i.label) return fixture('label-snack');
    const said = (i.text ?? i.hint ?? '').toLowerCase();
    if (said.includes('not food')) return fixture('not-food');
    if (said.includes('fail')) return fixture('fail');
    const h = createHash('sha256').update(i.image ?? said).digest();
    return fixture(FOOD[h[0] % FOOD.length]);
  },
};
