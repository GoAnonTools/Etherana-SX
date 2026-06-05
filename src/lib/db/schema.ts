import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';
import { Block } from '../types';
import { SearchSources } from '../agents/search/types';

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey(),
  messageId: text('messageId').notNull(),
  chatId: text('chatId').notNull(),
  backendId: text('backendId').notNull(),
  query: text('query').notNull(),
  createdAt: text('createdAt').notNull(),
  responseBlocks: text('responseBlocks', { mode: 'json' })
    .$type<Block[]>()
    .default(sql`'[]'`),
  status: text({ enum: ['answering', 'completed', 'error'] }).default(
    'answering',
  ),
});

interface DBFile {
  name: string;
  fileId: string;
}

export const spaces = sqliteTable('spaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  instruction: text('instruction'),
  createdAt: text('createdAt').notNull(),
  archivedAt: text('archivedAt'),
  files: text('files', { mode: 'json' })
    .$type<DBFile[]>()
    .default(sql`'[]'`),
});

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: text('createdAt').notNull(),
  sources: text('sources', {
    mode: 'json',
  })
    .$type<SearchSources[]>()
    .default(sql`'[]'`),
  files: text('files', { mode: 'json' })
    .$type<DBFile[]>()
    .default(sql`'[]'`),
  spaceId: text('spaceId'),
});


export const vaultSyncRecords = sqliteTable('vault_sync_records', {
  id: text('id').primaryKey(),
  vaultId: text('vaultId').notNull(),
  recordKey: text('recordKey').notNull(),
  ciphertext: text('ciphertext').notNull(),
  iv: text('iv').notNull(),
  updatedAt: text('updatedAt').notNull(),
  deletedAt: text('deletedAt'),
  deviceId: text('deviceId'),
});


export const automationRecords = sqliteTable('automations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  purpose: text('purpose').notNull(),
  frequency: text('frequency').notNull(),
  mode: text('mode').notNull().default('manual'),
  status: text('status').notNull().default('active'),
  scheduleType: text('scheduleType').notNull().default('manual'),
  scheduleTime: text('scheduleTime'),
  scheduleDays: text('scheduleDays', { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
  scheduleDayOfMonth: integer('scheduleDayOfMonth'),
  nextRunAt: text('nextRunAt'),
  lastRunAt: text('lastRunAt'),
  prompt: text('prompt').notNull(),
  output: text('output').notNull(),
  outputType: text('outputType'),
  outputDestination: text('outputDestination'),
  outputDestinationLabel: text('outputDestinationLabel'),
  goodFor: text('goodFor', { mode: 'json' })
    .$type<string[]>()
    .default(sql`'[]'`),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
});

export const automationRunRecords = sqliteTable('automation_runs', {
  id: text('id').primaryKey(),
  automationId: text('automationId').notNull(),
  automationName: text('automationName').notNull(),
  startedAt: text('startedAt').notNull(),
  mode: text('mode').notNull(),
  status: text('status').notNull(),
  prompt: text('prompt').notNull(),
  expectedOutput: text('expectedOutput').notNull(),
  outputType: text('outputType'),
  outputDestination: text('outputDestination'),
  outputDestinationLabel: text('outputDestinationLabel'),
  outputId: text('outputId'),
});

export const automationOutputRecords = sqliteTable('automation_outputs', {
  id: text('id').primaryKey(),
  automationId: text('automationId').notNull(),
  automationName: text('automationName').notNull(),
  title: text('title').notNull(),
  outputType: text('outputType').notNull(),
  outputDestination: text('outputDestination').notNull(),
  outputDestinationLabel: text('outputDestinationLabel').notNull(),
  status: text('status').notNull(),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt'),
  runId: text('runId').notNull(),
  prompt: text('prompt').notNull(),
  expectedOutput: text('expectedOutput').notNull(),
  content: text('content'),
});

export const hiddenTemplateAutomationRecords = sqliteTable(
  'hidden_template_automations',
  {
    templateId: text('templateId').primaryKey(),
    hiddenAt: text('hiddenAt').notNull(),
  },
);


export const spaceNotes = sqliteTable('space_notes', {
  id: text('id').primaryKey(),
  spaceId: text('spaceId').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
});

export const spaceLinks = sqliteTable('space_links', {
  id: text('id').primaryKey(),
  spaceId: text('spaceId').notNull(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  description: text('description'),
  createdAt: text('createdAt').notNull(),
});
