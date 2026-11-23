// R5 freemium: the plan this account is on, as the server keeps it (POST /api/billing), kept on the phone per account so
// it shows at once and offline. Checkout leaves for Stripe and comes back to `/?checkout=<session>`, confirmed here.
import { session } from '$lib/session.svelte';
import { FREE, isPro, type Billing, type BillingRequest, type BillingResponse, type Interval } from '../../shared/plans';

const key = (user: string) => `ot-plan:${user}`;
function kept(user: string | undefined): Billing {
  try { return (user && JSON.parse(localStorage.getItem(key(user)) ?? 'null')) || FREE; } catch { return FREE; }
}

class Membership {
  /** the plan as the server last said */
  current = $state<Billing>(FREE);
  /** a checkout or a change is on its way */
  busy = $state(false);
  get pro() { return isPro(this.current); }

  /** The account's plan from the phone, then from the server. Back from Checkout (`confirming`), the confirmation asks
   *  instead: a status at the same time could save the old subscription over the new one. */
  async load(confirming = false) {
    const user = session.user?.userId;
    this.current = kept(user);
    if (user && !confirming) await this.#call({ action: 'status' });
  }
  /** The kept period has ended: it may have renewed, so ask again (the app was left open across it). */
  get stale() { return this.current.tier === 'pro' && !!this.current.periodEnd && Date.parse(this.current.periodEnd) < Date.now(); }

  async #call(req: BillingRequest): Promise<BillingResponse | null> {
    const user = session.user?.userId;
    const token = await session.backend?.accessToken().catch(() => null);
    if (!user || !token || !navigator.onLine) return null;
    try {
      const res = await fetch('/api/billing', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(req), signal: AbortSignal.timeout(20_000) });
      const body = (await res.json().catch(() => null)) as BillingResponse | null;
      if (body?.ok && session.user?.userId === user) {
        this.current = body.billing;
        localStorage.setItem(key(user), JSON.stringify(body.billing));
      }
      return body;
    } catch {
      return null;
    }
  }

  /** Off to Stripe's Checkout for Pro; false when it cannot start (offline, or no Stripe on this server). */
  async checkout(interval: Interval): Promise<boolean> {
    this.busy = true;
    const r = await this.#call({ action: 'checkout', interval });
    if (r?.ok && r.url) {
      location.assign(r.url);
      return true; // busy until the page leaves
    }
    this.busy = false;
    return false;
  }
  /** Back from Checkout: the session Stripe finished, made the account's plan. */
  async confirm(id: string) {
    this.busy = true;
    const r = await this.#call({ action: 'confirm', session: id });
    if (!r?.ok) await this.#call({ action: 'status' });
    this.busy = false;
    return !!r?.ok && isPro(r.billing);
  }
  /** Cancel or resume at the end of the period: Pro stays until then either way. */
  async change(action: 'cancel' | 'resume') {
    this.busy = true;
    const r = await this.#call({ action });
    this.busy = false;
    return !!r?.ok;
  }
}

/** The account's plan: `membership.pro`, and the calls that change it. */
export const membership = new Membership();
