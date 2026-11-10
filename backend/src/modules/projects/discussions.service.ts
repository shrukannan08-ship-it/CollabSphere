import { query, queryOne, withTransaction } from '../../lib/db';
import { createError } from '../../middleware/errors';
import { createNotification } from '../notifications/notifications.service';
import type {
  CreateThreadInput,
  UpdateThreadInput,
  CreateReplyInput,
  UpdateReplyInput,
  SearchThreadsInput,
} from './discussions.schema';

export interface ThreadReplyDetail {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  parentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadDetail {
  id: string;
  projectId: string;
  projectName?: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  title: string;
  content: string;
  isPinned: boolean;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  replies?: ThreadReplyDetail[];
}

export async function createThread(userId: string, input: CreateThreadInput): Promise<ThreadDetail> {
  const project = await queryOne<{ id: string; name: string; created_by: string; is_public: boolean }>(
    `SELECT id, name, created_by, is_public FROM projects WHERE id = $1`,
    [input.projectId]
  );
  if (!project) throw createError('Project not found', 404, 'NOT_FOUND');

  // Check visibility / membership
  if (!project.is_public && project.created_by !== userId) {
    const isMember = await queryOne<{ user_id: string }>(
      `SELECT user_id FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [input.projectId, userId]
    );
    if (!isMember) {
      throw createError('You do not have permission to post in this project discussion', 403, 'FORBIDDEN');
    }
  }

  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO discussion_threads (project_id, author_id, title, content, is_pinned)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [input.projectId, userId, input.title, input.content, input.isPinned ?? false]
  );

  // Notify project owner if someone else started a discussion
  if (project.created_by !== userId) {
    await createNotification({
      userId: project.created_by,
      type: 'project_update',
      title: `New discussion on ${project.name}`,
      body: input.title,
      actionUrl: `/projects/${input.projectId}#discussions`,
      actorId: userId,
      referenceType: 'discussion_thread',
      referenceId: row!.id as string,
    });
  }

  return getThreadById(row!.id as string);
}

export async function getThreadById(threadId: string): Promise<ThreadDetail> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT
       t.*,
       p.name AS project_name,
       sp.full_name AS author_name,
       sp.username AS author_username,
       sp.avatar_url AS author_avatar_url
     FROM discussion_threads t
     JOIN projects p ON p.id = t.project_id
     JOIN users u ON u.id = t.author_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE t.id = $1`,
    [threadId]
  );

  if (!row) throw createError('Discussion thread not found', 404, 'NOT_FOUND');

  // Load replies
  const repliesRows = await query<Record<string, unknown>>(
    `SELECT
       r.*,
       sp.full_name AS author_name,
       sp.username AS author_username,
       sp.avatar_url AS author_avatar_url
     FROM thread_replies r
     JOIN users u ON u.id = r.author_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE r.thread_id = $1
     ORDER BY r.created_at ASC`,
    [threadId]
  );

  const replies: ThreadReplyDetail[] = repliesRows.map((r) => ({
    id: r.id as string,
    threadId: r.thread_id as string,
    authorId: r.author_id as string,
    authorName: (r.author_name as string) || 'Anonymous',
    authorUsername: (r.author_username as string) || '',
    authorAvatarUrl: (r.author_avatar_url as string) || null,
    parentId: (r.parent_id as string) || null,
    content: r.content as string,
    createdAt: (r.created_at as Date).toISOString(),
    updatedAt: (r.updated_at as Date).toISOString(),
  }));

  return {
    id: row.id as string,
    projectId: row.project_id as string,
    projectName: (row.project_name as string) || undefined,
    authorId: row.author_id as string,
    authorName: (row.author_name as string) || 'Anonymous',
    authorUsername: (row.author_username as string) || '',
    authorAvatarUrl: (row.author_avatar_url as string) || null,
    title: row.title as string,
    content: row.content as string,
    isPinned: Boolean(row.is_pinned),
    replyCount: (row.reply_count as number) || 0,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
    replies,
  };
}

export async function listProjectThreads(
  input: SearchThreadsInput,
  viewerId?: string
): Promise<{ threads: ThreadDetail[]; total: number }> {
  const project = await queryOne<{ id: string; created_by: string; is_public: boolean }>(
    `SELECT id, created_by, is_public FROM projects WHERE id = $1`,
    [input.projectId]
  );
  if (!project) throw createError('Project not found', 404, 'NOT_FOUND');

  if (!project.is_public && project.created_by !== viewerId) {
    const isMember = viewerId
      ? await queryOne<{ user_id: string }>(
          `SELECT user_id FROM project_members WHERE project_id = $1 AND user_id = $2`,
          [input.projectId, viewerId]
        )
      : null;
    if (!isMember) {
      throw createError('You do not have access to view this project discussion', 403, 'FORBIDDEN');
    }
  }

  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM discussion_threads WHERE project_id = $1`,
    [input.projectId]
  );
  const total = parseInt(countRow?.count || '0', 10);

  const offset = (input.page - 1) * input.limit;
  const rows = await query<Record<string, unknown>>(
    `SELECT
       t.*,
       sp.full_name AS author_name,
       sp.username AS author_username,
       sp.avatar_url AS author_avatar_url
     FROM discussion_threads t
     JOIN users u ON u.id = t.author_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE t.project_id = $1
     ORDER BY t.is_pinned DESC, t.created_at DESC
     LIMIT $2 OFFSET $3`,
    [input.projectId, input.limit, offset]
  );

  const threads: ThreadDetail[] = rows.map((row) => ({
    id: row.id as string,
    projectId: row.project_id as string,
    authorId: row.author_id as string,
    authorName: (row.author_name as string) || 'Anonymous',
    authorUsername: (row.author_username as string) || '',
    authorAvatarUrl: (row.author_avatar_url as string) || null,
    title: row.title as string,
    content: row.content as string,
    isPinned: Boolean(row.is_pinned),
    replyCount: (row.reply_count as number) || 0,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  }));

  return { threads, total };
}

