-- =============================================================================
-- Migration 002: Teams, Projects, Tasks, Milestones
-- =============================================================================

-- =============================================================================
-- TEAMS
-- =============================================================================

CREATE TABLE teams (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          CITEXT UNIQUE NOT NULL,
  description   TEXT,
  avatar_url    TEXT,
  
  -- Metadata
  domain        TEXT,   -- e.g. "Web Dev", "ML/AI", "Mobile", "Research"
  tags          TEXT[],
  max_members   INT DEFAULT 10,
  is_recruiting BOOLEAN NOT NULL DEFAULT FALSE,
  is_public     BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- GitHub link (Phase 1: URL only)
  github_org_url TEXT,
  
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  search_vector TSVECTOR
);

CREATE INDEX idx_teams_slug ON teams (slug);
CREATE INDEX idx_teams_created_by ON teams (created_by);
CREATE INDEX idx_teams_search ON teams USING GIN (search_vector);
CREATE INDEX idx_teams_name_trgm ON teams USING GIN (name gin_trgm_ops);
CREATE INDEX idx_teams_tags ON teams USING GIN (tags);

CREATE OR REPLACE FUNCTION update_team_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.domain, '')), 'C');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trig_team_search_vector
  BEFORE INSERT OR UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_team_search_vector();

CREATE TRIGGER trig_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TEAM MEMBERS
-- =============================================================================

CREATE TABLE team_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        team_role NOT NULL DEFAULT 'member',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (team_id, user_id)
);

CREATE INDEX idx_team_members_team ON team_members (team_id);
CREATE INDEX idx_team_members_user ON team_members (user_id);
CREATE INDEX idx_team_members_role ON team_members (role);

-- =============================================================================
-- OPEN POSITIONS
-- =============================================================================

CREATE TABLE open_positions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  responsibilities TEXT,
  required_skills TEXT[],
  nice_to_have    TEXT[],
  slots           INT NOT NULL DEFAULT 1 CHECK (slots >= 1),
  filled_slots    INT NOT NULL DEFAULT 0,
  is_open         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CHECK (filled_slots <= slots)
);

CREATE INDEX idx_open_positions_team ON open_positions (team_id);
CREATE INDEX idx_open_positions_is_open ON open_positions (is_open);

CREATE TRIGGER trig_open_positions_updated_at
  BEFORE UPDATE ON open_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- POSITION APPLICATIONS
-- =============================================================================

CREATE TABLE position_applications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id   UUID NOT NULL REFERENCES open_positions(id) ON DELETE CASCADE,
  applicant_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        application_status NOT NULL DEFAULT 'pending',
  cover_note    TEXT,
  reviewer_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  reviewer_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (position_id, applicant_id)
);

CREATE INDEX idx_applications_position ON position_applications (position_id);
CREATE INDEX idx_applications_applicant ON position_applications (applicant_id);
CREATE INDEX idx_applications_status ON position_applications (status);

CREATE TRIGGER trig_applications_updated_at
  BEFORE UPDATE ON position_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COLLABORATION REQUESTS
-- =============================================================================

CREATE TABLE collaboration_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Who is requesting
  requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  -- Target can be a user or a team
  target_user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  target_team_id   UUID REFERENCES teams(id) ON DELETE CASCADE,
  -- Context
  project_id       UUID,  -- FK added in migration 003 (projects table)
  message          TEXT,
  status           collab_request_status NOT NULL DEFAULT 'pending',
  response_message TEXT,
  responded_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- At least one target must be specified
  CHECK (target_user_id IS NOT NULL OR target_team_id IS NOT NULL),
  -- Cannot request yourself
  CHECK (requester_user_id <> target_user_id OR target_user_id IS NULL)
);

CREATE INDEX idx_collab_requests_requester_user ON collaboration_requests (requester_user_id);
CREATE INDEX idx_collab_requests_requester_team ON collaboration_requests (requester_team_id);
CREATE INDEX idx_collab_requests_target_user ON collaboration_requests (target_user_id);
CREATE INDEX idx_collab_requests_target_team ON collaboration_requests (target_team_id);
CREATE INDEX idx_collab_requests_status ON collaboration_requests (status);

CREATE TRIGGER trig_collab_requests_updated_at
  BEFORE UPDATE ON collaboration_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PROJECTS
-- =============================================================================

CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id         UUID REFERENCES teams(id) ON DELETE RESTRICT,
  
  name            TEXT NOT NULL,
  slug            CITEXT UNIQUE NOT NULL,
  tagline         TEXT,
  description     TEXT NOT NULL,
  status          project_status NOT NULL DEFAULT 'planning',
  
  -- Classification
  domain          TEXT,   -- e.g. "Healthcare", "EdTech", "FinTech"
  tags            TEXT[],
  
  -- Links (Phase 1: URL only — no GitHub OAuth yet)
  github_url      TEXT,
  demo_url        TEXT,
  documentation_url TEXT,
  
  -- Visibility
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Dates
  start_date      DATE,
  end_date        DATE,
  
  -- Showcase
  thumbnail_url   TEXT,
  
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  search_vector   TSVECTOR
);

CREATE INDEX idx_projects_team ON projects (team_id);
CREATE INDEX idx_projects_status ON projects (status);
CREATE INDEX idx_projects_domain ON projects (domain);
CREATE INDEX idx_projects_created_by ON projects (created_by);
CREATE INDEX idx_projects_search ON projects USING GIN (search_vector);
CREATE INDEX idx_projects_tags ON projects USING GIN (tags);
CREATE INDEX idx_projects_name_trgm ON projects USING GIN (name gin_trgm_ops);

CREATE OR REPLACE FUNCTION update_project_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.tagline, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.domain, '')), 'C');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trig_project_search_vector
  BEFORE INSERT OR UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_project_search_vector();

CREATE TRIGGER trig_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add FK from collaboration_requests to projects
ALTER TABLE collaboration_requests
  ADD CONSTRAINT fk_collab_requests_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- =============================================================================
-- PROJECT SKILLS (required skills for a project)
-- =============================================================================

CREATE TABLE project_skills (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  skill_id    UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  
  UNIQUE (project_id, skill_id)
);

CREATE INDEX idx_project_skills_project ON project_skills (project_id);
CREATE INDEX idx_project_skills_skill ON project_skills (skill_id);

-- =============================================================================
-- PROJECT MEMBERS / CONTRIBUTORS
-- =============================================================================

CREATE TABLE project_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Role in this project (can differ from team role)
  role            TEXT,   -- e.g. "Frontend Lead", "ML Engineer", "Designer"
  contribution    TEXT,   -- brief description of their contribution
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at         TIMESTAMPTZ,
  
  UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members (project_id);
CREATE INDEX idx_project_members_user ON project_members (user_id);

-- =============================================================================
-- MILESTONES
-- =============================================================================

CREATE TABLE milestones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    DATE,
  completed_at TIMESTAMPTZ,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestones_project ON milestones (project_id);
CREATE INDEX idx_milestones_due_date ON milestones (due_date);

CREATE TRIGGER trig_milestones_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TASKS
-- =============================================================================

CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  
  title       TEXT NOT NULL,
  description TEXT,
  status      task_status NOT NULL DEFAULT 'todo',
  priority    task_priority NOT NULL DEFAULT 'medium',
  
  due_date    TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_project ON tasks (project_id);
CREATE INDEX idx_tasks_milestone ON tasks (milestone_id);
CREATE INDEX idx_tasks_status ON tasks (status);
CREATE INDEX idx_tasks_due_date ON tasks (due_date);
CREATE INDEX idx_tasks_parent ON tasks (parent_task_id);

CREATE TRIGGER trig_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TASK ASSIGNMENTS
-- =============================================================================

CREATE TABLE task_assignments (
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX idx_task_assignments_task ON task_assignments (task_id);
CREATE INDEX idx_task_assignments_user ON task_assignments (user_id);

-- =============================================================================
-- PROJECT ACTIVITY LOG
-- =============================================================================

CREATE TABLE project_activity (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,  -- e.g. 'task_completed', 'member_joined', 'milestone_reached'
  target_type TEXT,
  target_id   UUID,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_activity_project ON project_activity (project_id);
CREATE INDEX idx_project_activity_user ON project_activity (user_id);
CREATE INDEX idx_project_activity_created ON project_activity (created_at);

-- =============================================================================
-- PROJECT BOOKMARKS
-- =============================================================================

CREATE TABLE project_bookmarks (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (user_id, project_id)
);

CREATE INDEX idx_project_bookmarks_user ON project_bookmarks (user_id);
