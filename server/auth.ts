// Server side Supabase access with the secret key, and the caller's identity from their bearer token.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

export const admin = (): SupabaseClient =>
  createClient(env('SUPABASE_URL'), env('SUPABASE_SECRET_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });

/** The user behind `Authorization: Bearer <access token>`, verified by Supabase, or null. */
export async function caller(request: Request, db: SupabaseClient): Promise<{ id: string } | null> {
  const token = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  return error || !data.user ? null : { id: data.user.id };
}
