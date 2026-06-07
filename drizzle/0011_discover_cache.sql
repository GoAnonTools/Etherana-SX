CREATE TABLE IF NOT EXISTS discover_cache (
  key TEXT PRIMARY KEY NOT NULL,
  topic TEXT NOT NULL,
  mode TEXT NOT NULL,
  language TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  itemsJson TEXT NOT NULL
);
