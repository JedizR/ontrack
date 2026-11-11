// Numbered schema migrations for the device store, as in watermelon: version n runs MIGRATIONS[n] to reach n + 1.
import type { Rec } from '../../../shared/records';

export const SCHEMA_VERSION = 1;

/** Each one edits the loaded records in place. Every record is written back afterwards. */
export const MIGRATIONS: Record<number, (records: Rec[]) => void> = {};
