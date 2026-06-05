CREATE TABLE IF NOT EXISTS space_notes (
  id TEXT PRIMARY KEY NOT NULL,
  spaceId TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS space_links (
  id TEXT PRIMARY KEY NOT NULL,
  spaceId TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS space_notes_space_id_idx
ON space_notes (spaceId);

CREATE INDEX IF NOT EXISTS space_links_space_id_idx
ON space_links (spaceId);
