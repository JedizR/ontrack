// Server configuration, read at call time. Secrets live only here and in Vercel; nothing under src/ imports this.
export const env = (name: 'SUPABASE_URL' | 'SUPABASE_SECRET_KEY' | 'CRON_SECRET'): string => process.env[name] ?? '';
