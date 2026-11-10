import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import * as authService from './auth.service';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
} from './auth.schema';
import config from '../../config';

const router = Router();

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimit.authPerMinute,
  message: { error: 'Too many attempts. Please try again later.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------
router.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = RegisterSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json({
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        message: 'Registration successful. Please check your email to verify your account.',
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------
router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = LoginSchema.parse(req.body);
    const result = await authService.login(input, {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
    });
    res.json({
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /auth/refresh
// ---------------------------------------------------------------------------
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = RefreshTokenSchema.parse(req.body);
    const result = await authService.refreshAccessToken(input.refreshToken);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------
router.post('/logout', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as { refreshToken?: string };
    if (body.refreshToken) {
      await authService.logout(body.refreshToken);
    }
    res.json({ data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /auth/logout-all
// ---------------------------------------------------------------------------
router.post('/logout-all', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.logoutAll(req.user!.sub);
    res.json({ data: { message: 'All sessions terminated' } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /auth/verify-email
// ---------------------------------------------------------------------------
router.post('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = VerifyEmailSchema.parse(req.body);
    await authService.verifyEmail(input.token);
    res.json({ data: { message: 'Email verified successfully' } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /auth/resend-verification
// ---------------------------------------------------------------------------
router.post('/resend-verification', requireAuth, authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.resendVerification(req.user!.sub);
    res.json({ data: { message: 'Verification email sent' } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /auth/forgot-password
// ---------------------------------------------------------------------------
router.post('/forgot-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = ForgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(input.email);
    // Always succeed to prevent email enumeration
    res.json({ data: { message: 'If that email exists, a reset link has been sent.' } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /auth/reset-password
// ---------------------------------------------------------------------------
router.post('/reset-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = ResetPasswordSchema.parse(req.body);
    await authService.resetPassword(input);
    res.json({ data: { message: 'Password reset successfully. Please log in.' } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /auth/me — get current authenticated user
// ---------------------------------------------------------------------------
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sub, email, role } = req.user!;
    res.json({
      data: {
        id: sub,
        email,
        role,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
