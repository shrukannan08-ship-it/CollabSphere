import { Pool, PoolClient } from 'pg';
import config from '../config';

let pool: Pool | null = null;

function buildConnectionString(): string {
  if (config.db.user && config.db.password) {
    const ssl = config.db.sslMode !== 'disable' ? '?sslmode=' + config.db.sslMode : '';
    return `postgres://${config.db.user}:${encodeURIComponent(config.db.password)}@${config.db.host}:${config.db.port}/${config.db.name}${ssl}`;
  }
  if (config.db.url) return config.db.url;
  const ssl = config.db.sslMode !== 'disable' ? '?sslmode=' + config.db.sslMode : '';
  return `postgres://${config.db.user}:${encodeURIComponent(config.db.password)}@${config.db.host}:${config.db.port}/${config.db.name}${ssl}`;
}

export function getPool(): Pool {
  if (!pool) {
    const connectionString = buildConnectionString();
    const useSsl = config.db.sslMode === 'require' || connectionString.includes('sslmode=require');

    pool = new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: config.isProduction ? 30 : 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    pool.on('error', (err) => {
      console.error('[DB] Unexpected pool error', err);
    });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (err: unknown) {
    console.error('[DB] Health check failed:', (err as Error).message ?? err);
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
