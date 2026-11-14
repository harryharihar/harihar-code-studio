import { PGlite } from "@electric-sql/pglite";
import { migrate, pgStore } from "../src/store";
import type { Store } from "../src/types";

// A real PostgreSQL for tests: PGlite runs it inside Node, nothing to install.
let db: PGlite | undefined;

export async function pg(): Promise<Store> {
  if (!db) {
    db = new PGlite();
    await migrate(db as any);
    await migrate(db as any); // running the migration twice must be harmless
  }
  await db.exec("truncate runs, run_events, plans, tasks, settings, memory cascade"); // a clean slate for every test
  return pgStore(db as any);
}

export const closePg = async () => {
  await db?.close();
  db = undefined;
};
