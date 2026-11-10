import { query, queryOne, withTransaction } from '../../lib/db';
import { createError } from '../../middleware/errors';
import { createNotification } from '../notifications/notifications.service';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  SearchProjectsInput,
  CreateJoinRequestInput,
  ReviewJoinRequestInput,
} from './projects.schema';

export interface ProjectSkill {
  id: string;
  name: string;
  slug: string;
  isRequired: boolean;
}

export interface ProjectMemberDetail {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  contribution: string | null;
  joinedAt: string;
}

export interface ProjectDetail {
  id: string;
  teamId: string | null;
  name: string;
  slug: string;
  tagline: string | null;
  description: string;
  status: string;
  domain: string | null;
  tags: string[];
  githubUrl: string | null;
  demoUrl: string | null;
  documentationUrl: string | null;
  isPublic: boolean;
  isFeatured: boolean;
  teamSize: number;
  recruitmentStatus: 'open' | 'closed';
  startDate: string | null;
  endDate: string | null;
  thumbnailUrl: string | null;
  createdBy: string;
  creatorName: string;
  creatorUsername: string;
  creatorAvatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  skills: ProjectSkill[];
  members: ProjectMemberDetail[];
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}

export async function createProject(userId: string, input: CreateProjectInput): Promise<ProjectDetail> {
  const projectName = (input.name || input.title || '').trim();
  const domain = (input.domain || input.category || null);
  const teamSize = Number(input.teamSize) || 4;
  const recruitmentStatus = input.recruitmentStatus || 'open';
  const slug = generateSlug(projectName);

  const projectId = await withTransaction(async (client) => {
    // Insert project
    const res = await client.query<{ id: string }>(
      `INSERT INTO projects (
        name, slug, tagline, description, status, domain, tags,
        github_url, demo_url, documentation_url, is_public, created_by,
        team_size, recruitment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id`,
      [
        projectName,
        slug,
        input.tagline || null,
        input.description,
        input.status,
        domain,
        input.tags || [],
        input.githubUrl || null,
        input.demoUrl || null,
        input.documentationUrl || null,
        input.isPublic ?? true,
        userId,
        teamSize,
        recruitmentStatus,
      ]
    );

    const newId = res.rows[0].id;

    // Add creator to project_members as Project Lead
    await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, 'Project Lead')
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [newId, userId]
    );

    // Attach required skills
    if (input.requiredSkills && input.requiredSkills.length > 0) {
      for (const skillName of input.requiredSkills) {
        if (!skillName.trim()) continue;
        const skillSlug = skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

        // Find or create skill
        const sRes = await client.query<{ id: string }>(
          `INSERT INTO skills (name, slug)
           VALUES ($1, $2)
           ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [skillName.trim(), skillSlug]
        );
        const skillId = sRes.rows[0].id;

        await client.query(
          `INSERT INTO project_skills (project_id, skill_id, is_required)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (project_id, skill_id) DO NOTHING`,
          [newId, skillId]
        );
      }
    }

    return newId;
  });

  return getProjectById(projectId, userId);
}

export async function getProjectById(projectId: string, viewerId?: string): Promise<ProjectDetail> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT
       p.*,
       u.id AS creator_id,
       sp.full_name AS creator_name,
       sp.username AS creator_username,
       sp.avatar_url AS creator_avatar_url
     FROM projects p
     JOIN users u ON u.id = p.created_by
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE p.id = $1`,
    [projectId]
  );

  if (!row) throw createError('Project not found', 404, 'NOT_FOUND');
  if (!row.is_public && row.created_by !== viewerId) {
    throw createError('This project is private', 403, 'FORBIDDEN');
  }

  const skills = await query<{ id: string; name: string; slug: string; is_required: boolean }>(
    `SELECT s.id, s.name, s.slug, ps.is_required
     FROM project_skills ps
     JOIN skills s ON s.id = ps.skill_id
     WHERE ps.project_id = $1
     ORDER BY s.name ASC`,
    [projectId]
  );

  const memberRows = await query<{
    id: string;
    user_id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
    role: string;
    contribution: string | null;
    joined_at: Date;
  }>(
    `SELECT
       pm.id,
       pm.user_id,
       COALESCE(sp.full_name, 'Team Member') AS full_name,
       COALESCE(sp.username, '') AS username,
       sp.avatar_url,
       COALESCE(pm.role, 'Contributor') AS role,
       pm.contribution,
       pm.joined_at
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE pm.project_id = $1 AND pm.left_at IS NULL
     ORDER BY
       CASE WHEN pm.user_id = $2 THEN 0 ELSE 1 END,
       pm.joined_at ASC`,
    [projectId, row.created_by]
  );

  const members: ProjectMemberDetail[] = memberRows.map((m) => ({
    id: m.id,
    userId: m.user_id,
    fullName: m.full_name,
    username: m.username,
    avatarUrl: m.avatar_url,
    role: m.role,
    contribution: m.contribution,
    joinedAt: m.joined_at ? new Date(m.joined_at).toISOString() : new Date().toISOString(),
  }));

  // Ensure project owner is present in members list
  if (!members.some((m) => m.userId === row.created_by)) {
    members.unshift({
      id: `lead-${row.id}`,
      userId: row.created_by as string,
      fullName: (row.creator_name as string) || 'Project Lead',
      username: (row.creator_username as string) || '',
      avatarUrl: (row.creator_avatar_url as string) || null,
      role: 'Project Lead',
      contribution: 'Project Owner',
      joinedAt: (row.created_at as Date).toISOString(),
    });
  }

  return {
    id: row.id as string,
    teamId: (row.team_id as string) || null,
    name: row.name as string,
    slug: row.slug as string,
    tagline: (row.tagline as string) || null,
    description: row.description as string,
    status: row.status as string,
    domain: (row.domain as string) || null,
    tags: (row.tags as string[]) || [],
    githubUrl: (row.github_url as string) || null,
    demoUrl: (row.demo_url as string) || null,
    documentationUrl: (row.documentation_url as string) || null,
    isPublic: Boolean(row.is_public),
    isFeatured: Boolean(row.is_featured),
    teamSize: (row.team_size as number) || 4,
    recruitmentStatus: (row.recruitment_status as 'open' | 'closed') || 'open',
    startDate: (row.start_date as string) || null,
    endDate: (row.end_date as string) || null,
    thumbnailUrl: (row.thumbnail_url as string) || null,
    createdBy: row.created_by as string,
    creatorName: (row.creator_name as string) || 'Anonymous',
    creatorUsername: (row.creator_username as string) || '',
    creatorAvatarUrl: (row.creator_avatar_url as string) || null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
    skills: skills.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      isRequired: Boolean(s.is_required),
    })),
    members,
  };
}

