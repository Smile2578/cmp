CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  categories TEXT NOT NULL,
  ip_truncated TEXT,
  user_agent TEXT,
  given_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  proof_token TEXT NOT NULL,
  widget_version TEXT NOT NULL,
  purge_after TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consents_visitor ON consents(visitor_id);
CREATE INDEX IF NOT EXISTS idx_consents_purge ON consents(purge_after);
