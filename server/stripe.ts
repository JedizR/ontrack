// Stripe's REST API with fetch, no SDK: Checkout for Pro, then the subscription it made (R5). The key is test mode for
// the course, and a 100 percent preview coupon makes every bill 0 THB with no card asked for.
import { env } from './env.js';

export type StripeCall = <T = Record<string, unknown>>(method: 'GET' | 'POST', path: string, params?: Record<string, string>) => Promise<T>;

export class StripeError extends Error {
  constructor(message: string, readonly code: string | undefined, readonly status: number) { super(message); }
}

export const stripe: StripeCall = async (method, path, params) => {
  const body = params ? new URLSearchParams(params).toString() : '';
  const url = `https://api.stripe.com/v1/${path}${method === 'GET' && body ? `?${body}` : ''}`;
  const res = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${env('STRIPE_SECRET_KEY')}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: method === 'POST' ? body : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: string } };
  if (!res.ok) throw new StripeError(json.error?.message ?? `stripe ${res.status}`, json.error?.code, res.status);
  return json as never;
};
