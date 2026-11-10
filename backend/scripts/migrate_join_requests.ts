import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query, closePool } from '../src/lib/db';

async function migrate() {
  console.log('[migration] Starting Project Join Requests schema migration...');

  // 1. Ensure collaboration_requests has indexes for fast lookups by project and requester
  await query(`
    CREATE INDEX IF NOT EXISTS idx_collab_requests_project_id
    ON collaboration_requests (project_id)
    WHERE project_id IS NOT NULL;
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_collab_requests_requester
    ON collaboration_requests (requester_user_id, project_id);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_collab_requests_target
    ON collaboration_requests (target_user_id, status);
  `);

  // 2. Ensure project_members has index on project_id and user_id
  await query(`
    CREATE INDEX IF NOT EXISTS idx_project_members_project_active
    ON project_members (project_id)
    WHERE left_at IS NULL;
  `);

  console.log('[migration] Successfully added indexes for Join Requests and Membership.');
  await closePool();
}

migrate().catch((err) => {
  console.error('[migration] Migration failed:', err);
  process.exit(1);
});
