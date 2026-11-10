import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query, closePool } from '../src/lib/db';

async function migrate() {
  console.log('[migration] Starting Project Management schema migration...');

  // 1. Add team_size column if not exists
  await query(`
    ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS team_size INTEGER DEFAULT 4
  `);
  console.log('[migration] Added/verified team_size column on projects');

  // 2. Add recruitment_status column if not exists
  await query(`
    ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS recruitment_status VARCHAR(20) DEFAULT 'open'
  `);
  console.log('[migration] Added/verified recruitment_status column on projects');

  // 3. Ensure existing rows have defaults
  await query(`
    UPDATE projects
    SET team_size = COALESCE(team_size, 4),
        recruitment_status = COALESCE(recruitment_status, 'open')
  `);
  console.log('[migration] Backfilled existing projects with defaults');

  console.log('[migration] Migration completed successfully.');
  await closePool();
}

migrate().catch((err) => {
  console.error('[migration] Migration failed:', err);
  process.exit(1);
});