export async function updateThread(
  threadId: string,
  userId: string,
  input: UpdateThreadInput
): Promise<ThreadDetail> {
  const existing = await queryOne<{ author_id: string; project_id: string }>(
    `SELECT author_id, project_id FROM discussion_threads WHERE id = $1`,
    [threadId]
  );
  if (!existing) throw createError('Discussion thread not found', 404, 'NOT_FOUND');

  // Author or project owner (moderator) can edit
  const project = await queryOne<{ created_by: string }>(
    `SELECT created_by FROM projects WHERE id = $1`,
    [existing.project_id]
  );

  const isAuthor = existing.author_id === userId;
  const isOwner = project && project.created_by === userId;

  if (!isAuthor && !isOwner) {
    throw createError('You are not authorized to edit this discussion thread', 403, 'FORBIDDEN');
  }

  // Only the original author can edit thread content; moderators/owners can only pin/unpin
  if (!isAuthor && (input.title !== undefined || input.content !== undefined)) {
    throw createError('Only the thread author can edit the thread title and content', 403, 'FORBIDDEN');
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${idx++}`);
    values.push(input.title);
  }
  if (input.content !== undefined) {
    updates.push(`content = $${idx++}`);
    values.push(input.content);
  }
  if (input.isPinned !== undefined && isOwner) {
    updates.push(`is_pinned = $${idx++}`);
    values.push(input.isPinned);
  }

  if (updates.length > 0) {
    values.push(threadId);
    await query(
      `UPDATE discussion_threads SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
      values
    );
  }

  return getThreadById(threadId);
}

export async function deleteThread(threadId: string, userId: string): Promise<void> {
  const existing = await queryOne<{ author_id: string; project_id: string }>(
    `SELECT author_id, project_id FROM discussion_threads WHERE id = $1`,
    [threadId]
  );
  if (!existing) throw createError('Discussion thread not found', 404, 'NOT_FOUND');

  const project = await queryOne<{ created_by: string }>(
    `SELECT created_by FROM projects WHERE id = $1`,
    [existing.project_id]
  );

  const isAuthor = existing.author_id === userId;
  const isOwner = project && project.created_by === userId;

  if (!isAuthor && !isOwner) {
    throw createError('You are not authorized to delete this discussion', 403, 'FORBIDDEN');
  }

  await query(`DELETE FROM discussion_threads WHERE id = $1`, [threadId]);
}

// ---------------------------------------------------------------------------
// Replies / Comments
// ---------------------------------------------------------------------------

