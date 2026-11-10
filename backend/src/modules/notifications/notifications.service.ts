import { query, queryOne } from '../../lib/db';

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body?: string;
  actionUrl?: string;
  actorId?: string;
  referenceType?: string;
  referenceId?: string;
}

export interface NotificationDetail {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  actionUrl: string | null;
  actorId: string | null;
  actorName: string | null;
  actorUsername: string | null;
  actorAvatarUrl: string | null;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  // Never notify user of their own actions
  if (params.actorId && params.actorId === params.userId) {
    return;
  }

  await query(
    `INSERT INTO notifications (
       user_id, type, title, body, action_url, actor_id, reference_type, reference_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      params.userId,
      params.type,
      params.title,
      params.body || null,
      params.actionUrl || null,
      params.actorId || null,
      params.referenceType || null,
      params.referenceId || null,
    ]
  );
}

export async function getUserNotifications(
  userId: string,
  limit: number = 20
): Promise<{ notifications: NotificationDetail[]; unreadCount: number }> {
  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  const unreadCount = parseInt(countRow?.count || '0', 10);

  const rows = await query<Record<string, unknown>>(
    `SELECT
       n.*,
       sp.full_name AS actor_name,
       sp.username AS actor_username,
       sp.avatar_url AS actor_avatar_url
     FROM notifications n
     LEFT JOIN users u ON u.id = n.actor_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE n.user_id = $1
     ORDER BY n.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  const notifications: NotificationDetail[] = rows.map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    type: r.type as string,
    title: r.title as string,
    body: (r.body as string) || null,
    actionUrl: (r.action_url as string) || null,
    actorId: (r.actor_id as string) || null,
    actorName: (r.actor_name as string) || null,
    actorUsername: (r.actor_username as string) || null,
    actorAvatarUrl: (r.actor_avatar_url as string) || null,
    referenceType: (r.reference_type as string) || null,
    referenceId: (r.reference_id as string) || null,
    isRead: Boolean(r.is_read),
    readAt: r.read_at ? (r.read_at as Date).toISOString() : null,
    createdAt: (r.created_at as Date).toISOString(),
  }));

  return { notifications, unreadCount };
}

export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
  await query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = NOW()
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
}
