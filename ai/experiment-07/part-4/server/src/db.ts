import { Pool } from "pg";
import { migrate, pgStore } from "./store";

// One connection pool for the whole server. DATABASE_URL looks like:
//   postgres://localhost:5432/mission_control
export async function connectDb(url: string) {
  const pool = new Pool({ connectionString: url, max: 5 });
  await pool.query("select 1"); // fail fast, with a clear message, if Postgres is not running
  await migrate(pool); // creates the tables the first time; does nothing after that
  return pgStore(pool);
}
