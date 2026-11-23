// Server side Supabase access with the secret key, and the caller's identity from their bearer token.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { billingSchema, FREE, type Billing } from '../shared/plans.js';

export const admin = (): SupabaseClient =>
  createClient(env('SUPABASE_URL'), env('SUPABASE_SECRET_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });

export type Caller = { id: string; email?: string; billing: Billing };
/** The user behind `Authorization: Bearer <access token>`, verified by Supabase, or null. R5: with the plan the server
 * keeps in their `app_metadata` (only the secret key writes it), free when there is none. */
export async function caller(request: Request, db: SupabaseClient): Promise<Caller | null> {
  const token = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  const billing = billingSchema.safeParse(data.user.app_metadata?.billing);
  return { id: data.user.id, email: data.user.email, billing: billing.success ? billing.data : FREE };
}
/** R5: keeps the plan on the user, beside the provider fields app_metadata already holds (GoTrue merges the keys). */
export async function saveBilling(db: SupabaseClient, id: string, billing: Billing) {
  const { error } = await db.auth.admin.updateUserById(id, { app_metadata: { billing } });
  if (error) throw new Error(error.message);
}
