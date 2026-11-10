import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import * as positionsService from './positions.service';
import {
  CreatePositionSchema,
  UpdatePositionSchema,
  ApplyPositionSchema,
  ReviewApplicationSchema,
  SearchPositionsSchema,
} from './positions.schema';

const router = Router();

// ---------------------------------------------------------------------------
// GET /positions — browse/search recruitment positions
// ---------------------------------------------------------------------------
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = SearchPositionsSchema.parse(req.query);
    const result = await positionsService.searchPositions(input);
    res.json({
      data: result.positions,
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

// ---------------------------------------------------------------------------
// POST /positions — create recruitment post (project owner)
// ---------------------------------------------------------------------------
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreatePositionSchema.parse(req.body);
    const position = await positionsService.createPosition(req.user!.sub, input);
    res.status(201).json({ data: position });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /positions/my-applications — list applications submitted by current user
// ---------------------------------------------------------------------------
router.get('/my-applications', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applications = await positionsService.listMyApplications(req.user!.sub);
    res.json({ data: applications });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /positions/:id — get position details
// ---------------------------------------------------------------------------
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const position = await positionsService.getPositionById(req.params.id);
    res.json({ data: position });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /positions/:id — update recruitment post (owner only)
// ---------------------------------------------------------------------------
router.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = UpdatePositionSchema.parse(req.body);
    const position = await positionsService.updatePosition(req.params.id, req.user!.sub, input);
    res.json({ data: position });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /positions/:id — delete recruitment post (owner only)
// ---------------------------------------------------------------------------
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await positionsService.deletePosition(req.params.id, req.user!.sub);
    res.json({ data: { message: 'Position deleted successfully' } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /positions/:id/apply — apply to a recruitment post
// ---------------------------------------------------------------------------
router.post('/:id/apply', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = ApplyPositionSchema.parse(req.body);
    const application = await positionsService.applyToPosition(req.params.id, req.user!.sub, input);
    res.status(201).json({ data: application });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /positions/:id/applications — view applicants (owner only)
// ---------------------------------------------------------------------------
router.get('/:id/applications', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applications = await positionsService.listPositionApplications(req.params.id, req.user!.sub);
    res.json({ data: applications });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /positions/applications/:applicationId/review — review applicant (owner only)
// ---------------------------------------------------------------------------
router.patch(
  '/applications/:applicationId/review',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = ReviewApplicationSchema.parse(req.body);
      const updated = await positionsService.reviewApplication(
        req.params.applicationId,
        req.user!.sub,
        input
      );
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /positions/applications/:applicationId/withdraw — withdraw application (applicant only)
// ---------------------------------------------------------------------------
router.post(
  '/applications/:applicationId/withdraw',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await positionsService.withdrawApplication(
        req.params.applicationId,
        req.user!.sub
      );
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
