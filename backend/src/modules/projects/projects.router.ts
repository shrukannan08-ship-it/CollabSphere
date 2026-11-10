import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import * as projectsService from './projects.service';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  SearchProjectsSchema,
  CreateJoinRequestSchema,
  ReviewJoinRequestSchema,
} from './projects.schema';

const router = Router();

// ---------------------------------------------------------------------------
// GET /projects — search & list projects
// ---------------------------------------------------------------------------
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = SearchProjectsSchema.parse(req.query);
    const viewerId = req.user?.sub;
    const result = await projectsService.searchProjects(input, viewerId);
    res.json({
      data: result.projects,
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
// GET /projects/user/me — get projects created by logged-in user
// ---------------------------------------------------------------------------
router.get('/user/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await projectsService.searchProjects({ page: 1, limit: 50, my: true }, req.user!.sub);
    res.json({
      data: result.projects,
      meta: {
        total: result.total,
        page: 1,
        limit: 50,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /projects/user/my-requests — get join requests submitted by logged-in user
// ---------------------------------------------------------------------------
router.get('/user/my-requests', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = await projectsService.getMySentJoinRequests(req.user!.sub);
    res.json({ data: requests });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /projects — create project
// ---------------------------------------------------------------------------
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateProjectSchema.parse(req.body);
    const project = await projectsService.createProject(req.user!.sub, input);
    res.status(201).json({ data: project });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /projects/:id — get project details
// ---------------------------------------------------------------------------
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const viewerId = req.user?.sub;
    const project = await projectsService.getProjectById(req.params.id, viewerId);
    res.json({ data: project });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /projects/:id — update project (owner only)
// ---------------------------------------------------------------------------
router.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = UpdateProjectSchema.parse(req.body);
    const updated = await projectsService.updateProject(req.params.id, req.user!.sub, input);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /projects/:id/recruitment — update recruitment status (owner only)
// ---------------------------------------------------------------------------
router.patch('/:id/recruitment', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (status !== 'open' && status !== 'closed') {
      return res.status(400).json({ error: "Recruitment status must be 'open' or 'closed'" });
    }
    const updated = await projectsService.updateProject(req.params.id, req.user!.sub, {
      recruitmentStatus: status,
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /projects/:id — delete project (owner only)
// ---------------------------------------------------------------------------
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await projectsService.deleteProject(req.params.id, req.user!.sub);
    res.json({ data: { message: 'Project deleted successfully' } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /projects/:id/requests — submit join request to project
// ---------------------------------------------------------------------------
router.post('/:id/requests', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateJoinRequestSchema.parse(req.body);
    const joinRequest = await projectsService.createJoinRequest(req.params.id, req.user!.sub, input);
    res.status(201).json({ data: joinRequest });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /projects/:id/requests — list join requests for project (owner only)
// ---------------------------------------------------------------------------
router.get('/:id/requests', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const requests = await projectsService.getProjectJoinRequests(req.params.id, req.user!.sub, status);
    res.json({ data: requests });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /projects/:id/my-request — check current user's join request for project
// ---------------------------------------------------------------------------
router.get('/:id/my-request', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await projectsService.getMyJoinRequestForProject(req.params.id, req.user!.sub);
    res.json({ data: request });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /projects/:id/requests/:requestId — review join request (owner only)
// ---------------------------------------------------------------------------
router.patch('/:id/requests/:requestId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = ReviewJoinRequestSchema.parse(req.body);
    const updated = await projectsService.reviewJoinRequest(
      req.params.id,
      req.params.requestId,
      req.user!.sub,
      input
    );
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
