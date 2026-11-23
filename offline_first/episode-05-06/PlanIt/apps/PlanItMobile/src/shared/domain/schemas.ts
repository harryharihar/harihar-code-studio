import { z } from 'zod';

/** Any entity ID: a UUID created on the device. */
export const idSchema = z.uuid();

/** ISO 8601 timestamp in UTC (must end with "Z"). */
export const isoDateTimeSchema = z.iso.datetime();

/**
 * Fields every synced entity has (projects, tasks, ...).
 *
 * - createdAt / updatedAt: when it was made / last changed
 * - deletedAt: tombstone — null means "not deleted"
 * - version: goes up by 1 on every change; used to detect conflicts
 */
export const entityBaseSchema = z.object({
  id: idSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  deletedAt: isoDateTimeSchema.nullable(),
  version: z.int().min(1),
});

/** Local-only: has this change reached the server yet? */
export const syncStatusSchema = z.enum(['pending', 'synced', 'failed']);
export type SyncStatus = z.infer<typeof syncStatusSchema>;
