import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../data/xiaolvshu.db');

export function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'rss',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feed_id INTEGER REFERENCES feeds(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      link TEXT NOT NULL UNIQUE,
      content TEXT,
      summary TEXT,
      image_url TEXT,
      author TEXT,
      published_at TEXT,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      ai_score REAL,
      ai_tags TEXT,
      ai_summary TEXT,
      is_read INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_articles_score ON articles(ai_score);
    CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at);
  `);

  // 添加新列（如果不存在）
  const columns = db.prepare("PRAGMA table_info(articles)").all() as { name: string }[];
  const colNames = columns.map(c => c.name);

  if (!colNames.includes('rewritten_title')) {
    db.exec('ALTER TABLE articles ADD COLUMN rewritten_title TEXT');
  }
  if (!colNames.includes('rewritten_content')) {
    db.exec('ALTER TABLE articles ADD COLUMN rewritten_content TEXT');
  }
  if (!colNames.includes('author_persona')) {
    db.exec('ALTER TABLE articles ADD COLUMN author_persona TEXT');
  }

  db.close();
}
