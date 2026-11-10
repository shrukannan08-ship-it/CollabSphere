-- =============================================================================
-- Migration 001: Core schema — users, profiles, skills
-- CollabSphere Student Collaboration Platform
-- =============================================================================

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "citext";

-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('student', 'admin', 'moderator'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE team_role AS ENUM ('leader', 'member'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE project_status AS ENUM ('planning', 'active', 'completed', 'archived', 'on_hold'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE application_status AS ENUM ('pending', 'under_review', 'accepted', 'rejected', 'withdrawn'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE collab_request_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification_type AS ENUM (
  'connection_request', 'connection_accepted',
  'team_invite', 'team_application', 'team_application_accepted', 'team_application_rejected',
  'project_update', 'task_assigned', 'task_due_soon', 'task_overdue',
  'message_received', 'mention',
  'collaboration_request', 'collaboration_accepted',
  'post_reaction', 'post_comment', 'comment_reply',
  'opportunity_deadline', 'system'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE message_type AS ENUM ('text', 'file', 'image', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE opportunity_type AS ENUM ('hackathon', 'internship', 'workshop', 'competition', 'research', 'conference', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE report_status AS ENUM ('open', 'under_review', 'resolved', 'dismissed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE report_target_type AS ENUM ('user', 'post', 'comment', 'project', 'team', 'message'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- USERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           CITEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'student',
  
  -- Email verification
  email_verified          BOOLEAN NOT NULL DEFAULT FALSE,
  email_verify_token      TEXT,
  email_verify_expires_at TIMESTAMPTZ,
  
  -- Password reset
  password_reset_token      TEXT,
  password_reset_expires_at TIMESTAMPTZ,
  
  -- Student verification (separate from auth)
  verification_status    verification_status NOT NULL DEFAULT 'unverified',
  verification_notes     TEXT,
  verified_at            TIMESTAMPTZ,
  
  -- Account state
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ,
  
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users (verification_status);
CREATE INDEX IF NOT EXISTS idx_users_email_verify_token ON users (email_verify_token) WHERE email_verify_token IS NOT NULL;

-- =============================================================================
-- STUDENT PROFILES
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Identity
  full_name     TEXT NOT NULL,
  username      CITEXT UNIQUE NOT NULL,
  avatar_url    TEXT,
  bio           TEXT,
  headline      TEXT,  -- e.g. "Full-stack dev | ML enthusiast | CS @ MIT"
  
  -- Education
  institution   TEXT,
  department    TEXT,
  degree        TEXT,
  year_of_study INT CHECK (year_of_study BETWEEN 1 AND 8),
  graduation_year INT,
  
  -- Location (optional)
  city          TEXT,
  country       TEXT,
  
  -- Professional links
  github_url    TEXT,
  linkedin_url  TEXT,
  portfolio_url TEXT,
  website_url   TEXT,
  
  -- Visibility
  is_public     BOOLEAN NOT NULL DEFAULT TRUE,
  open_to_collaborate BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Search vector (maintained by trigger)
  search_vector TSVECTOR,
  
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_username ON student_profiles (username);
CREATE INDEX IF NOT EXISTS idx_student_profiles_institution ON student_profiles (institution);
CREATE INDEX IF NOT EXISTS idx_student_profiles_department ON student_profiles (department);
CREATE INDEX IF NOT EXISTS idx_student_profiles_search ON student_profiles USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_student_profiles_username_trgm ON student_profiles USING GIN (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_student_profiles_fullname_trgm ON student_profiles USING GIN (full_name gin_trgm_ops);

-- Trigger: maintain search_vector
CREATE OR REPLACE FUNCTION update_student_profile_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.username, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.headline, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.institution, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.department, '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_student_profile_search_vector ON student_profiles;
CREATE TRIGGER trig_student_profile_search_vector
  BEFORE INSERT OR UPDATE ON student_profiles
  FOR EACH ROW EXECUTE FUNCTION update_student_profile_search_vector();

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_users_updated_at ON users;
CREATE TRIGGER trig_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trig_student_profiles_updated_at ON student_profiles;
CREATE TRIGGER trig_student_profiles_updated_at
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SKILLS
-- =============================================================================

CREATE TABLE IF NOT EXISTS skills (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        CITEXT UNIQUE NOT NULL,
  slug        TEXT UNIQUE NOT NULL,  -- normalized, e.g. "machine-learning"
  category    TEXT,                  -- e.g. "Programming", "Design", "Data Science"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_name ON skills (name);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills (category);
CREATE INDEX IF NOT EXISTS idx_skills_name_trgm ON skills USING GIN (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS user_skills (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id    UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  level       skill_level NOT NULL DEFAULT 'intermediate',
  years       NUMERIC(4,1),
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills (user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id ON user_skills (skill_id);

-- =============================================================================
-- CONNECTIONS AND FOLLOWS
-- =============================================================================

CREATE TABLE IF NOT EXISTS connections (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      connection_status NOT NULL DEFAULT 'pending',
  message     TEXT,  -- optional note with request
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_connections_requester ON connections (requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_addressee ON connections (addressee_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections (status);

DROP TRIGGER IF EXISTS trig_connections_updated_at ON connections;
CREATE TRIGGER trig_connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows (following_id);

-- =============================================================================
-- SKILL ENDORSEMENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS skill_endorsements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endorser_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endorsed_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id      UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (endorser_id, endorsed_id, skill_id),
  CHECK (endorser_id <> endorsed_id)
);

CREATE INDEX IF NOT EXISTS idx_endorsements_endorsed ON skill_endorsements (endorsed_id);

-- =============================================================================
-- REFRESH TOKENS
-- =============================================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT UNIQUE NOT NULL,  -- bcrypt hash of the token
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  user_agent  TEXT,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expiry ON refresh_tokens (expires_at);

-- =============================================================================
-- AUDIT LOG (for security-sensitive actions)
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,       -- e.g. 'LOGIN', 'PROFILE_UPDATE', 'ROLE_CHANGE'
  target_type TEXT,                -- e.g. 'user', 'project'
  target_id   UUID,
  metadata    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at);
