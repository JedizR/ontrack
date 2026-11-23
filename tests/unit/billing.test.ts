// R5 freemium: POST /api/billing with a fake Stripe. Checkout at the plan's price with the 0 THB coupon, confirmation only
// for the caller's own finished session, cancel and resume at the period's end, a lapsed period read again.
import { describe, expect, test } from 'vitest';
import { billing, billingOf, COUPON, type Deps } from '../../server/handlers/billing';
import { isPro, PRICES, type Billing } from '../../shared/plans';
import type { StripeCall } from '../../server/stripe';

const END = Math.floor(Date.parse('2030-01-01T00:00:00Z') / 1000);
const sub = (o: object = {}) => ({ id: 'sub_1', status: 'active', customer: 'cus_1', items: { data: [{ current_period_end: END, price: { recurring: { interval: 'year' } } }] }, ...o });

function setup(start: Billing = { tier: 'free' }, configured = true) {
  const calls: [string, string, Record<string, string> | undefined][] = [];
  let saved: Billing | null = null;
  const stripe: StripeCall = async (method, path, params) => {
    calls.push([method, path, params]);
    if (path === 'coupons') throw Object.assign(new Error('exists'), { code: 'resource_already_exists' });
    if (path === 'checkout/sessions') return { url: 'https://checkout.stripe.test/s' } as never;
    if (path === 'checkout/sessions/cs_mine') return { client_reference_id: 'u1', status: 'complete', subscription: sub() } as never;
    if (path === 'checkout/sessions/cs_other') return { client_reference_id: 'u2', status: 'complete', subscription: sub() } as never;
    if (path === 'subscriptions/sub_1') return sub(method === 'POST' ? { cancel_at_period_end: params?.cancel_at_period_end === 'true' } : { status: 'canceled' }) as never;
    throw new Error(path);
  };
  const deps: Deps = { caller: async (r) => (r.headers.get('authorization') === 'Bearer good' ? { id: 'u1', email: 'a@b.c', billing: start } : null), save: async (_, b) => void (saved = b), stripe, configured };
  const post = async (body: object, token = 'good') => {
    const r = await billing(new Request('https://ontrack.test/api/billing', { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) }), deps);
    return { status: r.status, body: (await r.json()) as { ok: boolean; billing?: Billing; url?: string; error?: string } };
  };
  return { post, calls, saved: () => saved };
}

describe('POST /api/billing', () => {
  test('needs a token and a known action', async () => {
    const { post } = setup();
    expect((await post({ action: 'status' }, 'bad')).status).toBe(401);
    expect((await post({ action: 'refund' })).status).toBe(400);
  });

  test('checkout: the plan price in satang, the preview coupon, no card when nothing is due, back to the app', async () => {
    const { post, calls } = setup();
    const r = await post({ action: 'checkout', interval: 'year' });
    expect(r.body.url).toBe('https://checkout.stripe.test/s');
    const p = calls.find((c) => c[1] === 'checkout/sessions')![2]!;
    expect(p['line_items[0][price_data][unit_amount]']).toBe(String(PRICES.year * 100));
    expect(p['line_items[0][price_data][currency]']).toBe('thb');
    expect([p['discounts[0][coupon]'], p.payment_method_collection, p.client_reference_id, p.mode]).toEqual([COUPON, 'if_required', 'u1', 'subscription']);
    expect(p.success_url).toBe('https://ontrack.test/?checkout={CHECKOUT_SESSION_ID}');
  });

  test('checkout (R5 review): a Pro subscriber starts no second subscription; a returning one keeps their customer', async () => {
    const pro = setup({ tier: 'pro', subscription: 'sub_1', customer: 'cus_1', periodEnd: '2030-01-01T00:00:00.000Z' });
    const r = await pro.post({ action: 'checkout', interval: 'month' });
    expect([r.status, r.body.url, pro.calls.length]).toEqual([200, undefined, 0]);
    const back = setup({ tier: 'free', subscription: 'sub_1', customer: 'cus_1', periodEnd: '2020-01-01T00:00:00.000Z' });
    await back.post({ action: 'checkout', interval: 'month' });
    const p = back.calls.find((c) => c[1] === 'checkout/sessions')![2]!;
    expect([p.customer, p.customer_email]).toEqual(['cus_1', undefined]);
  });

  test('confirm: only the caller own finished session makes Pro', async () => {
    const mine = setup();
    const r = await mine.post({ action: 'confirm', session: 'cs_mine' });
    expect(r.body.billing).toMatchObject({ tier: 'pro', interval: 'year', subscription: 'sub_1', periodEnd: '2030-01-01T00:00:00.000Z' });
    expect(mine.saved()?.tier).toBe('pro');
    const other = setup();
    expect((await other.post({ action: 'confirm', session: 'cs_other' })).body.error).toBe('not_paid');
    expect(other.saved()).toBeNull();
  });

  test('cancel keeps Pro to the period end; a lapsed period is read again from Stripe', async () => {
    const pro: Billing = { tier: 'pro', interval: 'year', subscription: 'sub_1', periodEnd: '2030-01-01T00:00:00.000Z' };
    expect((await setup(pro).post({ action: 'cancel' })).body.billing).toMatchObject({ tier: 'pro', cancelAt: true });
    const lapsed = setup({ ...pro, periodEnd: '2020-01-01T00:00:00.000Z' });
    expect((await lapsed.post({ action: 'status' })).body.billing?.tier).toBe('free');
  });

  test('without a Stripe key, status still answers and checkout says unavailable', async () => {
    const { post } = setup({ tier: 'free' }, false);
    expect((await post({ action: 'status' })).body).toEqual({ ok: true, billing: { tier: 'free' } });
    expect((await post({ action: 'checkout', interval: 'month' })).status).toBe(503);
  });

  test('isPro and billingOf', () => {
    expect([isPro(undefined), isPro({ tier: 'free' }), isPro({ tier: 'pro' }), isPro({ tier: 'pro', periodEnd: '2020-01-01T00:00:00Z' })]).toEqual([false, false, true, false]);
    expect(billingOf(sub({ status: 'canceled' })).tier).toBe('free');
  });
});
