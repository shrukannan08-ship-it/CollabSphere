import { query, queryOne, withTransaction } from '../../lib/db';
import { createError } from '../../middleware/errors';
import { createNotification } from '../notifications/notifications.service';
import type {
  CreatePositionInput,
  UpdatePositionInput,
  ApplyPositionInput,
  ReviewApplicationInput,
  SearchPositionsInput,
} from './positions.schema';

export interface PositionDetail {
  id: string;
  projectId: string | null;
  projectName?: string;
  projectSlug?: string;
  teamId: string | null;
  title: string;
  description: string;
  responsibilities: string | null;
  requiredSkills: string[];
  niceToHave: string[];
  slots: number;
  filledSlots: number;
  isOpen: boolean;
  createdBy: string;
  creatorName?: string;
  creatorUsername?: string;
  createdAt: string;
  updatedAt: string;
  applicationCount?: number;
}

export interface ApplicationDetail {
  id: string;
  positionId: string;
  positionTitle?: string;
  projectId?: string;
  projectName?: string;
  applicantId: string;
  applicantName: string;
  applicantUsername: string;
  applicantAvatarUrl: string | null;
  applicantHeadline: string | null;
  status: 'pending' | 'under_review' | 'accepted' | 'rejected' | 'withdrawn';
  coverNote: string | null;
  relevantSkills: string[];
  reviewerId: string | null;
  reviewedAt: string | null;
  reviewerNote: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Position Management
// ---------------------------------------------------------------------------

export async function createPosition(userId: string, input: CreatePositionInput): Promise<PositionDetail> {
  // Validate project ownership
  const project = await queryOne<{ id: string; created_by: string; is_public: boolean }>(
    `SELECT id, created_by, is_public FROM projects WHERE id = $1`,
    [input.projectId]
  );
  if (!project) throw createError('Project not found', 404, 'NOT_FOUND');
  if (project.created_by !== userId) {
    throw createError('Only the project owner can create recruitment positions', 403, 'FORBIDDEN');
  }

  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO open_positions (
      project_id, title, description, responsibilities, required_skills,
      nice_to_have, slots, is_open, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      input.projectId,
      input.title,
      input.description,
      input.responsibilities || null,
      input.requiredSkills,
      input.niceToHave || [],
      input.slots,
      input.isOpen ?? true,
      userId,
    ]
  );

  return getPositionById(row!.id as string);
}

export async function getPositionById(positionId: string): Promise<PositionDetail> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT
       op.*,
       p.name AS project_name,
       p.slug AS project_slug,
       u.id AS creator_id,
       sp.full_name AS creator_name,
       sp.username AS creator_username,
       (SELECT COUNT(*)::int FROM position_applications pa WHERE pa.position_id = op.id) AS app_count
     FROM open_positions op
     LEFT JOIN projects p ON p.id = op.project_id
     JOIN users u ON u.id = op.created_by
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE op.id = $1`,
    [positionId]
  );

  if (!row) throw createError('Position not found', 404, 'NOT_FOUND');

  return {
    id: row.id as string,
    projectId: (row.project_id as string) || null,
    projectName: (row.project_name as string) || undefined,
    projectSlug: (row.project_slug as string) || undefined,
    teamId: (row.team_id as string) || null,
    title: row.title as string,
    description: row.description as string,
    responsibilities: (row.responsibilities as string) || null,
    requiredSkills: (row.required_skills as string[]) || [],
    niceToHave: (row.nice_to_have as string[]) || [],
    slots: row.slots as number,
    filledSlots: row.filled_slots as number,
    isOpen: Boolean(row.is_open),
    createdBy: row.created_by as string,
    creatorName: (row.creator_name as string) || undefined,
    creatorUsername: (row.creator_username as string) || undefined,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
    applicationCount: (row.app_count as number) || 0,
  };
}

export async function updatePosition(
  positionId: string,
  userId: string,
  input: UpdatePositionInput
): Promise<PositionDetail> {
  const existing = await queryOne<{ created_by: string; project_id: string }>(
    `SELECT op.created_by, op.project_id
     FROM open_positions op
     WHERE op.id = $1`,
    [positionId]
  );
  if (!existing) throw createError('Position not found', 404, 'NOT_FOUND');

  // Verify ownership either as position creator or project owner
  if (existing.created_by !== userId) {
    const project = await queryOne<{ created_by: string }>(
      `SELECT created_by FROM projects WHERE id = $1`,
      [existing.project_id]
    );
    if (!project || project.created_by !== userId) {
      throw createError('You are not authorized to update this recruitment position', 403, 'FORBIDDEN');
    }
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const fieldMap: Record<string, string> = {
    title: 'title',
    description: 'description',
    responsibilities: 'responsibilities',
    requiredSkills: 'required_skills',
    niceToHave: 'nice_to_have',
    slots: 'slots',
    isOpen: 'is_open',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in input && input[key as keyof UpdatePositionInput] !== undefined) {
      updates.push(`${col} = $${idx++}`);
      values.push(input[key as keyof UpdatePositionInput]);
    }
  }

  if (updates.length > 0) {
    values.push(positionId);
    await query(
      `UPDATE open_positions SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
      values
    );
  }

  return getPositionById(positionId);
}

