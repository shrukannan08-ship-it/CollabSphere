# CollabSphere — Student Collaboration Platform

CollabSphere is a full-stack student networking and collaboration platform built with **SvelteKit, TypeScript, Node.js/Express, and PostgreSQL**. Students can build skill-based portfolios, launch and showcase projects, post and apply for team roles, collaborate in project discussion forums, and discover peers.

---

## Architecture Overview

- **Frontend**: SvelteKit 2, TypeScript, Tailwind CSS, Vite
- **Backend API**: Node.js, Express, TypeScript (REST API on port `8080`)
- **Database**: PostgreSQL 14+ (Schema migrations with connection pooling)
- **Authentication**: JWT access tokens (15-min) + cryptographic refresh token rotation (7-day, SHA-256 hashed in DB), bcrypt (12 rounds)

---

## 1. Local Development Setup

### Prerequisites
- **Node.js**: v20+ (v24 supported) and **npm** v10+
- **PostgreSQL**: v14+ running locally on port `5432`

### Step 1: Clone & Configure Environment Variables
Copy `.env.example` into `.env` at the project root and in `frontend/`:
```bash
# In project root:
cp .env.example .env

# In frontend directory:
cp frontend/.env.example frontend/.env
```

Ensure `.env` contains your PostgreSQL credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=collabsphere
DB_USER=collabsphere
DB_PASSWORD=your_local_password
DATABASE_URL=postgres://collabsphere:your_local_password@localhost:5432/collabsphere?sslmode=disable
API_PORT=8080
API_ENV=development
JWT_SECRET=dev-secret-change-in-production-please
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
FRONTEND_URL=http://localhost:5173
```

### Step 2: Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

### Step 3: Run Database Migrations
Run the migration script to apply all schema tables, constraints, indices, and triggers:
```bash
npm --prefix backend run migrate:up
```

### Step 4: Start Development Servers
In two separate terminal windows:

**Terminal 1 (Backend API — http://localhost:8080):**
```bash
npm --prefix backend run dev
```

**Terminal 2 (Frontend Client — http://localhost:5173):**
```bash
npm --prefix frontend run dev
```
Open your browser at `http://localhost:5173`.

---

## 2. Environment Variable Configuration

### Backend Environment Variables (`.env` or Cloud App Config)
| Variable | Description | Example (Production) |
|---|---|---|
| `API_ENV` | Environment mode (`development` or `production`) | `production` |
| `API_PORT` | HTTP server port | `8080` |
| `DATABASE_URL` | Full PostgreSQL connection string | `postgres://user:pass@ep-xyz.region.neon.tech/collabsphere?sslmode=require` |
| `DB_SSLMODE` | SSL requirement (`disable`, `require`) | `require` |
| `JWT_SECRET` | 32-byte secret for signing access tokens | Generate with `openssl rand -hex 32` |
| `JWT_ACCESS_EXPIRY_MINUTES` | Token lifetime (minutes) | `15` |
| `JWT_REFRESH_EXPIRY_DAYS` | Refresh token duration (days) | `7` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed frontend origins | `https://collabsphere.yourdomain.com` |
| `FRONTEND_URL` | Frontend URL for email verification & reset links | `https://collabsphere.yourdomain.com` |
| `EMAIL_ENABLED` | Set `true` to enable SMTP delivery | `true` |
| `SMTP_HOST` | SMTP server host | `smtp.sendgrid.net` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | `apikey` |
| `SMTP_PASSWORD` | SMTP password / API key | `<your-smtp-key>` |
| `SMTP_FROM` | Sender email address | `noreply@yourdomain.com` |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | General rate limit per IP | `60` |

### Frontend Environment Variables (`frontend/.env` or Vercel/Netlify)
| Variable | Description | Example (Production) |
|---|---|---|
| `PUBLIC_API_BASE_URL` | Base endpoint of backend API (must include `/api/v1`) | `https://api.yourdomain.com/api/v1` |
| `PUBLIC_WS_URL` | WebSocket endpoint (Phase 3+) | `wss://api.yourdomain.com/ws` |

---

## 3. Database Setup & Migrations

