import { Router } from 'express';
import { getDb } from '../db/schema.js';
import { fetchAndStoreArticles, fetchAllFeeds } from '../services/rss.js';

const router = Router();

// 获取所有订阅源
router.get('/', (_req, res) => {
  const db = getDb();
  const feeds = db.prepare('SELECT * FROM feeds ORDER BY created_at DESC').all();
  db.close();
  res.json(feeds);
});

// 添加订阅源
router.post('/', async (req, res) => {
  const { url, title } = req.body;
  if (!url) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  const db = getDb();
  try {
    const result = db.prepare('INSERT INTO feeds (url, title) VALUES (?, ?)').run(url, title || url);
    const feedId = result.lastInsertRowid as number;
    db.close();

    // 立即抓取内容
    const fetchResult = await fetchAndStoreArticles(feedId, url);
    res.json({ id: feedId, ...fetchResult });
  } catch (err: any) {
    db.close();
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: '该订阅源已存在' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// 删除订阅源
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM feeds WHERE id = ?').run(req.params.id);
  db.close();
  res.json({ ok: true });
});

// 刷新所有订阅
router.post('/refresh', async (_req, res) => {
  const results = await fetchAllFeeds();
  res.json(results);
});

export default router;
