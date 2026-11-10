-- Migration 004 down
ALTER TABLE position_applications
  DROP COLUMN IF EXISTS relevant_skills;

ALTER TABLE open_positions
  DROP CONSTRAINT IF EXISTS chk_position_target;

ALTER TABLE open_positions
  DROP COLUMN IF EXISTS project_id;

ALTER TABLE open_positions
  ALTER COLUMN team_id SET NOT NULL;
