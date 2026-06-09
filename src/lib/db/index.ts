import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const APP_DIR = process.cwd();
const DB_DIR = process.env.ETHERANA_DATA_DIR || path.join(APP_DIR, 'data');

fs.mkdirSync(DB_DIR, { recursive: true });

const sqlite = new Database(path.join(DB_DIR, 'db.sqlite'));
const db = drizzle(sqlite, {
  schema: schema,
});

export default db;
