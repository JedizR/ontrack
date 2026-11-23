// The Vercel functions on the dev server for `pnpm dev:live`, through the same handlers. On the mock backend,
// dev/mock-backend.ts answers /api/account, /api/analyze, /api/coach and /api/billing instead.
import { loadEnv, type Plugin } from 'vite';
import { toMiddleware } from './mock-backend.ts';
import { account } from '../server/handlers/account.ts';
import { analyze } from '../server/handlers/analyze.ts';
import { coach } from '../server/handlers/coach.ts';
import { billing } from '../server/handlers/billing.ts';

export function devApi(): Plugin {
  return {
    name: 'ontrack-dev-api',
    configureServer(s) {
      if (process.env.VITE_BACKEND === 'mock') return;
      // the vision settings and the Gemini key may sit in .env.local; the shell's environment wins
      for (const [k, v] of Object.entries(loadEnv(s.config.mode, process.cwd(), ['VISION_', 'GEMINI_', 'AI_', 'STRIPE_']))) process.env[k] ??= v;
      s.middlewares.use('/api/account', toMiddleware(account));
      s.middlewares.use('/api/analyze', toMiddleware((r) => analyze(r)));
      s.middlewares.use('/api/coach', toMiddleware((r) => coach(r)));
      s.middlewares.use('/api/billing', toMiddleware((r) => billing(r)));
    },
  };
}
