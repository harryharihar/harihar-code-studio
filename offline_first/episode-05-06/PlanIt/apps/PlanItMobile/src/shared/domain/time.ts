/**
 * Current time as an ISO 8601 string in UTC, e.g. "2026-11-18T10:30:00.000Z".
 *
 * One format everywhere: SQLite stores it as TEXT, PostgreSQL parses it
 * into TIMESTAMPTZ, and string comparison matches time order.
 */
export function nowIso(): string {
  return new Date().toISOString();
}