All schema definitions reside in [`migrations/sql/`](file:///c:/student%20collab/migrations/sql):
- `001_core_schema.up.sql`: Users, student profiles, skills, sessions, audit logs.
- `002_teams_projects.up.sql`: Projects, project members, project skills, open positions.
- `003_social_comms.up.sql`: Discussion threads, thread replies, notifications.
- `004_project_recruitment.up.sql`: Role recruitment links, application skills.

### Running Migrations
```bash
# Apply all pending migrations
npm --prefix backend run migrate:up

# Roll back the last migration
npm --prefix backend run migrate:down
```

### Health Check Endpoint
To verify database connectivity:
```bash
curl http://localhost:8080/health
# Or:
curl http://localhost:8080/api/v1/health
```
Response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-11-02T23:35:00.000Z",
  "services": {
    "database": "ok"
  }
}
```

---

## 4. Production Build & Test Commands

Run automated checks and build artifacts before deploying:

```bash
# 1. Backend static typing & build
npm --prefix backend run typecheck
npm --prefix backend run build
# Compiles TypeScript to backend/dist/

# 2. Backend unit tests
npm --prefix backend test

# 3. Frontend production build
npm --prefix frontend run build
# Compiles optimized client & SSR bundles to frontend/.svelte-kit/output/

# 4. Frontend unit tests
npm --prefix frontend test
```

---

## 5. Deployment Instructions

### Recommended Hosting Architecture
- **Managed PostgreSQL**: AWS RDS PostgreSQL, Neon (`neon.tech`), or Supabase.
- **Backend API**: Render, Railway, AWS App Runner, Fly.io, or VPS with Node.js 20+.
- **Frontend Client**: Vercel, Netlify, Cloudflare Pages, or Render Static/Node.

---

### Deploying the Backend API (e.g. Render / Railway / Ubuntu VPS)

1. **Environment Setup**:
   - Provision a PostgreSQL database instance.
   - Configure the environment variables in your hosting dashboard (`DATABASE_URL`, `API_ENV=production`, `API_PORT=8080`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`).
2. **Build & Start Commands**:
   - **Build Command**: `npm install && npm run build`
   - **Pre-deploy / Release Command**: `npm run migrate:up`
   - **Start Command**: `node dist/index.js`
3. **Health Check Path**: `/health` (or `/api/v1/health`)
4. **SSL / HTTPS**:
   - Managed cloud platforms (Render, Railway, Fly.io) handle TLS certificates automatically.
   - For custom VPS (Nginx / Caddy), configure reverse proxy with Let's Encrypt certificates.

---

### Deploying the Frontend (e.g. Vercel / Netlify / Node Server)

1. **Environment Variables**:
   - Set `PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1` in your build environment.
2. **Build Settings**:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output**: SvelteKit auto-detects Vercel/Netlify via `@sveltejs/adapter-auto`.
   - For standalone Node hosting, install `@sveltejs/adapter-node` in `frontend/` and configure in `vite.config.ts`.

---

## 6. Security & Hardening Checklist for Production

- [ ] **Generate Strong JWT Secret**: Run `openssl rand -hex 32` and paste into `JWT_SECRET`. Do not use default dev secrets.
- [ ] **Restrict CORS**: Set `CORS_ALLOWED_ORIGINS` strictly to your production frontend domain (e.g. `https://collabsphere.example.com`).
- [ ] **Database SSL**: Set `DB_SSLMODE=require` when connecting to cloud-hosted databases.
- [ ] **Email Delivery**: Set `EMAIL_ENABLED=true` with your production SMTP provider (SendGrid, Postmark, AWS SES).
- [ ] **Rate Limiting**: CollabSphere includes `express-rate-limit` (60 req/min general, 10 req/min for auth). If running behind a reverse proxy/load balancer, ensure `trust proxy` is enabled (configured in `index.ts`).

---

## 7. Troubleshooting

| Symptom | Cause | Solution |
|---|---|---|
| `Cannot connect to database` / exit 1 on backend startup | PostgreSQL is not running or invalid credentials | Verify `DATABASE_URL` or `DB_HOST`/`DB_PORT`/`DB_PASSWORD` in `.env`. Ensure Postgres is listening on port 5432. |
| CORS error in browser console (`Access-Control-Allow-Origin`) | Frontend origin is not whitelisted | Add your frontend origin (e.g. `http://localhost:5173` or `https://yourdomain.com`) to `CORS_ALLOWED_ORIGINS` in backend `.env`. |
| `API request failed: 401 Unauthorized` | Expired or missing JWT token | Log in again. Access tokens refresh automatically via `/auth/refresh` using the stored refresh token. |
| Email verification tokens not arriving | `EMAIL_ENABLED` is false | In development, verification and password reset links are printed directly to the backend terminal console. |
| `vite: __dirname is not supported` | Deprecated Vite config | Fixed in `frontend/vite.config.ts` using `import.meta.dirname`. |
| Port conflict on 8080 | Another service is using port 8080 | Change `API_PORT=8081` in backend `.env` and update `PUBLIC_API_BASE_URL` in frontend. |

---

## License

CollabSphere is an open educational student collaboration platform. Distributed under the MIT License.