export async function updateProject(
  projectId: string,
  userId: string,
  input: UpdateProjectInput
): Promise<ProjectDetail> {
  const existing = await queryOne<{ created_by: string }>(
    `SELECT created_by FROM projects WHERE id = $1`,
    [projectId]
  );

  if (!existing) throw createError('Project not found', 404, 'NOT_FOUND');
  if (existing.created_by !== userId) {
    throw createError('You are not authorized to edit this project', 403, 'FORBIDDEN');
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const normalizedInput: Record<string, unknown> = { ...input };
  if (input.title && !input.name) normalizedInput.name = input.title;
  if (input.category && !input.domain) normalizedInput.domain = input.category;

  const fieldMap: Record<string, string> = {
    name: 'name',
    tagline: 'tagline',
    description: 'description',
    status: 'status',
    domain: 'domain',
    tags: 'tags',
    githubUrl: 'github_url',
    demoUrl: 'demo_url',
    documentationUrl: 'documentation_url',
    isPublic: 'is_public',
    teamSize: 'team_size',
    recruitmentStatus: 'recruitment_status',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in normalizedInput && normalizedInput[key] !== undefined) {
      updates.push(`${col} = $${idx++}`);
      values.push(normalizedInput[key] ?? null);
    }
  }

  if (updates.length > 0) {
    values.push(projectId);
    await query(
      `UPDATE projects SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
      values
    );
  }

  // Update skills if provided
  if (input.requiredSkills !== undefined) {
    await withTransaction(async (client) => {
      await client.query(`DELETE FROM project_skills WHERE project_id = $1`, [projectId]);
      for (const skillName of input.requiredSkills!) {
        if (!skillName.trim()) continue;
        const skillSlug = skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const sRes = await client.query<{ id: string }>(
          `INSERT INTO skills (name, slug)
           VALUES ($1, $2)
           ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [skillName.trim(), skillSlug]
        );
        const skillId = sRes.rows[0].id;
        await client.query(
          `INSERT INTO project_skills (project_id, skill_id, is_required)
           VALUES ($1, $2, TRUE)
           ON CONFLICT DO NOTHING`,
          [projectId, skillId]
        );
      }
    });
  }

  return getProjectById(projectId, userId);
}

