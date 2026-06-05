CREATE TABLE IF NOT EXISTS automations (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  purpose TEXT NOT NULL,
  frequency TEXT NOT NULL,
  prompt TEXT NOT NULL,
  output TEXT NOT NULL,
  outputType TEXT,
  outputDestination TEXT,
  outputDestinationLabel TEXT,
  goodFor TEXT DEFAULT '[]',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS automation_runs (
  id TEXT PRIMARY KEY NOT NULL,
  automationId TEXT NOT NULL,
  automationName TEXT NOT NULL,
  startedAt TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  prompt TEXT NOT NULL,
  expectedOutput TEXT NOT NULL,
  outputType TEXT,
  outputDestination TEXT,
  outputDestinationLabel TEXT,
  outputId TEXT
);

CREATE TABLE IF NOT EXISTS automation_outputs (
  id TEXT PRIMARY KEY NOT NULL,
  automationId TEXT NOT NULL,
  automationName TEXT NOT NULL,
  title TEXT NOT NULL,
  outputType TEXT NOT NULL,
  outputDestination TEXT NOT NULL,
  outputDestinationLabel TEXT NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT,
  runId TEXT NOT NULL,
  prompt TEXT NOT NULL,
  expectedOutput TEXT NOT NULL,
  content TEXT
);

CREATE TABLE IF NOT EXISTS hidden_template_automations (
  templateId TEXT PRIMARY KEY NOT NULL,
  hiddenAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS automations_created_at_idx
ON automations (createdAt);

CREATE INDEX IF NOT EXISTS automation_runs_automation_id_idx
ON automation_runs (automationId);

CREATE INDEX IF NOT EXISTS automation_outputs_automation_id_idx
ON automation_outputs (automationId);

CREATE INDEX IF NOT EXISTS automation_outputs_destination_idx
ON automation_outputs (outputDestination);