export async function createReply(
  threadId: string,
  userId: string,
  input: CreateReplyInput
): Promise<ThreadReplyDetail> {
  const thread = await queryOne<{ id: string; project_id: string; author_id: string; title: string }>(
    `SELECT id, project_id, author_id, title FROM discussion_threads WHERE id = $1`,
    [threadId]
  );
  if (!thread) throw createError('Discussion thread not found', 404, 'NOT_FOUND');

  const project = await queryOne<{ id: string; name: string; created_by: string; is_public: boolean }>(
    `SELECT id, name, created_by, is_public FROM projects WHERE id = $1`,
    [thread.project_id]
  );
  if (!project) throw createError('Project not found', 404, 'NOT_FOUND');

  return withTransaction(async (client) => {
    const res = await client.query<{ id: string }>(
      `INSERT INTO thread_replies (thread_id, author_id, parent_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [threadId, userId, input.parentId || null, input.content]
    );

    // Keep reply_count updated
    await client.query(
      `UPDATE discussion_threads SET reply_count = reply_count + 1 WHERE id = $1`,
      [threadId]
    );

    const replyId = res.rows[0].id;

    // Notify thread author
    await createNotification({
      userId: thread.author_id,
      type: 'post_comment',
      title: `New reply on "${thread.title}"`,
      body: input.content.slice(0, 100),
      actionUrl: `/projects/${thread.project_id}#discussions`,
      actorId: userId,
      referenceType: 'thread_reply',
      referenceId: replyId,
    });

    const replyRes = await client.query<Record<string, unknown>>(
      `SELECT
         r.*,
         sp.full_name AS author_name,
         sp.username AS author_username,
         sp.avatar_url AS author_avatar_url
       FROM thread_replies r
       JOIN users u ON u.id = r.author_id
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       WHERE r.id = $1`,
      [replyId]
    );
    const replyRow = replyRes.rows[0];

    return {
      id: replyRow!.id as string,
      threadId: replyRow!.thread_id as string,
      authorId: replyRow!.author_id as string,
      authorName: (replyRow!.author_name as string) || 'Anonymous',
      authorUsername: (replyRow!.author_username as string) || '',
      authorAvatarUrl: (replyRow!.author_avatar_url as string) || null,
      parentId: (replyRow!.parent_id as string) || null,
      content: replyRow!.content as string,
      createdAt: (replyRow!.created_at as Date).toISOString(),
      updatedAt: (replyRow!.updated_at as Date).toISOString(),
    };
  });
}

export async function updateReply(
  replyId: string,
  userId: string,
  input: UpdateReplyInput
): Promise<ThreadReplyDetail> {
  const existing = await queryOne<{ author_id: string; thread_id: string }>(
    `SELECT author_id, thread_id FROM thread_replies WHERE id = $1`,
    [replyId]
  );
  if (!existing) throw createError('Reply not found', 404, 'NOT_FOUND');
  if (existing.author_id !== userId) {
    throw createError('You are not authorized to edit this reply', 403, 'FORBIDDEN');
  }

  await query(
    `UPDATE thread_replies SET content = $1, updated_at = NOW() WHERE id = $2`,
    [input.content, replyId]
  );

  const row = await queryOne<Record<string, unknown>>(
    `SELECT
       r.*,
       sp.full_name AS author_name,
       sp.username AS author_username,
       sp.avatar_url AS author_avatar_url
     FROM thread_replies r
     JOIN users u ON u.id = r.author_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE r.id = $1`,
    [replyId]
  );

  return {
    id: row!.id as string,
    threadId: row!.thread_id as string,
    authorId: row!.author_id as string,
    authorName: (row!.author_name as string) || 'Anonymous',
    authorUsername: (row!.author_username as string) || '',
    authorAvatarUrl: (row!.author_avatar_url as string) || null,
    parentId: (row!.parent_id as string) || null,
    content: row!.content as string,
    createdAt: (row!.created_at as Date).toISOString(),
    updatedAt: (row!.updated_at as Date).toISOString(),
  };
}

export async function deleteReply(replyId: string, userId: string): Promise<void> {
  const existing = await queryOne<{ author_id: string; thread_id: string }>(
    `SELECT r.author_id, r.thread_id, t.project_id
     FROM thread_replies r
     JOIN discussion_threads t ON t.id = r.thread_id
     WHERE r.id = $1`,
    [replyId]
  );
  if (!existing) throw createError('Reply not found', 404, 'NOT_FOUND');

  const project = await queryOne<{ created_by: string }>(
    `SELECT created_by FROM projects WHERE id = $1`,
    [(existing as Record<string, unknown>).project_id]
  );

  const isAuthor = existing.author_id === userId;
  const isOwner = project && project.created_by === userId;

  if (!isAuthor && !isOwner) {
    throw createError('You are not authorized to delete this reply', 403, 'FORBIDDEN');
  }

  await withTransaction(async (client) => {
    await client.query(`DELETE FROM thread_replies WHERE id = $1`, [replyId]);
    await client.query(
      `UPDATE discussion_threads SET reply_count = GREATEST(0, reply_count - 1) WHERE id = $1`,
      [existing.thread_id]
    );
  });
}
