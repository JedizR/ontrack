import { describe, expect, test } from 'vitest';
import { wav } from '../../src/lib/voice';
import { MAX_VOICE_BYTES, VOICE_RATE } from '../../shared/analysis';

describe('wav', () => {
  test('a 16 kHz mono 16-bit WAV, the input averaged down to its rate', () => {
    // one second at 48 kHz: a third at +0.5, then silence
    const s = new Float32Array(48_000);
    s.fill(0.5, 0, 16_000);
    const out = wav(s, 48_000);
    const v = new DataView(out.buffer);
    const tag = (at: number) => String.fromCharCode(...out.subarray(at, at + 4));
    expect([tag(0), tag(8), tag(12), tag(36)]).toEqual(['RIFF', 'WAVE', 'fmt ', 'data']);
    expect(v.getUint32(24, true)).toBe(VOICE_RATE);
    expect(v.getUint16(22, true)).toBe(1);
    expect(out.length).toBe(44 + VOICE_RATE * 2);
    expect(v.getInt16(44, true)).toBe(Math.floor(0.5 * 0x7fff));
    expect(v.getInt16(44 + 2 * 6000, true)).toBe(0);
  });

  test('44.1 kHz lands on whole samples and clips past full scale; 15 s fits the server limit', () => {
    const out = wav(new Float32Array(44_100).fill(2), 44_100);
    expect(out.length).toBe(44 + VOICE_RATE * 2);
    expect(new DataView(out.buffer).getInt16(44, true)).toBe(0x7fff);
    expect(wav(new Float32Array(48_000 * 15), 48_000).length).toBe(MAX_VOICE_BYTES);
  });
});
