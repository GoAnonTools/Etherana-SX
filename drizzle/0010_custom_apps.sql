CREATE TABLE IF NOT EXISTS custom_apps (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  outputType TEXT NOT NULL,
  promptTemplate TEXT NOT NULL,
  inputs TEXT DEFAULT '[]',
  goodFor TEXT DEFAULT '[]',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
