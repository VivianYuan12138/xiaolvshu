import { Router } from 'express';
import { getDb } from '../db/schema.js';
import { fetchAndStoreArticles, fetchAllFeeds } from '../services/rss.js';

const router = Router();

// 获取所有订阅源（支持按平台筛选）
router.get('/', (req, res) => {
  const platform = req.query.platform as string | undefined;
  const db = getDb();

  let query = 'SELECT * FROM feeds';
  const params: any[] = [];

  if (platform) {
    query += ' WHERE platform = ?';
    params.push(platform);
  }

  query += ' ORDER BY platform, created_at DESC';
  const feeds = db.prepare(query).all(...params);
  db.close();
  res.json(feeds);
});

// 添加订阅源
router.post('/', async (req, res) => {
  const { url, title, platform, category } = req.body;
  if (!url) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  const db = getDb();
  try {
    const result = db.prepare(
      'INSERT INTO feeds (url, title, type, platform, category) VALUES (?, ?, ?, ?, ?)'
    ).run(url, title || url, 'rss', platform || 'other', category || 'general');
    const feedId = result.lastInsertRowid as number;
    db.close();

    // 立即抓取内容
    try {
      const fetchResult = await fetchAndStoreArticles(feedId, url);
      res.json({ id: feedId, ...fetchResult });
    } catch (fetchErr) {
      res.json({ id: feedId, warning: `源已添加但首次抓取失败: ${(fetchErr as Error).message}` });
    }
  } catch (err: any) {
    db.close();
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: '该订阅源已存在' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// 启用/禁用订阅源
router.patch('/:id', (req, res) => {
  const { enabled } = req.body;
  const db = getDb();
  db.prepare('UPDATE feeds SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, req.params.id);
  db.close();
  res.json({ ok: true });
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

// 获取平台列表
router.get('/platforms', (_req, res) => {
  const db = getDb();
  const platforms = db.prepare(`
    SELECT platform, COUNT(*) as count, SUM(enabled) as active
    FROM feeds GROUP BY platform ORDER BY count DESC
  `).all();
  db.close();
  res.json(platforms);
});

export default router;
