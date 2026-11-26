// The daily analysis quota in Postgres (TECH-SPEC section 7): bump_ai_usage counts and checks the user's limit in one
// statement; the day's rows then give the user's count and the total across users for the global cap.
import type { SupabaseClient } from '@supabase/supabase-js';

export type Usage = { allowed: boolean; used: number; total: number };

/** The free plan's AI advice this month so far (27 Nov); the server's own client reads it, no user can. */
export async function adviceUsed(db: SupabaseClient, userId: string, month: string): Promise<number> {
  const r = await db.from('ai_advice').select('count').eq('user_id', userId).eq('month', month).maybeSingle();
  if (r.error) throw r.error;
  return (r.data as { count: number } | null)?.count ?? 0;
}
/** The free plan's AI advice (27 Nov): counts one for the user's month (its first day, UTC) and returns the month's count. */
export async function bumpAdvice(db: SupabaseClient, userId: string, month: string): Promise<number> {
  const r = await db.rpc('bump_ai_advice', { p_user: userId, p_month: month });
  if (r.error) throw r.error;
  return Number(r.data);
}

export async function bumpUsage(db: SupabaseClient, userId: string, day: string, limit: number): Promise<Usage> {
  const bump = await db.rpc('bump_ai_usage', { p_user: userId, p_day: day, p_limit: limit });
  if (bump.error) throw bump.error;
  // shortcut: reads every row of the day to sum it; fine under the 400 a day cap, a SQL sum once there are many users
  const rows = await db.from('ai_usage').select('user_id, count').eq('day', day);
  if (rows.error) throw rows.error;
  const used = rows.data.find((r) => r.user_id === userId)?.count ?? 1;
  const total = rows.data.reduce((s, r) => s + r.count, 0);
  return { allowed: bump.data === true, used, total };
}