export async function deletePosition(positionId: string, userId: string): Promise<void> {
  const existing = await queryOne<{ created_by: string; project_id: string }>(
    `SELECT created_by, project_id FROM open_positions WHERE id = $1`,
    [positionId]
  );
  if (!existing) throw createError('Position not found', 404, 'NOT_FOUND');

  if (existing.created_by !== userId) {
    const project = await queryOne<{ created_by: string }>(
      `SELECT created_by FROM projects WHERE id = $1`,
      [existing.project_id]
    );
    if (!project || project.created_by !== userId) {
      throw createError('You are not authorized to delete this recruitment position', 403, 'FORBIDDEN');
    }
  }

  await query(`DELETE FROM open_positions WHERE id = $1`, [positionId]);
}

export async function searchPositions(input: SearchPositionsInput): Promise<{ positions: PositionDetail[]; total: number }> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.isOpen !== undefined) {
    conditions.push(`op.is_open = $${idx++}`);
    values.push(input.isOpen);
  }

  if (input.projectId) {
    conditions.push(`op.project_id = $${idx++}`);
    values.push(input.projectId);
  }

  if (input.q) {
    const cleanQ = input.q.replace(/\+/g, ' ').trim();
    const terms = cleanQ.split(/\s+/).filter(Boolean);
    for (const term of terms) {
      conditions.push(`(op.title ILIKE $${idx} OR op.description ILIKE $${idx} OR p.name ILIKE $${idx})`);
      values.push(`%${term}%`);
      idx++;
    }
  }

  if (input.skill) {
    conditions.push(`$${idx} = ANY(op.required_skills)`);
    values.push(input.skill);
    idx++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM open_positions op
     LEFT JOIN projects p ON p.id = op.project_id
     ${whereClause}`,
    values
  );
  const total = parseInt(countRow?.count || '0', 10);

  const offset = (input.page - 1) * input.limit;
  values.push(input.limit);
  const limitIdx = idx++;
  values.push(offset);
  const offsetIdx = idx++;

  const rows = await query<Record<string, unknown>>(
    `SELECT
       op.*,
       p.name AS project_name,
       p.slug AS project_slug,
       u.id AS creator_id,
       sp.full_name AS creator_name,
       sp.username AS creator_username,
       (SELECT COUNT(*)::int FROM position_applications pa WHERE pa.position_id = op.id) AS app_count
     FROM open_positions op
     LEFT JOIN projects p ON p.id = op.project_id
     JOIN users u ON u.id = op.created_by
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     ${whereClause}
     ORDER BY op.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    values
  );

  const positions: PositionDetail[] = rows.map((row) => ({
    id: row.id as string,
    projectId: (row.project_id as string) || null,
    projectName: (row.project_name as string) || undefined,
    projectSlug: (row.project_slug as string) || undefined,
    teamId: (row.team_id as string) || null,
    title: row.title as string,
    description: row.description as string,
    responsibilities: (row.responsibilities as string) || null,
    requiredSkills: (row.required_skills as string[]) || [],
    niceToHave: (row.nice_to_have as string[]) || [],
    slots: row.slots as number,
    filledSlots: row.filled_slots as number,
    isOpen: Boolean(row.is_open),
    createdBy: row.created_by as string,
    creatorName: (row.creator_name as string) || undefined,
    creatorUsername: (row.creator_username as string) || undefined,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
    applicationCount: (row.app_count as number) || 0,
  }));

  return { positions, total };
}

