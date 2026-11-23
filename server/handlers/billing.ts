// POST /api/billing (R5 freemium): the caller's plan, a Stripe Checkout for Pro, its confirmation on the way back, and
// cancel or resume at the period's end. The plan lives in the user's app_metadata, written here only. The dependencies
// are passed in so the mock backend and the unit tests run this same handler with a fake Stripe.
import { admin, caller, saveBilling, type Caller } from '../auth.js';
import { json } from '../http.js';
import { env } from '../env.js';
import { stripe, type StripeCall } from '../stripe.js';
import { billingRequest, isPro, PRICES, TRIAL_DAYS, type Billing, type BillingError, type Interval } from '../../shared/plans.js';

export type Deps = {
  caller(request: Request): Promise<Caller | null>;
  save(id: string, billing: Billing): Promise<void>;
  stripe: StripeCall;
  /** a Stripe key is set */
  configured: boolean;
};

const STATUS: Record<BillingError, number> = { bad_request: 400, unauthorized: 401, unavailable: 503, not_paid: 402, provider_error: 502 };
const fail = (error: BillingError) => json(STATUS[error], { ok: false, error });
const ok = (billing: Billing, url?: string) => json(200, { ok: true, billing, ...(url ? { url } : {}) });
/** The course preview: every Pro bill is 0 THB (the owner, 22 Nov), made by one 100 percent coupon on each checkout. */
export const COUPON = 'ontrack-preview';

export const liveDeps = (): Deps => {
  const db = admin();
  return { caller: (r) => caller(r, db), save: (id, b) => saveBilling(db, id, b), stripe, configured: !!env('STRIPE_SECRET_KEY') };
};

type Sub = { id: string; status: string; customer: string; cancel_at_period_end?: boolean; current_period_end?: number; items?: { data?: { current_period_end?: number; price?: { recurring?: { interval?: string } } }[] } };
/** The plan a Stripe subscription gives. Newer API versions keep the period end on the item. */
export function billingOf(s: Sub): Billing {
  const item = s.items?.data?.[0];
  const end = s.current_period_end ?? item?.current_period_end;
  const interval = item?.price?.recurring?.interval;
  return {
    tier: ['active', 'trialing', 'past_due'].includes(s.status) ? 'pro' : 'free',
    ...(interval === 'month' || interval === 'year' ? { interval } : {}),
    ...(end ? { periodEnd: new Date(end * 1000).toISOString() } : {}),
    ...(s.status === 'trialing' ? { trial: true } : {}),
    ...(s.cancel_at_period_end ? { cancelAt: true } : {}),
    customer: s.customer,
    subscription: s.id,
  };
}

export async function billing(request: Request, deps: Deps = liveDeps()): Promise<Response> {
  if (request.method !== 'POST') return fail('bad_request');
  const user = await deps.caller(request);
  if (!user) return fail('unauthorized');
  let parsed;
  try { parsed = billingRequest.safeParse(await request.json()); } catch { return fail('bad_request'); }
  if (!parsed.success) return fail('bad_request');
  const req = parsed.data;
  const b = user.billing;
  try {
    if (req.action === 'status') {
      // a period that ended may have renewed (or lapsed): ask Stripe once, then keep its answer
      if (b.subscription && deps.configured && b.periodEnd && Date.parse(b.periodEnd) < Date.now()) {
        const next = billingOf(await deps.stripe<Sub>('GET', `subscriptions/${b.subscription}`));
        await deps.save(user.id, next);
        return ok(next);
      }
      return ok(isPro(b) ? b : b.tier === 'pro' ? { ...b, tier: 'free' } : b);
    }
    if (!deps.configured) return fail('unavailable');
    // already Pro: a second checkout would start a second subscription the app could not cancel, so no new checkout
    if (req.action === 'checkout') return isPro(b) && b.subscription ? ok(b) : ok(b, await checkout(deps, user, req.interval, new URL(request.url).origin));
    if (req.action === 'confirm') {
      const s = await deps.stripe<{ client_reference_id?: string; status?: string; subscription?: Sub | string }>('GET', `checkout/sessions/${encodeURIComponent(req.session)}`, { 'expand[]': 'subscription' });
      // another account's session, or one that did not finish, changes nothing
      if (s.client_reference_id !== user.id || s.status !== 'complete' || !s.subscription || typeof s.subscription === 'string') return fail('not_paid');
      const next = billingOf(s.subscription);
      await deps.save(user.id, next);
      return ok(next);
    }
    // cancel and resume: Pro stays to the end of the period either way
    if (!b.subscription) return fail('bad_request');
    const next = billingOf(await deps.stripe<Sub>('POST', `subscriptions/${b.subscription}`, { cancel_at_period_end: String(req.action === 'cancel') }));
    await deps.save(user.id, next);
    return ok(next);
  } catch (e) {
    console.error('billing failed', req.action, (e as Error).message);
    return fail('provider_error');
  }
}

/** A Checkout Session for Pro at its price in baht after the trial, with the preview coupon (made on first use), no card when nothing is due. */
async function checkout(deps: Deps, user: Caller, interval: Interval, origin: string): Promise<string> {
  await deps.stripe('POST', 'coupons', { id: COUPON, percent_off: '100', duration: 'forever', name: 'Course preview' }).catch((e: { code?: string }) => {
    if (e.code !== 'resource_already_exists') throw e;
  });
  const s = await deps.stripe<{ url: string }>('POST', 'checkout/sessions', {
    mode: 'subscription',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'thb',
    'line_items[0][price_data][unit_amount]': String(PRICES[interval] * 100),
    'line_items[0][price_data][recurring][interval]': interval,
    'line_items[0][price_data][product_data][name]': interval === 'year' ? 'Ontrack Pro, yearly' : 'Ontrack Pro, monthly',
    'discounts[0][coupon]': COUPON,
    payment_method_collection: 'if_required',
    client_reference_id: user.id,
    // a returning subscriber keeps their Stripe customer; Stripe takes one or the other
    ...(user.billing.customer ? { customer: user.billing.customer } : user.email ? { customer_email: user.email } : {}),
    'subscription_data[metadata][user]': user.id,
    'subscription_data[trial_period_days]': String(TRIAL_DAYS),
    success_url: `${origin}/?checkout={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=cancel`,
    locale: 'en',
  });
  return s.url;
}
