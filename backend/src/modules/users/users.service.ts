import { query, queryOne, withTransaction } from '../../lib/db';
import { createError } from '../../middleware/errors';
import type { UpdateProfileInput, AddSkillInput, SearchUsersInput } from './users.schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SkillRow {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  level: string;
  years: number | null;
  is_primary: boolean;
  endorsement_count: number;
}

export interface UserProjectSummary {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string;
  status: string;
  domain: string | null;
  tags: string[];
  githubUrl: string | null;
  demoUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  role: string;
  isOwner: boolean;
  skills: string[];
}

export interface ProfileDetail {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  headline: string | null;
  institution: string | null;
  department: string | null;
  degree: string | null;
  yearOfStudy: number | null;
  graduationYear: number | null;
  city: string | null;
  country: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  websiteUrl: string | null;
  isPublic: boolean;
  openToCollaborate: boolean;
  emailVerified: boolean;
  verificationStatus: string;
  role: string;
  skills: SkillRow[];
  projects: UserProjectSummary[];
  connectionCount: number;
  followerCount: number;
  followingCount: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Get profile by username or userId
// ---------------------------------------------------------------------------
export async function getProfileByUsername(
  username: string,
  viewerId?: string
): Promise<ProfileDetail> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT
       sp.id, sp.user_id, sp.full_name, sp.username, sp.avatar_url,
       sp.bio, sp.headline, sp.institution, sp.department, sp.degree,
       sp.year_of_study, sp.graduation_year, sp.city, sp.country,
       sp.github_url, sp.linkedin_url, sp.portfolio_url, sp.website_url,
       sp.is_public, sp.open_to_collaborate, sp.created_at,
       u.email_verified, u.verification_status, u.role
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     WHERE sp.username = $1 AND u.is_active = TRUE`,
    [username]
  );

  if (!row) throw createError('Profile not found', 404, 'NOT_FOUND');
  if (!row.is_public && viewerId !== row.user_id) {
    throw createError('This profile is private', 403, 'PROFILE_PRIVATE');
  }

  return buildProfileDetail(row);
}

export async function getProfileByUserId(
  userId: string,
  viewerId?: string
): Promise<ProfileDetail> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT
       sp.id, sp.user_id, sp.full_name, sp.username, sp.avatar_url,
       sp.bio, sp.headline, sp.institution, sp.department, sp.degree,
       sp.year_of_study, sp.graduation_year, sp.city, sp.country,
       sp.github_url, sp.linkedin_url, sp.portfolio_url, sp.website_url,
       sp.is_public, sp.open_to_collaborate, sp.created_at,
       u.email_verified, u.verification_status, u.role
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     WHERE sp.user_id = $1 AND u.is_active = TRUE`,
    [userId]
  );

  if (!row) throw createError('Profile not found', 404, 'NOT_FOUND');
  if (!row.is_public && viewerId !== userId) {
    throw createError('This profile is private', 403, 'PROFILE_PRIVATE');
  }

  return buildProfileDetail(row);
}