export async function deleteProject(projectId: string, userId: string): Promise<void> {
  const existing = await queryOne<{ created_by: string }>(
    `SELECT created_by FROM projects WHERE id = $1`,
    [projectId]
  );

  if (!existing) throw createError('Project not found', 404, 'NOT_FOUND');
  if (existing.created_by !== userId) {
    throw createError('You are not authorized to delete this project', 403, 'FORBIDDEN');
  }

  await withTransaction(async (client) => {
    // 1. Delete thread replies for this project's discussion threads
    await client.query(
      `DELETE FROM thread_replies WHERE thread_id IN (SELECT id FROM discussion_threads WHERE project_id = $1)`,
      [projectId]
    );
    // 2. Delete discussion threads
    await client.query(`DELETE FROM discussion_threads WHERE project_id = $1`, [projectId]);
    // 3. Delete position applications for this project's open positions
    await client.query(
      `DELETE FROM position_applications WHERE position_id IN (SELECT id FROM open_positions WHERE project_id = $1)`,
      [projectId]
    );
    // 4. Delete open positions
    await client.query(`DELETE FROM open_positions WHERE project_id = $1`, [projectId]);
    // 5. Delete collaboration / join requests
    await client.query(`DELETE FROM collaboration_requests WHERE project_id = $1`, [projectId]);
    // 6. Delete project skills
    await client.query(`DELETE FROM project_skills WHERE project_id = $1`, [projectId]);
    // 7. Delete project members
    await client.query(`DELETE FROM project_members WHERE project_id = $1`, [projectId]);
    // 8. Delete the project record
    await client.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
  });
}

