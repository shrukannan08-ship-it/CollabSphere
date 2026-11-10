-- =============================================================================
-- Migration 004: Project Recruitment & Direct Collaboration Applications
-- =============================================================================

-- 1. Allow open_positions to be linked directly to projects (not just teams)
ALTER TABLE open_positions
  ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE open_positions
  ALTER COLUMN team_id DROP NOT NULL;

-- Ensure an open position is linked to either a project or a team
ALTER TABLE open_positions
  ADD CONSTRAINT chk_position_target CHECK (project_id IS NOT NULL OR team_id IS NOT NULL);

CREATE INDEX idx_open_positions_project ON open_positions (project_id);

-- 2. Add relevant_skills to position_applications for applicant skill showcase
ALTER TABLE position_applications
  ADD COLUMN relevant_skills TEXT[];
