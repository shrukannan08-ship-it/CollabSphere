import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import http from 'http';
import config from './config';
import { getPool, healthCheck } from './lib/db';
import { errorHandler, notFoundHandler } from './middleware/errors';

// Routers
import authRouter from './modules/auth/auth.router';
import usersRouter from './modules/users/users.router';
import projectsRouter from './modules/projects/projects.router';
import positionsRouter from './modules/teams/positions.router';
import discussionsRouter from './modules/projects/discussions.router';
import notificationsRouter from './modules/notifications/notifications.router';

// WebSocket (Phase 3 — stub for now)
// import { setupWebSocket } from './websocket/ws-server';

const app = express();
const server = http.createServer(app);

// =============================================================================
// Security middleware
// =============================================================================
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: config.server.corsAllowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Global rate limiter
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: config.rateLimit.requestsPerMinute,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health', // skip health checks
}));

// =============================================================================
// Body parsing
// =============================================================================
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// =============================================================================
// Static file serving (uploads)
// =============================================================================
app.use('/uploads', express.static(config.uploads.dir, {
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'private, max-age=3600');
  },
}));

// =============================================================================
// Health check (no auth required)
// =============================================================================
// Health check handler
const handleHealthCheck = async (_req: express.Request, res: express.Response) => {
  const dbOk = await healthCheck();
  const status = dbOk ? 200 : 503;
  res.status(status).json({
    status: dbOk ? 'ok' : 'degraded',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'ok' : 'unavailable',
    },
  });
};

app.get('/health', handleHealthCheck);

// =============================================================================
// API Routes
// =============================================================================
const apiV1 = express.Router();

apiV1.get('/health', handleHealthCheck);

apiV1.use('/auth', authRouter);
apiV1.use('/users', usersRouter);
apiV1.use('/projects', projectsRouter);
apiV1.use('/positions', positionsRouter);
apiV1.use('/discussions', discussionsRouter);
apiV1.use('/notifications', notificationsRouter);

// More routers will be added in subsequent phases:
// apiV1.use('/teams', teamsRouter);
// apiV1.use('/projects', projectsRouter);
// apiV1.use('/feed', feedRouter);
// apiV1.use('/messaging', messagingRouter);
// apiV1.use('/notifications', notificationsRouter);
// apiV1.use('/opportunities', opportunitiesRouter);
// apiV1.use('/admin', adminRouter);

app.use('/api/v1', apiV1);

// =============================================================================
// 404 and error handling (MUST be last)
// =============================================================================
app.use(notFoundHandler);
app.use(errorHandler);

// =============================================================================
// Startup
// =============================================================================
async function start(): Promise<void> {
  // Verify database connectivity on startup
  const pool = getPool();
  const dbOk = await healthCheck();
  if (!dbOk) {
    console.error('[startup] Cannot connect to database. Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in .env');
    console.error('[startup] For local development, ensure PostgreSQL is running (see docker-compose.yml or README)');
    process.exit(1);
  }
  console.log('[startup] Database connection OK');

  server.listen(config.server.port, () => {
    console.log(`[startup] CollabSphere API running on http://localhost:${config.server.port}`);
    console.log(`[startup] Environment: ${config.env}`);
    console.log(`[startup] API base: http://localhost:${config.server.port}/api/v1`);
    console.log(`[startup] Health check: http://localhost:${config.server.port}/health`);
    if (!config.email.enabled) {
      console.log('[startup] Email: dev mode — emails will be logged to console');
    }
    if (config.isDevelopment) {
      console.log('[startup] JWT secret: using dev default (change JWT_SECRET in production!)');
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[shutdown] SIGTERM received');
    server.close(async () => {
      const { closePool } = await import('./lib/db');
      await closePool();
      process.exit(0);
    });
  });
}

start().catch((err) => {
  console.error('[startup] Fatal error:', err);
  process.exit(1);
});

export { app, server };