export async function searchProjects(
  input: SearchProjectsInput,
  viewerId?: string
): Promise<{ projects: ProjectDetail[]; total: number }> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.my && viewerId) {
    conditions.push(`p.created_by = $${idx++}`);
    values.push(viewerId);
  } else if (input.createdBy) {
    conditions.push(`p.created_by = $${idx++}`);
    values.push(input.createdBy);
    if (!viewerId || viewerId !== input.createdBy) {
      conditions.push('p.is_public = TRUE');
    }
  } else {
    conditions.push('p.is_public = TRUE');
  }

  if (input.recruitmentStatus) {
    conditions.push(`p.recruitment_status = $${idx++}`);
    values.push(input.recruitmentStatus);
  }

  if (input.status) {
    conditions.push(`p.status = $${idx++}`);
    values.push(input.status);
  }

  const domainFilter = input.domain || input.category;
  if (domainFilter) {
    conditions.push(`p.domain ILIKE $${idx++}`);
    values.push(`%${domainFilter}%`);
  }

  if (input.q) {
    const cleanQ = input.q.replace(/\+/g, ' ').trim();
    const terms = cleanQ.split(/\s+/).filter(Boolean);
    for (const term of terms) {
      conditions.push(`(p.name ILIKE $${idx} OR p.description ILIKE $${idx} OR p.tagline ILIKE $${idx})`);
      values.push(`%${term}%`);
      idx++;
    }
  }

  if (input.skill) {
    conditions.push(
      `EXISTS (
        SELECT 1 FROM project_skills ps
        JOIN skills s ON s.id = ps.skill_id
        WHERE ps.project_id = p.id AND (s.name ILIKE $${idx} OR s.slug ILIKE $${idx})
      )`
    );
    values.push(`%${input.skill}%`);
    idx++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(DISTINCT p.id) as count FROM projects p ${whereClause}`,
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
       p.*,
       u.id AS creator_id,
       sp.full_name AS creator_name,
       sp.username AS creator_username,
       sp.avatar_url AS creator_avatar_url
     FROM projects p
     JOIN users u ON u.id = p.created_by
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    values
  );

  const projects: ProjectDetail[] = [];
  for (const row of rows) {
    const skills = await query<{ id: string; name: string; slug: string; is_required: boolean }>(
      `SELECT s.id, s.name, s.slug, ps.is_required
       FROM project_skills ps
       JOIN skills s ON s.id = ps.skill_id
       WHERE ps.project_id = $1`,
      [row.id]
    );

    projects.push({
      id: row.id as string,
      teamId: (row.team_id as string) || null,
      name: row.name as string,
      slug: row.slug as string,
      tagline: (row.tagline as string) || null,
      description: row.description as string,
      status: row.status as string,
      domain: (row.domain as string) || null,
      tags: (row.tags as string[]) || [],
      githubUrl: (row.github_url as string) || null,
      demoUrl: (row.demo_url as string) || null,
      documentationUrl: (row.documentation_url as string) || null,
      isPublic: Boolean(row.is_public),
      isFeatured: Boolean(row.is_featured),
      teamSize: (row.team_size as number) || 4,
      recruitmentStatus: (row.recruitment_status as 'open' | 'closed') || 'open',
      startDate: (row.start_date as string) || null,
      endDate: (row.end_date as string) || null,
      thumbnailUrl: (row.thumbnail_url as string) || null,
      createdBy: row.created_by as string,
      creatorName: (row.creator_name as string) || 'Anonymous',
      creatorUsername: (row.creator_username as string) || '',
      creatorAvatarUrl: (row.creator_avatar_url as string) || null,
      createdAt: (row.created_at as Date).toISOString(),
      updatedAt: (row.updated_at as Date).toISOString(),
      skills: skills.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        isRequired: Boolean(s.is_required),
      })),
      members: [],
    });
  }

  return { projects, total };
}

// ---------------------------------------------------------------------------
// Project Join Requests & Team Recruitment
// ---------------------------------------------------------------------------

export interface JoinRequestDetail {
  id: string;
  projectId: string;
  projectName?: string;
  projectDomain?: string | null;
  requesterId: string;
  requesterName: string;
  requesterUsername: string;
  requesterAvatarUrl: string | null;
  requesterHeadline: string | null;
  requesterSkills: string[];
  targetUserId: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  responseMessage: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function createJoinRequest(
  projectId: string,
  userId: string,
  input: CreateJoinRequestInput
): Promise<JoinRequestDetail> {
  const project = await queryOne<{
    id: string;
    name: string;
    created_by: string;
    is_public: boolean;
    team_size: number;
    recruitment_status: string;
  }>(
    `SELECT id, name, created_by, is_public, team_size, recruitment_status FROM projects WHERE id = $1`,
    [projectId]
  );

  if (!project) throw createError('Project not found', 404, 'NOT_FOUND');

  // Prevent project owners from requesting to join their own project
  if (project.created_by === userId) {
    throw createError('Project owners cannot apply to join their own project', 400, 'BAD_REQUEST');
  }

  // Prevent requests if recruitment is closed
  if (project.recruitment_status === 'closed') {
    throw createError('Recruitment for this project is currently closed', 400, 'RECRUITMENT_CLOSED');
  }

  // Check if team has reached maximum size
  const memberCountRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM project_members WHERE project_id = $1 AND left_at IS NULL`,
    [projectId]
  );
  const currentCount = parseInt(memberCountRow?.count || '0', 10);
  const maxTeamSize = project.team_size || 4;
  if (currentCount >= maxTeamSize) {
    throw createError(
      `This project team has reached its maximum size (${maxTeamSize} members)`,
      400,
      'TEAM_FULL'
    );
  }

  // Prevent duplicate if already an active member
  const existingMember = await queryOne<{ id: string }>(
    `SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2 AND left_at IS NULL`,
    [projectId, userId]
  );
  if (existingMember) {
    throw createError('You are already a member of this project', 400, 'ALREADY_MEMBER');
  }

  // Prevent duplicate if already has a pending or accepted request
  const existingRequest = await queryOne<{ id: string; status: string }>(
    `SELECT id, status FROM collaboration_requests WHERE project_id = $1 AND requester_user_id = $2 AND status IN ('pending', 'accepted')`,
    [projectId, userId]
  );
  if (existingRequest) {
    if (existingRequest.status === 'pending') {
      throw createError('You already have a pending join request for this project', 400, 'DUPLICATE_REQUEST');
    }
    if (existingRequest.status === 'accepted') {
      throw createError('You have already been accepted into this project', 400, 'ALREADY_ACCEPTED');
    }
  }

  const row = await queryOne<{ id: string }>(
    `INSERT INTO collaboration_requests (
      requester_user_id, project_id, target_user_id, message, status
    ) VALUES ($1, $2, $3, $4, 'pending')
    RETURNING id`,
    [userId, projectId, project.created_by, input.message?.trim() || null]
  );

  const requestId = row!.id;

  // Send notification to project owner
  const profile = await queryOne<{ full_name: string }>(
    `SELECT full_name FROM student_profiles WHERE user_id = $1`,
    [userId]
  );
  await createNotification({
    userId: project.created_by,
    type: 'project_join_request',
    title: `New Join Request for ${project.name}`,
    body: `${profile?.full_name || 'A student'} requested to join your project: "${input.message?.trim() || 'No message provided'}"`,
    actionUrl: `/projects/${projectId}`,
    actorId: userId,
    referenceType: 'project',
    referenceId: projectId,
  }).catch(() => {});

  return getJoinRequestById(requestId);
}

