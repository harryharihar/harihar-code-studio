import 'dotenv/config';

import express from 'express';
import { Pool } from 'pg';

const app = express();
const port = Number(process.env.PORT ?? 4000);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT NOW() AS database_time'
    );

    return res.status(200).json({
      status: 'ok',
      service: 'planit-api',
      database: 'connected',
      databaseTime: result.rows[0].database_time,
    });
  } catch (error) {
    console.error('Health check database query failed:', error);

    return res.status(503).json({
      status: 'error',
      service: 'planit-api',
      database: 'disconnected',
    });
  }
});

const server = app.listen(port, () => {
  console.log(`PlanIt API listening on http://localhost:${port}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);