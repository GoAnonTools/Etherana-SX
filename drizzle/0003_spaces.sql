CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  instruction TEXT DEFAULT '',
  createdAt TEXT NOT NULL,
  files TEXT DEFAULT '[]'
);
