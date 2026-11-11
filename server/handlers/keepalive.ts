// GET /api/cron/keepalive: one trivial query a day so the free Supabase project is not paused for inactivity.
import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { env } from '../env.js';
import { json } from '../http.js';

const authorized = (header: string | null, secret: string) => {
  if (!secret || !header) return false; // never open when the secret is unset
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function keepalive(request: Request): Promise<Response> {
  if (!authorized(request.headers.get('authorization'), env('CRON_SECRET'))) return json(401, { ok: false, error: 'unauthorized' });
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SECRET_KEY'), { auth: { persistSession: false } });
  const { error } = await db.from('records').select('id').limit(1);
  if (error) {
    console.error('keepalive failed', error.code);
    return json(502, { ok: false, error: 'provider_error' });
  }
  return json(200, { ok: true });
}
