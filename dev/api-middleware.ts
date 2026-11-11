// The Vercel functions on the dev server for `pnpm dev:live`, through the same handlers. On the mock backend,
// dev/mock-backend.ts answers /api/account instead.
import type { Plugin } from 'vite';
import { toMiddleware } from './mock-backend.ts';
import { account } from '../server/handlers/account.ts';

export function devApi(): Plugin {
  return {
    name: 'ontrack-dev-api',
    configureServer(s) {
      if (process.env.VITE_BACKEND !== 'mock') s.middlewares.use('/api/account', toMiddleware(account));
    },
  };
}
