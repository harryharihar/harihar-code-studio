
import "dotenv/config";
import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.PGHOST || "/tmp",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "experiment04_rag",
  user: process.env.PGUSER || "apple",
});

export async function initializeDatabase() {
  await pool.query("CREATE EXTENSION IF NOT EXISTS vector");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      embedding VECTOR(1536) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  console.log("PostgreSQL and pgvector initialized");
}