async function buildProfileDetail(row: Record<string, unknown>): Promise<ProfileDetail> {
  const userId = row.user_id as string;

  // Load skills with endorsement counts
  const skills = await query<SkillRow>(
    `SELECT
       s.id, s.name, s.slug, s.category,
       us.level, us.years, us.is_primary,
       COUNT(se.id)::int AS endorsement_count
     FROM user_skills us
     JOIN skills s ON s.id = us.skill_id
     LEFT JOIN skill_endorsements se ON se.skill_id = us.skill_id AND se.endorsed_id = us.user_id
     WHERE us.user_id = $1
     GROUP BY s.id, s.name, s.slug, s.category, us.level, us.years, us.is_primary
     ORDER BY us.is_primary DESC, endorsement_count DESC, s.name`,
    [userId]
  );

  // Load social counts
  const counts = await queryOne<{
    connection_count: number;
    follower_count: number;
    following_count: number;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM connections WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'accepted')::int AS connection_count,
       (SELECT COUNT(*) FROM follows WHERE following_id = $1)::int AS follower_count,
       (SELECT COUNT(*) FROM follows WHERE follower_id = $1)::int AS following_count`,
    [userId]
  );

  // Load user's showcase & portfolio projects
  const projectRows = await query<Record<string, unknown>>(
    `SELECT DISTINCT
       p.id, p.name, p.slug, p.tagline, p.description, p.status, p.domain, p.tags,
       p.github_url, p.demo_url, p.thumbnail_url, p.created_by, p.created_at,
       COALESCE(pm.role, CASE WHEN p.created_by = $1 THEN 'Project Lead' ELSE 'Contributor' END) AS member_role
     FROM projects p
     LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1 AND pm.left_at IS NULL
     WHERE (p.created_by = $1 OR pm.user_id = $1)
       AND p.is_public = TRUE
     ORDER BY p.created_at DESC`,
    [userId]
  );

  const projects: UserProjectSummary[] = [];
  for (const p of projectRows) {
    const pSkills = await query<{ name: string }>(
      `SELECT s.name FROM project_skills ps
       JOIN skills s ON s.id = ps.skill_id
       WHERE ps.project_id = $1
       ORDER BY s.name ASC`,
      [p.id]
    );

    projects.push({
      id: p.id as string,
      name: p.name as string,
      slug: p.slug as string,
      tagline: (p.tagline as string) || null,
      description: p.description as string,
      status: p.status as string,
      domain: (p.domain as string) || null,
      tags: (p.tags as string[]) || [],
      githubUrl: (p.github_url as string) || null,
      demoUrl: (p.demo_url as string) || null,
      thumbnailUrl: (p.thumbnail_url as string) || null,
      createdAt: (p.created_at as Date).toISOString(),
      role: (p.member_role as string) || 'Contributor',
      isOwner: p.created_by === userId,
      skills: pSkills.map((s) => s.name),
    });
  }

  return {
    id: row.id as string,
    userId,
    fullName: row.full_name as string,
    username: row.username as string,
    avatarUrl: row.avatar_url as string | null,
    bio: row.bio as string | null,
    headline: row.headline as string | null,
    institution: row.institution as string | null,
    department: row.department as string | null,
    degree: row.degree as string | null,
    yearOfStudy: row.year_of_study as number | null,
    graduationYear: row.graduation_year as number | null,
    city: row.city as string | null,
    country: row.country as string | null,
    githubUrl: row.github_url as string | null,
    linkedinUrl: row.linkedin_url as string | null,
    portfolioUrl: row.portfolio_url as string | null,
    websiteUrl: row.website_url as string | null,
    isPublic: row.is_public as boolean,
    openToCollaborate: row.open_to_collaborate as boolean,
    emailVerified: row.email_verified as boolean,
    verificationStatus: row.verification_status as string,
    role: row.role as string,
    skills,
    projects,
    connectionCount: counts?.connection_count ?? 0,
    followerCount: counts?.follower_count ?? 0,
    followingCount: counts?.following_count ?? 0,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Update profile
// ---------------------------------------------------------------------------
export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<void> {
  // Build dynamic SET clause
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const fieldMap: Record<string, string> = {
    fullName: 'full_name',
    headline: 'headline',
    bio: 'bio',
    institution: 'institution',
    department: 'department',
    degree: 'degree',
    yearOfStudy: 'year_of_study',
    graduationYear: 'graduation_year',
    city: 'city',
    country: 'country',
    githubUrl: 'github_url',
    linkedinUrl: 'linkedin_url',
    portfolioUrl: 'portfolio_url',
    websiteUrl: 'website_url',
    isPublic: 'is_public',
    openToCollaborate: 'open_to_collaborate',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in input && input[key as keyof UpdateProfileInput] !== undefined) {
      updates.push(`${col} = $${idx++}`);
      values.push(input[key as keyof UpdateProfileInput] ?? null);
    }
  }

  if (updates.length === 0) return; // nothing to update

  values.push(userId);
  await query(
    `UPDATE student_profiles SET ${updates.join(', ')}, updated_at = NOW() WHERE user_id = $${idx}`,
    values
  );
}

// ---------------------------------------------------------------------------
// Skills management
// ---------------------------------------------------------------------------
export async function addSkill(userId: string, input: AddSkillInput): Promise<void> {
  let skillId = input.skillId;

  if (!skillId && input.skillName) {
    const slug = input.skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM skills WHERE slug = $1 OR name ILIKE $2',
      [slug, input.skillName]
    );

    if (existing) {
      skillId = existing.id;
    } else {
      const created = await queryOne<{ id: string }>(
        'INSERT INTO skills (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [input.skillName.trim(), slug]
      );
      skillId = created!.id;
    }
  }

  if (!skillId) throw createError('Skill not found', 400, 'SKILL_NOT_FOUND');

  await query(
    `INSERT INTO user_skills (user_id, skill_id, level, years, is_primary)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, skill_id) DO UPDATE
     SET level = EXCLUDED.level, years = EXCLUDED.years, is_primary = EXCLUDED.is_primary`,
    [userId, skillId, input.level, input.years ?? null, input.isPrimary]
  );
}

export async function removeSkill(userId: string, skillId: string): Promise<void> {
  const result = await query(
    'DELETE FROM user_skills WHERE user_id = $1 AND skill_id = $2',
    [userId, skillId]
  );
  if ((result as unknown as { rowCount: number }).rowCount === 0) {
    throw createError('Skill not found on your profile', 404, 'NOT_FOUND');
  }
}

// ---------------------------------------------------------------------------
// Search users
// ---------------------------------------------------------------------------
export async function searchUsers(
  input: SearchUsersInput,
  viewerId?: string
): Promise<{ users: ProfileDetail[]; total: number; page: number; limit: number }> {
  const conditions: string[] = ['u.is_active = TRUE', 'sp.is_public = TRUE'];
  const params: unknown[] = [];
  let idx = 1;

  if (input.q) {
    conditions.push(`sp.search_vector @@ plainto_tsquery('english', $${idx++})`);
    params.push(input.q);
  }
  if (input.institution) {
    conditions.push(`sp.institution ILIKE $${idx++}`);
    params.push(`%${input.institution}%`);
  }
  if (input.department) {
    conditions.push(`sp.department ILIKE $${idx++}`);
    params.push(`%${input.department}%`);
  }
  if (input.openToCollaborate) {
    conditions.push(`sp.open_to_collaborate = TRUE`);
  }

  let skillJoin = '';
  if (input.skills) {
    const skillList = input.skills.split(',').map((s) => s.trim()).filter(Boolean);
    if (skillList.length > 0) {
      skillJoin = `
        JOIN user_skills us ON us.user_id = u.id
        JOIN skills sk ON sk.id = us.skill_id AND (sk.id = ANY($${idx}::uuid[]) OR sk.name ILIKE ANY($${idx + 1}::text[]))
      `;
      params.push(skillList.filter((s) => s.match(/^[0-9a-f-]{36}$/i)));
      params.push(skillList.map((s) => `%${s}%`));
      idx += 2;
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (input.page - 1) * input.limit;

  const countResult = await queryOne<{ count: number }>(
    `SELECT COUNT(DISTINCT sp.user_id)::int as count
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     ${skillJoin}
     ${where}`,
    params
  );

  const rows = await query<Record<string, unknown>>(
    `SELECT DISTINCT ON (sp.user_id)
       sp.id, sp.user_id, sp.full_name, sp.username, sp.avatar_url,
       sp.bio, sp.headline, sp.institution, sp.department, sp.degree,
       sp.year_of_study, sp.graduation_year, sp.city, sp.country,
       sp.github_url, sp.linkedin_url, sp.portfolio_url, sp.website_url,
       sp.is_public, sp.open_to_collaborate, sp.created_at,
       u.email_verified, u.verification_status, u.role
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     ${skillJoin}
     ${where}
     ORDER BY sp.user_id,
       ${input.q ? `ts_rank(sp.search_vector, plainto_tsquery('english', $1)) DESC,` : ''}
       sp.open_to_collaborate DESC, sp.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, input.limit, offset]
  );

  const profiles = await Promise.all(rows.map((r) => buildProfileDetail(r)));

  return {
    users: profiles,
    total: countResult?.count ?? 0,
    page: input.page,
    limit: input.limit,
  };
}

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------
export async function sendConnectionRequest(
  requesterId: string,
  addresseeId: string,
  message?: string
): Promise<void> {
  if (requesterId === addresseeId) {
    throw createError('Cannot connect with yourself', 400, 'SELF_CONNECTION');
  }

  // Check if addressee exists
  const addressee = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE id = $1 AND is_active = TRUE',
    [addresseeId]
  );
  if (!addressee) throw createError('User not found', 404, 'NOT_FOUND');

  // Check for existing connection
  const existing = await queryOne<{ status: string }>(
    `SELECT status FROM connections
     WHERE (requester_id = $1 AND addressee_id = $2)
        OR (requester_id = $2 AND addressee_id = $1)`,
    [requesterId, addresseeId]
  );

  if (existing) {
    if (existing.status === 'accepted') throw createError('Already connected', 409, 'ALREADY_CONNECTED');
    if (existing.status === 'pending') throw createError('Connection request already sent', 409, 'REQUEST_PENDING');
    if (existing.status === 'blocked') throw createError('Cannot connect with this user', 403, 'BLOCKED');
  }

  await query(
    `INSERT INTO connections (requester_id, addressee_id, message)
     VALUES ($1, $2, $3)`,
    [requesterId, addresseeId, message ?? null]
  );
}

