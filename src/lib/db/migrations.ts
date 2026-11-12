// Numbered schema migrations for the device store, as in watermelon: version n runs MIGRATIONS[n] to reach n + 1.
import type { Rec } from '../../../shared/records';
import type { Meta } from './store.svelte';

export const SCHEMA_VERSION = 2;

/** Each one edits the loaded records and the meta in place. Every record is written back afterwards. */
export const MIGRATIONS: Record<number, (records: Rec[], meta: Meta) => void> = {
  // N1 added the `food` collection. An older version on another device skipped those records yet moved its cursor past
  // them, so pull everything once more. The epoch, not null, keeps the device counted as pulled (no first load state).
  1: (_, meta) => { if (meta.cursor) meta.cursor = new Date(0).toISOString(); },
};
