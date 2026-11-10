import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../lib/jwt';
import { queryOne } from '../lib/db';

// Extend Express Request with authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { isActive: boolean };
    }
  }
}

export function extractToken(req: Request): string | null {
  // Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // Also support cookie-based token
  if (req.cookies?.access_token) {
    return req.cookies.access_token as string;
  }
  return null;
}

/**
 * Middleware: require a valid JWT. Sets req.user on success.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { ...payload, isActive: true };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token', code: 'TOKEN_INVALID' });
  }
}

/**
 * Middleware: require admin role.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required', code: 'FORBIDDEN' });
      return;
    }
    next();
  });
}

/**
 * Middleware: require admin or moderator role.
 */
export function requireModerator(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'moderator') {
      res.status(403).json({ error: 'Moderator access required', code: 'FORBIDDEN' });
      return;
    }
    next();
  });
}

/**
 * Middleware: optionally authenticate — sets req.user if token present but doesn't reject.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { ...payload, isActive: true };
  } catch {
    // Silently continue without user
  }
  next();
}

/**
 * Middleware: verify the authenticated user account is still active.
 * Use after requireAuth for critical endpoints.
 */
export async function requireActiveAccount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
    return;
  }

  try {
    const user = await queryOne<{ is_active: boolean }>(
      'SELECT is_active FROM users WHERE id = $1',
      [req.user.sub]
    );

    if (!user || !user.is_active) {
      res.status(403).json({ error: 'Account is suspended or deleted', code: 'ACCOUNT_INACTIVE' });
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}
