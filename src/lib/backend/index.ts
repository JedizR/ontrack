// Picks the backend at build time (VITE_BACKEND) and loads it lazily, so supabase-js stays out of the first bundle.
import type { Backend } from './types';

export type { Backend, User } from './types';
export { BackendError } from './types';

export async function loadBackend(): Promise<Backend> {
  const m = import.meta.env.VITE_BACKEND === 'mock' ? await import('./mock') : await import('./supabase');
  return m.default();
}
