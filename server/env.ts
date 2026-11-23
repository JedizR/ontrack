// Server configuration, read at call time. Secrets live only here and in Vercel; nothing under src/ imports this.
type Name = 'SUPABASE_URL' | 'SUPABASE_SECRET_KEY' | 'CRON_SECRET' | 'VISION_PROVIDER' | 'GEMINI_API_KEY' | 'GEMINI_MODEL' | 'GEMINI_FALLBACK_MODEL' | 'AI_DAILY_USER_LIMIT' | 'AI_DAILY_GLOBAL_CAP'
  // R5 freemium: the free plan's daily AI logs, and Stripe (test mode for the course: Checkout bills 0 THB)
  | 'AI_DAILY_FREE_LIMIT' | 'STRIPE_SECRET_KEY'
  // R5 AI: the main model's thinking level for photo analysis, minimal (default), low or medium
  | 'GEMINI_THINKING';
export const env = (name: Name): string => process.env[name] ?? '';
/** A whole number from the environment, or the default when unset or not a number. */
export const envInt = (name: Name, fallback: number) => {
  const v = Number.parseInt(env(name), 10);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};
