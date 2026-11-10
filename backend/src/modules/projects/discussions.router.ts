import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import * as discussionsService from './discussions.service';
import {
  CreateThreadSchema,
  UpdateThreadSchema,
  CreateReplySchema,
  UpdateReplySchema,
  SearchThreadsSchema,
} from './discussions.schema';

const router = Router();

// GET /discussions/threads — list project discussion threads
router.get('/threads', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = SearchThreadsSchema.parse(req.query);
    const result = await discussionsService.listProjectThreads(input, req.user?.sub);
    res.json({
      data: result.threads,
      meta: {
        total: result.total,
        page: input.page,
        limit: input.limit,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /discussions/threads — create discussion thread
router.post('/threads', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateThreadSchema.parse(req.body);
    const thread = await discussionsService.createThread(req.user!.sub, input);
    res.status(201).json({ data: thread });
  } catch (err) {
    next(err);
  }
});

// GET /discussions/threads/:id — get thread details with replies
router.get('/threads/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const thread = await discussionsService.getThreadById(req.params.id);
    res.json({ data: thread });
  } catch (err) {
    next(err);
  }
});

// PATCH /discussions/threads/:id — update thread (author or project owner)
router.patch('/threads/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = UpdateThreadSchema.parse(req.body);
    const updated = await discussionsService.updateThread(req.params.id, req.user!.sub, input);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /discussions/threads/:id — delete thread (author or project owner)
router.delete('/threads/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await discussionsService.deleteThread(req.params.id, req.user!.sub);
    res.json({ data: { message: 'Discussion thread deleted' } });
  } catch (err) {
    next(err);
  }
});

// POST /discussions/threads/:id/replies — reply to a thread
router.post('/threads/:id/replies', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateReplySchema.parse(req.body);
    const reply = await discussionsService.createReply(req.params.id, req.user!.sub, input);
    res.status(201).json({ data: reply });
  } catch (err) {
    next(err);
  }
});

// PATCH /discussions/replies/:replyId — edit reply (author only)
router.patch('/replies/:replyId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = UpdateReplySchema.parse(req.body);
    const updated = await discussionsService.updateReply(req.params.replyId, req.user!.sub, input);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /discussions/replies/:replyId — delete reply (author or project owner)
router.delete('/replies/:replyId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await discussionsService.deleteReply(req.params.replyId, req.user!.sub);
    res.json({ data: { message: 'Reply deleted' } });
  } catch (err) {
    next(err);
  }
});

export default router;