// ---------------------------------------------------------------------------
// Collaboration Applications
// ---------------------------------------------------------------------------

export async function applyToPosition(
  positionId: string,
  applicantId: string,
  input: ApplyPositionInput
): Promise<ApplicationDetail> {
  const position = await queryOne<{ id: string; is_open: boolean; created_by: string; project_id: string; title: string }>(
    `SELECT id, is_open, created_by, project_id, title FROM open_positions WHERE id = $1`,
    [positionId]
  );
  if (!position) throw createError('Position not found', 404, 'NOT_FOUND');
  if (!position.is_open) throw createError('This position is closed for applications', 400, 'POSITION_CLOSED');
  if (position.created_by === applicantId) {
    throw createError('You cannot apply to your own recruitment position', 400, 'CANNOT_APPLY_TO_SELF');
  }

  // Prevent duplicate application
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM position_applications WHERE position_id = $1 AND applicant_id = $2`,
    [positionId, applicantId]
  );
  if (existing) {
    throw createError('You have already applied to this position', 409, 'ALREADY_APPLIED');
  }

  const res = await queryOne<Record<string, unknown>>(
    `INSERT INTO position_applications (
      position_id, applicant_id, cover_note, relevant_skills, status
    ) VALUES ($1, $2, $3, $4, 'pending')
    RETURNING id`,
    [positionId, applicantId, input.coverNote, input.relevantSkills || []]
  );

  // Notify project/position owner
  await createNotification({
    userId: position.created_by,
    type: 'team_application',
    title: `New application for "${position.title || 'open role'}"`,
    body: input.coverNote.slice(0, 100),
    actionUrl: position.project_id ? `/projects/${position.project_id}` : '/positions',
    actorId: applicantId,
    referenceType: 'position_application',
    referenceId: res!.id as string,
  });

  return getApplicationById(res!.id as string);
}

export async function getApplicationById(applicationId: string): Promise<ApplicationDetail> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT
       pa.*,
       op.title AS position_title,
       p.id AS project_id,
       p.name AS project_name,
       sp.full_name AS applicant_name,
       sp.username AS applicant_username,
       sp.avatar_url AS applicant_avatar_url,
       sp.headline AS applicant_headline
     FROM position_applications pa
     JOIN open_positions op ON op.id = pa.position_id
     LEFT JOIN projects p ON p.id = op.project_id
     JOIN users u ON u.id = pa.applicant_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE pa.id = $1`,
    [applicationId]
  );

  if (!row) throw createError('Application not found', 404, 'NOT_FOUND');

  return {
    id: row.id as string,
    positionId: row.position_id as string,
    positionTitle: (row.position_title as string) || undefined,
    projectId: (row.project_id as string) || undefined,
    projectName: (row.project_name as string) || undefined,
    applicantId: row.applicant_id as string,
    applicantName: (row.applicant_name as string) || 'Applicant',
    applicantUsername: (row.applicant_username as string) || '',
    applicantAvatarUrl: (row.applicant_avatar_url as string) || null,
    applicantHeadline: (row.applicant_headline as string) || null,
    status: row.status as 'pending' | 'under_review' | 'accepted' | 'rejected' | 'withdrawn',
    coverNote: (row.cover_note as string) || null,
    relevantSkills: (row.relevant_skills as string[]) || [],
    reviewerId: (row.reviewer_id as string) || null,
    reviewedAt: row.reviewed_at ? (row.reviewed_at as Date).toISOString() : null,
    reviewerNote: (row.reviewer_note as string) || null,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

export async function reviewApplication(
  applicationId: string,
  reviewerId: string,
  input: ReviewApplicationInput
): Promise<ApplicationDetail> {
  const app = await queryOne<{ position_id: string; status: string; project_id: string; applicant_id: string }>(
    `SELECT pa.position_id, pa.status, op.project_id, pa.applicant_id
     FROM position_applications pa
     JOIN open_positions op ON op.id = pa.position_id
     WHERE pa.id = $1`,
    [applicationId]
  );
  if (!app) throw createError('Application not found', 404, 'NOT_FOUND');

  // Verify reviewer is project owner
  const project = await queryOne<{ created_by: string; name: string }>(
    `SELECT created_by, name FROM projects WHERE id = $1`,
    [app.project_id]
  );
  if (!project || project.created_by !== reviewerId) {
    throw createError('Only the project owner can review applications', 403, 'FORBIDDEN');
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE position_applications
       SET status = $1, reviewer_id = $2, reviewed_at = NOW(), reviewer_note = $3, updated_at = NOW()
       WHERE id = $4`,
      [input.status, reviewerId, input.reviewerNote || null, applicationId]
    );

    // If accepted, increment filled_slots on the position if not already accepted
    if (input.status === 'accepted' && app.status !== 'accepted') {
      await client.query(
        `UPDATE open_positions
         SET filled_slots = LEAST(slots, filled_slots + 1),
             is_open = CASE WHEN filled_slots + 1 >= slots THEN FALSE ELSE is_open END
         WHERE id = $1`,
        [app.position_id]
      );

      // Add applicant as project member
      if (app.project_id) {
        const posRes = await client.query<{ title: string }>(
          `SELECT title FROM open_positions WHERE id = $1`,
          [app.position_id]
        );
        const roleTitle = posRes.rows[0]?.title || 'Contributor';
        await client.query(
          `INSERT INTO project_members (project_id, user_id, role)
           VALUES ($1, $2, $3)
           ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role, left_at = NULL`,
          [app.project_id, app.applicant_id, roleTitle]
        );
      }
    }
  });

  // Notify applicant of status change
  await createNotification({
    userId: app.applicant_id,
    type: input.status === 'accepted' ? 'team_application_accepted' : 'team_application_rejected',
    title: `Application ${input.status === 'accepted' ? 'Accepted' : 'Updated'} for ${project.name}`,
    body: input.reviewerNote || `Your application status is now ${input.status}.`,
    actionUrl: '/positions/my-applications',
    actorId: reviewerId,
    referenceType: 'position_application',
    referenceId: applicationId,
  });

  return getApplicationById(applicationId);
}

export async function listPositionApplications(
  positionId: string,
  userId: string
): Promise<ApplicationDetail[]> {
  const pos = await queryOne<{ created_by: string; project_id: string }>(
    `SELECT created_by, project_id FROM open_positions WHERE id = $1`,
    [positionId]
  );
  if (!pos) throw createError('Position not found', 404, 'NOT_FOUND');

  // Must be position creator or project owner
  if (pos.created_by !== userId) {
    const project = await queryOne<{ created_by: string }>(
      `SELECT created_by FROM projects WHERE id = $1`,
      [pos.project_id]
    );
    if (!project || project.created_by !== userId) {
      throw createError('You are not authorized to view applications for this position', 403, 'FORBIDDEN');
    }
  }

  const rows = await query<Record<string, unknown>>(
    `SELECT
       pa.*,
       op.title AS position_title,
       p.id AS project_id,
       p.name AS project_name,
       sp.full_name AS applicant_name,
       sp.username AS applicant_username,
       sp.avatar_url AS applicant_avatar_url,
       sp.headline AS applicant_headline
     FROM position_applications pa
     JOIN open_positions op ON op.id = pa.position_id
     LEFT JOIN projects p ON p.id = op.project_id
     JOIN users u ON u.id = pa.applicant_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE pa.position_id = $1
     ORDER BY pa.created_at DESC`,
    [positionId]
  );

  return rows.map((row) => ({
    id: row.id as string,
    positionId: row.position_id as string,
    positionTitle: (row.position_title as string) || undefined,
    projectId: (row.project_id as string) || undefined,
    projectName: (row.project_name as string) || undefined,
    applicantId: row.applicant_id as string,
    applicantName: (row.applicant_name as string) || 'Applicant',
    applicantUsername: (row.applicant_username as string) || '',
    applicantAvatarUrl: (row.applicant_avatar_url as string) || null,
    applicantHeadline: (row.applicant_headline as string) || null,
    status: row.status as 'pending' | 'under_review' | 'accepted' | 'rejected' | 'withdrawn',
    coverNote: (row.cover_note as string) || null,
    relevantSkills: (row.relevant_skills as string[]) || [],
    reviewerId: (row.reviewer_id as string) || null,
    reviewedAt: row.reviewed_at ? (row.reviewed_at as Date).toISOString() : null,
    reviewerNote: (row.reviewer_note as string) || null,
    createdAt: (row.created_at as Date).toISOString(),
  }));
}

export async function listMyApplications(userId: string): Promise<ApplicationDetail[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT
       pa.*,
       op.title AS position_title,
       p.id AS project_id,
       p.name AS project_name,
       sp.full_name AS applicant_name,
       sp.username AS applicant_username,
       sp.avatar_url AS applicant_avatar_url,
       sp.headline AS applicant_headline
     FROM position_applications pa
     JOIN open_positions op ON op.id = pa.position_id
     LEFT JOIN projects p ON p.id = op.project_id
     JOIN users u ON u.id = pa.applicant_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE pa.applicant_id = $1
     ORDER BY pa.created_at DESC`,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id as string,
    positionId: row.position_id as string,
    positionTitle: (row.position_title as string) || undefined,
    projectId: (row.project_id as string) || undefined,
    projectName: (row.project_name as string) || undefined,
    applicantId: row.applicant_id as string,
    applicantName: (row.applicant_name as string) || 'Applicant',
    applicantUsername: (row.applicant_username as string) || '',
    applicantAvatarUrl: (row.applicant_avatar_url as string) || null,
    applicantHeadline: (row.applicant_headline as string) || null,
    status: row.status as 'pending' | 'under_review' | 'accepted' | 'rejected' | 'withdrawn',
    coverNote: (row.cover_note as string) || null,
    relevantSkills: (row.relevant_skills as string[]) || [],
    reviewerId: (row.reviewer_id as string) || null,
    reviewedAt: row.reviewed_at ? (row.reviewed_at as Date).toISOString() : null,
    reviewerNote: (row.reviewer_note as string) || null,
    createdAt: (row.created_at as Date).toISOString(),
  }));
}

export async function withdrawApplication(
  applicationId: string,
  applicantId: string
): Promise<ApplicationDetail> {
  const app = await queryOne<{ id: string; applicant_id: string; status: string }>(
    `SELECT id, applicant_id, status FROM position_applications WHERE id = $1`,
    [applicationId]
  );
  if (!app) throw createError('Application not found', 404, 'NOT_FOUND');
  if (app.applicant_id !== applicantId) {
    throw createError('You are not authorized to withdraw this application', 403, 'FORBIDDEN');
  }
  if (app.status === 'withdrawn') {
    throw createError('Application has already been withdrawn', 400, 'ALREADY_WITHDRAWN');
  }

  await query(
    `UPDATE position_applications SET status = 'withdrawn', updated_at = NOW() WHERE id = $1`,
    [applicationId]
  );

  return getApplicationById(applicationId);
}
