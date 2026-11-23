import { v7 as uuidv7 } from 'uuid';

/**
 * Creates a new entity ID on the device — no server round trip needed.
 *
 * UUID v7 starts with a timestamp, so IDs created later sort later.
 * That keeps database indexes (SQLite and PostgreSQL) compact and fast.
 */
export function createId(): string {
  return uuidv7();
}