export async function getJoinRequestById(requestId: string): Promise<JoinRequestDetail> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT
       cr.*,
       p.name AS project_name,
       p.domain AS project_domain,
       sp.full_name AS requester_name,
       sp.username AS requester_username,
       sp.avatar_url AS requester_avatar_url,
       sp.headline AS requester_headline,
       COALESCE(
         (
           SELECT json_agg(s.name)
           FROM user_skills us
           JOIN skills s ON s.id = us.skill_id
           WHERE us.user_id = cr.requester_user_id
         ), '[]'::json
       ) AS requester_skills
     FROM collaboration_requests cr
     JOIN projects p ON p.id = cr.project_id
     JOIN users u ON u.id = cr.requester_user_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE cr.id = $1`,
    [requestId]
  );

  if (!row) throw createError('Join request not found', 404, 'NOT_FOUND');

  return {
    id: row.id as string,
    projectId: row.project_id as string,
    projectName: (row.project_name as string) || undefined,
    projectDomain: (row.project_domain as string) || null,
    requesterId: row.requester_user_id as string,
    requesterName: (row.requester_name as string) || 'Student',
    requesterUsername: (row.requester_username as string) || '',
    requesterAvatarUrl: (row.requester_avatar_url as string) || null,
    requesterHeadline: (row.requester_headline as string) || null,
    requesterSkills: (row.requester_skills as string[]) || [],
    targetUserId: row.target_user_id as string,
    message: (row.message as string) || null,
    status: row.status as 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed',
    responseMessage: (row.response_message as string) || null,
    respondedAt: row.responded_at ? new Date(row.responded_at as Date).toISOString() : null,
    createdAt: new Date(row.created_at as Date).toISOString(),
    updatedAt: new Date(row.updated_at as Date).toISOString(),
  };
}

export async function getProjectJoinRequests(
  projectId: string,
  userId: string,
  status?: string
): Promise<JoinRequestDetail[]> {
  // Verify user is project owner
  const project = await queryOne<{ created_by: string }>(
    `SELECT created_by FROM projects WHERE id = $1`,
    [projectId]
  );
  if (!project) throw createError('Project not found', 404, 'NOT_FOUND');
  if (project.created_by !== userId) {
    throw createError('Only the project owner can view join requests', 403, 'FORBIDDEN');
  }

  const conditions = ['cr.project_id = $1'];
  const values: unknown[] = [projectId];
  if (status) {
    conditions.push('cr.status = $2');
    values.push(status);
  }

  const rows = await query<Record<string, unknown>>(
    `SELECT
       cr.*,
       p.name AS project_name,
       p.domain AS project_domain,
       sp.full_name AS requester_name,
       sp.username AS requester_username,
       sp.avatar_url AS requester_avatar_url,
       sp.headline AS requester_headline,
       COALESCE(
         (
           SELECT json_agg(s.name)
           FROM user_skills us
           JOIN skills s ON s.id = us.skill_id
           WHERE us.user_id = cr.requester_user_id
         ), '[]'::json
       ) AS requester_skills
     FROM collaboration_requests cr
     JOIN projects p ON p.id = cr.project_id
     JOIN users u ON u.id = cr.requester_user_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY
       CASE WHEN cr.status = 'pending' THEN 0 ELSE 1 END,
       cr.created_at DESC`,
    values
  );

  return rows.map((row) => ({
    id: row.id as string,
    projectId: row.project_id as string,
    projectName: (row.project_name as string) || undefined,
    projectDomain: (row.project_domain as string) || null,
    requesterId: row.requester_user_id as string,
    requesterName: (row.requester_name as string) || 'Student',
    requesterUsername: (row.requester_username as string) || '',
    requesterAvatarUrl: (row.requester_avatar_url as string) || null,
    requesterHeadline: (row.requester_headline as string) || null,
    requesterSkills: (row.requester_skills as string[]) || [],
    targetUserId: row.target_user_id as string,
    message: (row.message as string) || null,
    status: row.status as 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed',
    responseMessage: (row.response_message as string) || null,
    respondedAt: row.responded_at ? new Date(row.responded_at as Date).toISOString() : null,
    createdAt: new Date(row.created_at as Date).toISOString(),
    updatedAt: new Date(row.updated_at as Date).toISOString(),
  }));
}

export async function reviewJoinRequest(
  projectId: string,
  requestId: string,
  reviewerId: string,
  input: ReviewJoinRequestInput
): Promise<JoinRequestDetail> {
  const project = await queryOne<{
    id: string;
    name: string;
    created_by: string;
    team_size: number;
    recruitment_status: string;
  }>(
    `SELECT id, name, created_by, team_size, recruitment_status FROM projects WHERE id = $1`,
    [projectId]
  );
  if (!project) throw createError('Project not found', 404, 'NOT_FOUND');
  if (project.created_by !== reviewerId) {
    throw createError('Only the project owner can review join requests', 403, 'FORBIDDEN');
  }

  const reqRow = await queryOne<{
    id: string;
    requester_user_id: string;
    status: string;
  }>(
    `SELECT id, requester_user_id, status FROM collaboration_requests WHERE id = $1 AND project_id = $2`,
    [requestId, projectId]
  );
  if (!reqRow) throw createError('Join request not found', 404, 'NOT_FOUND');

  if (input.status === 'accepted') {
    // Prevent acceptance if recruitment is closed
    if (project.recruitment_status === 'closed') {
      throw createError(
        'Cannot accept request because project recruitment is closed',
        400,
        'RECRUITMENT_CLOSED'
      );
    }

    // Prevent acceptance if team has reached maximum size
    const memberCountRow = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM project_members WHERE project_id = $1 AND left_at IS NULL`,
      [projectId]
    );
    const currentCount = parseInt(memberCountRow?.count || '0', 10);
    const maxTeamSize = project.team_size || 4;
    if (currentCount >= maxTeamSize) {
      throw createError(
        `Cannot accept request because the team has reached its maximum size (${maxTeamSize} members)`,
        400,
        'TEAM_FULL'
      );
    }

    // Execute status update and membership insertion in a transaction
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE collaboration_requests
         SET status = 'accepted',
             response_message = $1,
             responded_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [input.responseMessage?.trim() || null, requestId]
      );

      await client.query(
        `INSERT INTO project_members (project_id, user_id, role, contribution, joined_at)
         VALUES ($1, $2, 'Contributor', 'Accepted via Project Join Request', NOW())
         ON CONFLICT (project_id, user_id)
         DO UPDATE SET role = 'Contributor', left_at = NULL, joined_at = NOW()`,
        [projectId, reqRow.requester_user_id]
      );
    });

    // Notify applicant
    await createNotification({
      userId: reqRow.requester_user_id,
      type: 'project_join_accepted',
      title: `Accepted into ${project.name}!`,
      body: input.responseMessage?.trim() || `Your request to join ${project.name} has been accepted! You are now a team member.`,
      actionUrl: `/projects/${projectId}`,
      actorId: reviewerId,
      referenceType: 'project',
      referenceId: projectId,
    }).catch(() => {});
  } else {
    // Rejected
    await query(
      `UPDATE collaboration_requests
       SET status = 'rejected',
           response_message = $1,
           responded_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [input.responseMessage?.trim() || null, requestId]
    );

    // Notify applicant
    await createNotification({
      userId: reqRow.requester_user_id,
      type: 'project_join_rejected',
      title: `Update on Join Request for ${project.name}`,
      body: input.responseMessage?.trim() || `Your request to join ${project.name} was not accepted at this time.`,
      actionUrl: `/projects/${projectId}`,
      actorId: reviewerId,
      referenceType: 'project',
      referenceId: projectId,
    }).catch(() => {});
  }

  return getJoinRequestById(requestId);
}

export async function getMyJoinRequestForProject(
  projectId: string,
  userId: string
): Promise<JoinRequestDetail | null> {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM collaboration_requests
     WHERE project_id = $1 AND requester_user_id = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [projectId, userId]
  );

  if (!row) return null;
  return getJoinRequestById(row.id);
}

export async function getMySentJoinRequests(userId: string): Promise<JoinRequestDetail[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT
       cr.*,
       p.name AS project_name,
       p.domain AS project_domain,
       sp.full_name AS requester_name,
       sp.username AS requester_username,
       sp.avatar_url AS requester_avatar_url,
       sp.headline AS requester_headline,
       '[]'::json AS requester_skills
     FROM collaboration_requests cr
     JOIN projects p ON p.id = cr.project_id
     JOIN users u ON u.id = cr.requester_user_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE cr.requester_user_id = $1
     ORDER BY cr.created_at DESC`,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id as string,
    projectId: row.project_id as string,
    projectName: (row.project_name as string) || undefined,
    projectDomain: (row.project_domain as string) || null,
    requesterId: row.requester_user_id as string,
    requesterName: (row.requester_name as string) || 'Student',
    requesterUsername: (row.requester_username as string) || '',
    requesterAvatarUrl: (row.requester_avatar_url as string) || null,
    requesterHeadline: (row.requester_headline as string) || null,
    requesterSkills: [],
    targetUserId: row.target_user_id as string,
    message: (row.message as string) || null,
    status: row.status as 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed',
    responseMessage: (row.response_message as string) || null,
    respondedAt: row.responded_at ? new Date(row.responded_at as Date).toISOString() : null,
    createdAt: new Date(row.created_at as Date).toISOString(),
    updatedAt: new Date(row.updated_at as Date).toISOString(),
  }));
}
