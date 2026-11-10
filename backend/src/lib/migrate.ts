import fs from 'fs';
import path from 'path';
import { getPool, closePool } from './db';

const possibleDirs = [
  path.resolve(__dirname, '../../../migrations/sql'),
  path.resolve(__dirname, '../../migrations/sql'),
  path.resolve(process.cwd(), 'migrations/sql'),
  path.resolve(process.cwd(), '../migrations/sql'),
];
const MIGRATIONS_DIR = possibleDirs.find(d => fs.existsSync(d)) || possibleDirs[0];

// Track applied migrations in a dedicated table
const MIGRATIONS_TABLE = 'schema_migrations';

async function ensureMigrationsTable(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const pool = getPool();
  const result = await pool.query(`SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY id`);
  return new Set(result.rows.map((r: { filename: string }) => r.filename));
}

function getMigrationFiles(direction: 'up' | 'down'): string[] {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(`.${direction}.sql`))
    .sort();
  return direction === 'down' ? files.reverse() : files;
}

async function runUp(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = getMigrationFiles('up');
  const pool = getPool();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[migrate] Skipping already applied: ${file}`);
      continue;
    }

    console.log(`[migrate] Applying: ${file}`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`,
        [file]
      );
      await client.query('COMMIT');
      console.log(`[migrate] Applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[migrate] Failed on: ${file}`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log('[migrate] All migrations applied.');
}

async function runDown(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = getMigrationFiles('down');
  const pool = getPool();

  // Only roll back the last applied migration
  const lastApplied = [...applied].pop();
  if (!lastApplied) {
    console.log('[migrate] Nothing to roll back.');
    return;
  }

  const downFile = lastApplied.replace('.up.sql', '.down.sql');
  if (!files.includes(downFile)) {
    console.error(`[migrate] No down migration found for: ${lastApplied}`);
    process.exit(1);
  }

  console.log(`[migrate] Rolling back: ${downFile}`);
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, downFile), 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      `DELETE FROM ${MIGRATIONS_TABLE} WHERE filename = $1`,
      [lastApplied]
    );
    await client.query('COMMIT');
    console.log(`[migrate] Rolled back: ${lastApplied}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[migrate] Rollback failed`, err);
    throw err;
  } finally {
    client.release();
  }
}

// CLI entry point: tsx src/lib/migrate.ts [up|down]
const direction = process.argv[2] as 'up' | 'down' | undefined;

if (require.main === module) {
  (async () => {
    try {
      if (direction === 'up') {
        await runUp();
      } else if (direction === 'down') {
        await runDown();
      } else {
        console.error('Usage: tsx src/lib/migrate.ts [up|down]');
        process.exit(1);
      }
    } catch (err) {
      console.error('[migrate] Fatal error', err);
      process.exit(1);
    } finally {
      await closePool();
    }
  })();
}

export { runUp, runDown };
