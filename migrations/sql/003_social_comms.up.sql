-- =============================================================================
-- Migration 003: Social Feed, Messaging, Notifications, Opportunities
-- =============================================================================

-- =============================================================================
-- POSTS (Social Feed)
-- =============================================================================

CREATE TABLE posts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Optional association with a project
  project_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  content       TEXT NOT NULL,
  -- Attachments stored as JSONB array: [{url, type, name, size}]
  attachments   JSONB DEFAULT '[]'::JSONB,
  
  -- Visibility
  is_public     BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Stats (denormalized for performance — updated by triggers)
  reaction_count  INT NOT NULL DEFAULT 0,
  comment_count   INT NOT NULL DEFAULT 0,
  
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ  -- soft delete
);

CREATE INDEX idx_posts_author ON posts (author_id);
CREATE INDEX idx_posts_project ON posts (project_id);
CREATE INDEX idx_posts_created ON posts (created_at DESC);
CREATE INDEX idx_posts_public ON posts (is_public) WHERE deleted_at IS NULL;

CREATE TRIGGER trig_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- POST REACTIONS
-- =============================================================================

CREATE TABLE post_reactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Emoji reaction type: 'like', 'celebrate', 'insightful', 'support', 'curious'
  reaction    TEXT NOT NULL DEFAULT 'like',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (post_id, user_id)
);

CREATE INDEX idx_post_reactions_post ON post_reactions (post_id);
CREATE INDEX idx_post_reactions_user ON post_reactions (user_id);

-- Trigger: keep post reaction_count in sync
CREATE OR REPLACE FUNCTION update_post_reaction_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET reaction_count = reaction_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trig_post_reaction_count
  AFTER INSERT OR DELETE ON post_reactions
  FOR EACH ROW EXECUTE FUNCTION update_post_reaction_count();

-- =============================================================================
-- COMMENTS
-- =============================================================================

CREATE TABLE comments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id       UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id     UUID REFERENCES comments(id) ON DELETE CASCADE,  -- for threaded replies
  content       TEXT NOT NULL,
  reaction_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_comments_post ON comments (post_id);
CREATE INDEX idx_comments_author ON comments (author_id);
CREATE INDEX idx_comments_parent ON comments (parent_id);

CREATE TRIGGER trig_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: keep post comment_count in sync
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NULL THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NULL THEN
    UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trig_post_comment_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- =============================================================================
-- COMMENT REACTIONS
-- =============================================================================

CREATE TABLE comment_reactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id  UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction    TEXT NOT NULL DEFAULT 'like',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (comment_id, user_id)
);

CREATE INDEX idx_comment_reactions_comment ON comment_reactions (comment_id);

-- =============================================================================
-- CONVERSATIONS (Direct Messages + Group Chats)
-- =============================================================================

CREATE TABLE conversations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- For project group chats
  project_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
  name          TEXT,   -- For group chats; null for DMs
  is_group      BOOLEAN NOT NULL DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_project ON conversations (project_id);
CREATE INDEX idx_conversations_last_message ON conversations (last_message_at DESC);

-- =============================================================================
-- CONVERSATION PARTICIPANTS
-- =============================================================================

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Track unread messages
  last_read_at    TIMESTAMPTZ,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at         TIMESTAMPTZ,
  
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_conv_participants_user ON conversation_participants (user_id);

-- =============================================================================
-- MESSAGES
-- =============================================================================

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            message_type NOT NULL DEFAULT 'text',
  content         TEXT NOT NULL,
  -- For file/image messages
  attachment_url  TEXT,
  attachment_name TEXT,
  attachment_size BIGINT,
  -- Soft delete
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages (sender_id);

-- Trigger: update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trig_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          notification_type NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  -- Link to navigate to when clicking
  action_url    TEXT,
  -- Source
  actor_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  reference_type TEXT,
  reference_id  UUID,
  -- State
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE is_read = FALSE;

-- =============================================================================
-- DISCUSSION THREADS (per project)
-- =============================================================================

CREATE TABLE discussion_threads (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
  reply_count INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_threads_project ON discussion_threads (project_id);

CREATE TRIGGER trig_threads_updated_at
  BEFORE UPDATE ON discussion_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE thread_replies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id   UUID NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES thread_replies(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_thread_replies_thread ON thread_replies (thread_id);

-- =============================================================================
-- PROJECT DOCUMENTS
-- =============================================================================

CREATE TABLE project_documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    BIGINT,
  is_public     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_docs_project ON project_documents (project_id);

-- =============================================================================
-- LEARNING RESOURCES
-- =============================================================================

CREATE TABLE learning_resources (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  added_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title         TEXT NOT NULL,
  url           TEXT NOT NULL,
  description   TEXT,
  resource_type TEXT,  -- 'article', 'video', 'course', 'book', 'tool', 'repo'
  tags          TEXT[],
  skill_ids     UUID[],
  upvote_count  INT NOT NULL DEFAULT 0,
  is_approved   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resources_tags ON learning_resources USING GIN (tags);

-- =============================================================================
-- OPPORTUNITIES (Hackathons, Internships, etc.)
-- =============================================================================

CREATE TABLE opportunities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type            opportunity_type NOT NULL,
  title           TEXT NOT NULL,
  organization    TEXT NOT NULL,
  description     TEXT NOT NULL,
  eligibility     TEXT,
  prize_info      TEXT,
  location        TEXT,
  is_remote       BOOLEAN NOT NULL DEFAULT FALSE,
  application_url TEXT NOT NULL,
  start_date      DATE,
  end_date        DATE,
  deadline        DATE,
  tags            TEXT[],
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_opportunities_type ON opportunities (type);
CREATE INDEX idx_opportunities_deadline ON opportunities (deadline);
CREATE INDEX idx_opportunities_active ON opportunities (is_active) WHERE is_active = TRUE;

CREATE TRIGGER trig_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE opportunity_bookmarks (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id  UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (user_id, opportunity_id)
);

-- =============================================================================
-- REPORTS & MODERATION
-- =============================================================================

CREATE TABLE reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type   report_target_type NOT NULL,
  target_id     UUID NOT NULL,
  reason        TEXT NOT NULL,
  details       TEXT,
  status        report_status NOT NULL DEFAULT 'open',
  resolved_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at   TIMESTAMPTZ,
  resolution_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_target ON reports (target_type, target_id);
CREATE INDEX idx_reports_status ON reports (status);
CREATE INDEX idx_reports_reporter ON reports (reporter_id);

-- =============================================================================
-- GITHUB REFERENCES (Phase 1: URL-based; Phase 6: OAuth tokens added)
-- =============================================================================

CREATE TABLE github_accounts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL,
  -- Phase 6: oauth fields added via migration
  -- access_token TEXT (encrypted),
  -- token_type TEXT,
  -- scopes TEXT[],
  -- github_user_id BIGINT
  profile_url   TEXT,
  connected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_github_repos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  repo_url      TEXT NOT NULL,
  repo_name     TEXT,
  description   TEXT,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  added_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (project_id, repo_url)
);

CREATE INDEX idx_project_repos_project ON project_github_repos (project_id);

-- =============================================================================
-- VERIFICATION REQUESTS (student verification supplementary workflow)
-- =============================================================================

CREATE TABLE verification_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_email TEXT,
  document_url    TEXT,
  notes           TEXT,
  status          verification_status NOT NULL DEFAULT 'pending',
  reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  reviewer_notes  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_requests_user ON verification_requests (user_id);
CREATE INDEX idx_verification_requests_status ON verification_requests (status);
