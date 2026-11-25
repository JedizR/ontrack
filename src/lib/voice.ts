// R7, the owner: speech in Thai, English or both for the Describe field. The browser's own recognition knows one
// language at a time (English only, before), so the phone records a short clip and the server has it written down.
import { MAX_VOICE_SECONDS, VOICE_RATE } from '../../shared/analysis';

type Ctx = typeof AudioContext;
const AudioCtx = (): Ctx | undefined => (typeof window === 'undefined' ? undefined : window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctx }).webkitAudioContext);
export const canRecord = () => !!AudioCtx() && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

/** Mono samples at any rate as a 16 kHz 16-bit WAV: each output sample is the mean of the input it spans, so the drop in rate does not alias. */
export function wav(samples: Float32Array, rate: number): Uint8Array {
  const step = rate / VOICE_RATE;
  const n = Math.floor(samples.length / step);
  const out = new DataView(new ArrayBuffer(44 + n * 2));
  const tag = (at: number, s: string) => { for (let i = 0; i < 4; i++) out.setUint8(at + i, s.charCodeAt(i)); };
  tag(0, 'RIFF'); out.setUint32(4, 36 + n * 2, true); tag(8, 'WAVE');
  tag(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, VOICE_RATE, true); out.setUint32(28, VOICE_RATE * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
  tag(36, 'data'); out.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i * step), b = Math.max(a + 1, Math.floor((i + 1) * step));
    let sum = 0;
    for (let j = a; j < b; j++) sum += samples[j];
    const v = Math.max(-1, Math.min(1, sum / (b - a)));
    out.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new Uint8Array(out.buffer);
}

/** Under 0.3 s: nothing worth sending */
export const tooShort = (clip: Uint8Array) => clip.length < 44 + VOICE_RATE * 2 * 0.3;

export type Recording = { stop(): Uint8Array; cancel(): void };
/** The microphone until `stop` (a WAV) or `cancel`; `onfull` fires at the 15 s limit. Throws as getUserMedia does. */
export async function record(onfull: () => void): Promise<Recording> {
  // the audio starts inside the tap, before the microphone's prompt: Safari runs an AudioContext only from a gesture
  const Audio = AudioCtx()!;
  const ctx = new Audio();
  void ctx.resume().catch(() => {});
  let stream: MediaStream | undefined;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    void ctx.resume().catch(() => {});
    return listen(ctx, stream, onfull);
  } catch (e) {
    for (const t of stream?.getTracks() ?? []) t.stop();
    void ctx.close().catch(() => {});
    throw e;
  }
}

function listen(ctx: AudioContext, stream: MediaStream, onfull: () => void): Recording {
  const source = ctx.createMediaStreamSource(stream);
  // shortcut: ScriptProcessor is deprecated but runs in every Safari and Chrome; move to an AudioWorklet if one drops it
  const node = ctx.createScriptProcessor(4096, 1, 1);
  const max = ctx.sampleRate * MAX_VOICE_SECONDS;
  const chunks: Float32Array[] = [];
  let length = 0;
  node.onaudioprocess = (e) => {
    if (length >= max) return;
    const c = e.inputBuffer.getChannelData(0).slice(0, max - length);
    chunks.push(c);
    length += c.length;
    if (length >= max) onfull();
  };
  source.connect(node);
  node.connect(ctx.destination); // a processor runs only when connected; its output stays silent
  const end = () => { node.onaudioprocess = null; node.disconnect(); source.disconnect(); for (const t of stream.getTracks()) t.stop(); void ctx.close().catch(() => {}); };
  return {
    stop() {
      end();
      const all = new Float32Array(length);
      let at = 0;
      for (const c of chunks) { all.set(c, at); at += c.length; }
      return wav(all, ctx.sampleRate);
    },
    cancel: end,
  };
}
