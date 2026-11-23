// Calling a provider: the time it may take, and the fallback model. Shared by the vision and coach providers.

export class Timeout extends Error {}
/** What `run` answers, or Timeout after `ms`, aborting the call through the signal `run` is given. */
export async function within<T>(run: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ac = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => { timer = setTimeout(() => { reject(new Timeout()); ac.abort(); }, ms); });
  try {
    return await Promise.race([run(ac.signal), late]);
  } finally {
    clearTimeout(timer);
  }
}

const status = (e: unknown) => (e as { status?: number }).status ?? 0;
const RETRY_MS = 700;

/**
 * `call(model)`, or `call(fallback)` when the model is spent (429) or busy (503): the fallback (Flash-Lite) has its own
 * free daily quota, docs/EVAL-NOTES.md 13 November. A busy (503) model is tried once more after a moment first, so a
 * blip does not hand the user a weaker model; a spent one is not, it stays spent. Any other failure is thrown. Gives
 * the model that answered.
 */
export async function withFallback<T>(model: string, fallback: string, call: (model: string) => Promise<T>, retryMs = RETRY_MS): Promise<{ res: T; model: string }> {
  let failure: unknown;
  try {
    return { res: await call(model), model };
  } catch (e) {
    failure = e;
  }
  if (fallback && status(failure) === 503) {
    await new Promise((r) => setTimeout(r, retryMs));
    try {
      return { res: await call(model), model };
    } catch (e) {
      failure = e;
    }
  }
  if (!fallback || ![429, 503].includes(status(failure))) throw failure;
  return { res: await call(fallback), model: fallback };
}
