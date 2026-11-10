import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import * as usersService from './users.service';
import {
  UpdateProfileSchema,
  AddSkillSchema,
  SearchUsersSchema,
} from './users.schema';

const router = Router();

// ---------------------------------------------------------------------------
// GET /users/me — current user's profile
// ---------------------------------------------------------------------------
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await usersService.getProfileByUserId(req.user!.sub, req.user!.sub);
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /users/me — update current user's profile
// ---------------------------------------------------------------------------
router.patch('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = UpdateProfileSchema.parse(req.body);
    await usersService.updateProfile(req.user!.sub, input);
    const profile = await usersService.getProfileByUserId(req.user!.sub, req.user!.sub);
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /users/me/skills — add a skill
// ---------------------------------------------------------------------------
router.post('/me/skills', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = AddSkillSchema.parse(req.body);
    await usersService.addSkill(req.user!.sub, input);
    const profile = await usersService.getProfileByUserId(req.user!.sub, req.user!.sub);
    res.status(201).json({ data: profile.skills });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /users/me/skills/:skillId — remove a skill
// ---------------------------------------------------------------------------
router.delete('/me/skills/:skillId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await usersService.removeSkill(req.user!.sub, req.params.skillId);
    res.json({ data: { message: 'Skill removed' } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /users/search — search users
// ---------------------------------------------------------------------------
router.get('/search', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = SearchUsersSchema.parse(req.query);
    const result = await usersService.searchUsers(input, req.user?.sub);
    res.json({
      data: result.users,
      meta: { total: result.total, page: result.page, limit: result.limit },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /users/skills — skills catalog for autocomplete
// ---------------------------------------------------------------------------
router.get('/skills', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string | undefined;
    const skills = await usersService.getSkills(q);
    res.json({ data: skills });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /users/:username — public profile
// ---------------------------------------------------------------------------
router.get('/:username', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await usersService.getProfileByUsername(
      req.params.username,
      req.user?.sub
    );
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------
router.post('/connections/request', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { addresseeId, message } = req.body as { addresseeId: string; message?: string };
    if (!addresseeId) {
      res.status(400).json({ error: 'addresseeId is required', code: 'VALIDATION_ERROR' });
      return;
    }
    await usersService.sendConnectionRequest(req.user!.sub, addresseeId, message);
    res.status(201).json({ data: { message: 'Connection request sent' } });
  } catch (err) {
    next(err);
  }
});

router.patch('/connections/:id/respond', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action } = req.body as { action: 'accept' | 'reject' };
    if (!['accept', 'reject'].includes(action)) {
      res.status(400).json({ error: 'action must be accept or reject', code: 'VALIDATION_ERROR' });
      return;
    }
    await usersService.respondToConnection(req.user!.sub, req.params.id, action);
    res.json({ data: { message: `Connection ${action}ed` } });
  } catch (err) {
    next(err);
  }
});

router.get('/connections/list', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = (req.query.type as string) ?? 'all';
    if (!['all', 'pending', 'sent'].includes(type)) {
      res.status(400).json({ error: 'type must be all, pending, or sent', code: 'VALIDATION_ERROR' });
      return;
    }
    const connections = await usersService.getConnections(req.user!.sub, type as 'all' | 'pending' | 'sent');
    res.json({ data: connections });
  } catch (err) {
    next(err);
  }
});

export default router;
