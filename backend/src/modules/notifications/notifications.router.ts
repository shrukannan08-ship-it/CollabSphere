import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as notificationsService from './notifications.service';

const router = Router();

// GET /notifications — get current user's notifications
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 50);
    const result = await notificationsService.getUserNotifications(req.user!.sub, limit);
    res.json({
      data: result.notifications,
      meta: { unreadCount: result.unreadCount },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /notifications/:id/read — mark single notification as read
router.patch('/:id/read', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationsService.markNotificationAsRead(req.params.id, req.user!.sub);
    res.json({ data: { message: 'Marked as read' } });
  } catch (err) {
    next(err);
  }
});

// POST /notifications/read-all — mark all as read
router.post('/read-all', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationsService.markAllNotificationsAsRead(req.user!.sub);
    res.json({ data: { message: 'All notifications marked as read' } });
  } catch (err) {
    next(err);
  }
});

export default router;
