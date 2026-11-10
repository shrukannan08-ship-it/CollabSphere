import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { validationResult } from 'express-validator';
import config from '../config';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Central error handling middleware.
 * Must be registered LAST in express app.
 */
export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // PostgreSQL errors
  if ((err as { code?: string }).code === '23505') {
    res.status(409).json({ error: 'Resource already exists', code: 'DUPLICATE_RESOURCE' });
    return;
  }
  if ((err as { code?: string }).code === '23503') {
    res.status(400).json({ error: 'Referenced resource not found', code: 'REFERENCE_NOT_FOUND' });
    return;
  }

  const statusCode = err.statusCode ?? 500;
  const message = statusCode < 500 ? err.message : 'An unexpected error occurred';

  if (statusCode >= 500) {
    console.error('[ERROR]', {
      method: req.method,
      url: req.url,
      error: err.message,
      stack: config.isDevelopment ? err.stack : undefined,
    });
  }

  res.status(statusCode).json({
    error: message,
    code: err.code ?? 'INTERNAL_ERROR',
    ...(config.isDevelopment && statusCode >= 500 ? { stack: err.stack } : {}),
  });
}

/**
 * Create a typed API error with status code and code string.
 */
export function createError(message: string, statusCode: number, code?: string): ApiError {
  const err = new Error(message) as ApiError;
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

/**
 * Middleware: validate express-validator results and return 400 if errors.
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array().map((e) => ({
        field: 'path' in e ? e.path : e.type,
        message: e.msg,
      })),
    });
    return;
  }
  next();
}

/**
 * 404 handler — register after all routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
  });
}
