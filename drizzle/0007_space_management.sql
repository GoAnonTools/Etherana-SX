ALTER TABLE spaces ADD COLUMN archivedAt TEXT;

CREATE INDEX IF NOT EXISTS spaces_archived_at_idx
ON spaces (archivedAt);
