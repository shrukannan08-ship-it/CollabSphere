-- Active: 1793645677694@@127.0.0.1@5432@collabsphere
-- Drop 001_core_schema.up.sql
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS skill_endorsements CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS connections CASCADE;
DROP TABLE IF EXISTS user_skills CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS student_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP FUNCTION IF EXISTS update_student_profile_search_vector() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS verification_status;
DROP TYPE IF EXISTS connection_status;
DROP TYPE IF EXISTS team_role;
DROP TYPE IF EXISTS project_status;
DROP TYPE IF EXISTS task_status;
DROP TYPE IF EXISTS task_priority;
DROP TYPE IF EXISTS application_status;
DROP TYPE IF EXISTS collab_request_status;
DROP TYPE IF EXISTS notification_type;
DROP TYPE IF EXISTS message_type;
DROP TYPE IF EXISTS opportunity_type;
DROP TYPE IF EXISTS skill_level;
DROP TYPE IF EXISTS report_status;
DROP TYPE IF EXISTS report_target_type;

DROP EXTENSION IF EXISTS "citext";
DROP EXTENSION IF EXISTS "pg_trgm";
DROP EXTENSION IF EXISTS "uuid-ossp";