export async function respondToConnection(
  addresseeId: string,
  connectionId: string,
  action: 'accept' | 'reject'
): Promise<void> {
  const conn = await queryOne<{ id: string; addressee_id: string; status: string }>(
    'SELECT id, addressee_id, status FROM connections WHERE id = $1',
    [connectionId]
  );

  if (!conn) throw createError('Connection request not found', 404, 'NOT_FOUND');
  if (conn.addressee_id !== addresseeId) throw createError('Not authorized', 403, 'FORBIDDEN');
  if (conn.status !== 'pending') throw createError('Request is no longer pending', 400, 'INVALID_STATUS');

  const newStatus = action === 'accept' ? 'accepted' : 'rejected';
  await query(
    'UPDATE connections SET status = $1 WHERE id = $2',
    [newStatus, connectionId]
  );
}

export async function getConnections(
  userId: string,
  type: 'all' | 'pending' | 'sent'
): Promise<Record<string, unknown>[]> {
  if (type === 'pending') {
    return query(
      `SELECT c.id, c.status, c.created_at, c.message,
         sp.user_id, sp.full_name, sp.username, sp.avatar_url, sp.headline
       FROM connections c
       JOIN student_profiles sp ON sp.user_id = c.requester_id
       WHERE c.addressee_id = $1 AND c.status = 'pending'
       ORDER BY c.created_at DESC`,
      [userId]
    );
  }
  if (type === 'sent') {
    return query(
      `SELECT c.id, c.status, c.created_at, c.message,
         sp.user_id, sp.full_name, sp.username, sp.avatar_url, sp.headline
       FROM connections c
       JOIN student_profiles sp ON sp.user_id = c.addressee_id
       WHERE c.requester_id = $1 AND c.status = 'pending'
       ORDER BY c.created_at DESC`,
      [userId]
    );
  }
  // All accepted connections
  return query(
    `SELECT c.id, c.status, c.created_at,
       CASE WHEN c.requester_id = $1 THEN c.addressee_id ELSE c.requester_id END AS connected_user_id,
       sp.full_name, sp.username, sp.avatar_url, sp.headline
     FROM connections c
     JOIN student_profiles sp ON sp.user_id = (
       CASE WHEN c.requester_id = $1 THEN c.addressee_id ELSE c.requester_id END
     )
     WHERE (c.requester_id = $1 OR c.addressee_id = $1) AND c.status = 'accepted'
     ORDER BY c.created_at DESC`,
    [userId]
  );
}

// ---------------------------------------------------------------------------
// Skills catalog (for autocomplete)
// ---------------------------------------------------------------------------
export async function getSkills(query_str?: string): Promise<{ id: string; name: string; slug: string; category: string | null }[]> {
  if (query_str) {
    return query(
      `SELECT id, name, slug, category FROM skills
       WHERE name ILIKE $1 OR slug ILIKE $1
       ORDER BY name LIMIT 20`,
      [`%${query_str}%`]
    );
  }
  return query('SELECT id, name, slug, category FROM skills ORDER BY name LIMIT 200');
}
