// R5 freemium: the plans in one place, for the app's paywall, the server's checkout and its daily limits
// (docs/DECISIONS.md, R5; the pricing model in /Users/admin/destination/assignment/Ontrack-financial-model.xlsx).
import * as z from 'zod/mini';

/** Pro's prices in baht (the R5 model: the top of the Thai band, under Cal AI and MacroFactor). Stripe bills in satang. */
export const PRICES = { month: 199, year: 990 } as const;
/** Days of Pro before the first bill, on either plan. */
export const TRIAL_DAYS = 7;
export type Interval = keyof typeof PRICES;
/** AI logs (a meal photo, a description, a label) a day on the free plan; Pro is unlimited, with a fair use cap. */
export const FREE_AI_PER_DAY = 3;
export const PRO_AI_PER_DAY = 100;

/** The account's plan as the server keeps it (Supabase `app_metadata.billing`, written only by the server). */
export const billingSchema = z.object({
  tier: z.enum(['free', 'pro']),
  interval: z.optional(z.enum(['month', 'year'])),
  /** when the paid period ends, ISO */
  periodEnd: z.optional(z.string()),
  /** in the free days before the first bill; periodEnd is when they end */
  trial: z.optional(z.boolean()),
  /** cancelled: Pro until periodEnd, then free */
  cancelAt: z.optional(z.boolean()),
  customer: z.optional(z.string()),
  subscription: z.optional(z.string()),
});
export type Billing = z.infer<typeof billingSchema>;
export const FREE: Billing = { tier: 'free' };

/** Pro now: the tier, and a period that has not ended (a day of grace for a renewal the app has not seen yet). */
export const isPro = (b: Billing | undefined, now = Date.now()) =>
  b?.tier === 'pro' && (!b.periodEnd || Date.parse(b.periodEnd) + 86_400_000 > now);

export const billingRequest = z.discriminatedUnion('action', [
  z.object({ action: z.literal('status') }),
  z.object({ action: z.literal('checkout'), interval: z.enum(['month', 'year']) }),
  z.object({ action: z.literal('confirm'), session: z.string().check(z.minLength(1), z.maxLength(200)) }),
  z.object({ action: z.literal('cancel') }),
  z.object({ action: z.literal('resume') }),
]);
export type BillingRequest = z.infer<typeof billingRequest>;
export type BillingError = 'bad_request' | 'unauthorized' | 'unavailable' | 'not_paid' | 'provider_error';
export type BillingResponse = { ok: true; billing: Billing; url?: string } | { ok: false; error: BillingError };
