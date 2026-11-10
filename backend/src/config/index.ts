import dotenv from 'dotenv';
import path from 'path';

// Load .env from multiple potential locations (project root, backend folder, current working directory)
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath });
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Required environment variable ${key} is not set. Check .env.example`);
  }
  return val;
}

function optionalEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] ?? defaultValue;
}

function optionalBool(key: string, defaultValue: boolean = false): boolean {
  const val = process.env[key];
  if (val === undefined) return defaultValue;
  return val.toLowerCase() === 'true' || val === '1';
}

function optionalInt(key: string, defaultValue: number): number {
  const val = process.env[key];
  if (!val) return defaultValue;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

const config = {
  env: optionalEnv('API_ENV', 'development'),
  isDevelopment: optionalEnv('API_ENV', 'development') === 'development',
  isProduction: optionalEnv('API_ENV', 'development') === 'production',

  server: {
    port: optionalInt('API_PORT', 8080),
    corsAllowedOrigins: optionalEnv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173').split(',').map(s => s.trim()),
    frontendUrl: optionalEnv('FRONTEND_URL', 'http://localhost:5173'),
  },

  db: {
    host: optionalEnv('DB_HOST', 'localhost'),
    port: optionalInt('DB_PORT', 5432),
    name: optionalEnv('DB_NAME', 'collabsphere'),
    user: optionalEnv('DB_USER', 'postgres'),
    password: optionalEnv('DB_PASSWORD', ''),
    sslMode: optionalEnv('DB_SSLMODE', 'disable'),
    // Prefer full DATABASE_URL if provided
    url: optionalEnv('DATABASE_URL', ''),
  },

  jwt: {
    secret: optionalEnv('JWT_SECRET', 'dev-secret-change-in-production-please'),
    accessExpiryMinutes: optionalInt('JWT_ACCESS_EXPIRY_MINUTES', 15),
    refreshExpiryDays: optionalInt('JWT_REFRESH_EXPIRY_DAYS', 7),
  },

  email: {
    enabled: optionalBool('EMAIL_ENABLED', false),
    host: optionalEnv('SMTP_HOST', ''),
    port: optionalInt('SMTP_PORT', 587),
    user: optionalEnv('SMTP_USER', ''),
    password: optionalEnv('SMTP_PASSWORD', ''),
    from: optionalEnv('SMTP_FROM', 'noreply@collabsphere.dev'),
  },

  ai: {
    serviceUrl: optionalEnv('AI_SERVICE_URL', 'http://localhost:8000'),
    serviceEnabled: optionalBool('AI_SERVICE_ENABLED', false),
    llmProvider: optionalEnv('LLM_PROVIDER', 'none') as 'openai' | 'gemini' | 'none',
    openaiApiKey: optionalEnv('OPENAI_API_KEY', ''),
    geminiApiKey: optionalEnv('GEMINI_API_KEY', ''),
  },

  uploads: {
    dir: path.resolve(__dirname, '../../', optionalEnv('UPLOAD_DIR', './uploads')),
    maxSizeMb: optionalInt('MAX_UPLOAD_SIZE_MB', 10),
    allowedMimeTypes: optionalEnv(
      'ALLOWED_MIME_TYPES',
      'image/jpeg,image/png,image/webp,application/pdf'
    ).split(','),
  },

  redis: {
    url: optionalEnv('REDIS_URL', 'redis://localhost:6379'),
  },

  github: {
    clientId: optionalEnv('GITHUB_CLIENT_ID', ''),
    clientSecret: optionalEnv('GITHUB_CLIENT_SECRET', ''),
    redirectUrl: optionalEnv('GITHUB_REDIRECT_URL', 'http://localhost:8080/api/v1/auth/github/callback'),
  },

  admin: {
    emails: optionalEnv('ADMIN_EMAILS', '').split(',').map(s => s.trim()).filter(Boolean),
  },

  rateLimit: {
    requestsPerMinute: optionalInt('RATE_LIMIT_REQUESTS_PER_MINUTE', 60),
    authPerMinute: optionalInt('RATE_LIMIT_AUTH_PER_MINUTE', 10),
  },
};

export default config;
export type Config = typeof config;
