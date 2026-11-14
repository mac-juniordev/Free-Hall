import { Pool } from 'pg';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  // Force UTF8 on every connection — Windows Postgres installs default to
  // WIN1252 as client_encoding, which rejects emoji / non-Latin characters.
  options: '-c client_encoding=UTF8',
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected PG pool error');
});

// Belt-and-braces: also send SET on every new connection in case `options`
// is ignored by a driver/version mismatch.
pool.on('connect', (client) => {
  client.query("SET client_encoding TO 'UTF8'").catch((err) => {
    logger.warn({ err }, 'Failed to set client_encoding');
  });
});

export async function assertDbConnected(): Promise<void> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ encoding: string }>('SHOW client_encoding');
    logger.info({ client_encoding: rows[0].encoding }, 'DB client_encoding');
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}