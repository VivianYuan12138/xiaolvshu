import { Router } from 'express';
import { getDb } from '../db/schema.js';

const router = Router();

const PAGE_SIZE = 20;

// 获取今日内容（分页 + 多样性混排）
router.get('/', (req, res) => {
  const minScore = Number(req.query.minScore) || 6;
  const tag = req.query.tag as string | undefined;
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const limit = Math.min(40, Number(req.query.limit) || PAGE_SIZE);

  const db = getDb();

  let query = `
    SELECT a.*, f.title as feed_title
    FROM articles a
    LEFT JOIN feeds f ON a.feed_id = f.id
    WHERE a.rewritten_title IS NOT NULL AND (a.ai_score >= ? OR a.ai_score IS NULL)
  `;
  const params: any[] = [minScore];

  if (tag) {
    query += ` AND a.ai_tags LIKE ?`;
    params.push(`%"${tag}"%`);
  }

  // 多样性排序：按分数排但同人设不连续出现太多
  // 用 ROW_NUMBER 窗口函数给每个人设内部编号，交叉排列
  query = `
    WITH ranked AS (
      ${query}
    ), numbered AS (
      SELECT *,
        ROW_NUMBER() OVER (PARTITION BY author_persona ORDER BY (ai_score * COALESCE(ai_relevance, 5) / 10.0) DESC, published_at DESC) as persona_rank
      FROM ranked
    )
    SELECT * FROM numbered
    ORDER BY persona_rank ASC, (ai_score * COALESCE(ai_relevance, 5) / 10.0) DESC, published_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);

  const articles = db.prepare(query).all(...params);

  // 总数（用于前端判断是否还有更多）
  let countQuery = `
    SELECT COUNT(*) as total FROM articles a
    WHERE a.rewritten_title IS NOT NULL AND (a.ai_score >= ? OR a.ai_score IS NULL)
  `;
  const countParams: any[] = [minScore];
  if (tag) {
    countQuery += ` AND a.ai_tags LIKE ?`;
    countParams.push(`%"${tag}"%`);
  }
  const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

  db.close();

  res.json({
    articles,
    total,
    offset,
    hasMore: offset + articles.length < total,
    count: articles.length,
  });
});

// 获取未改写的文章（供 skill 调用）
router.get('/unprocessed', (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const db = getDb();
  const articles = db.prepare(`
    SELECT id, title, content, summary, link
    FROM articles
    WHERE rewritten_title IS NULL
    ORDER BY fetched_at DESC
    LIMIT ?
  `).all(limit);
  db.close();
  res.json(articles);
});

// 保存改写结果（供 skill 调用）
router.put('/:id/rewrite', (req, res) => {
  const { rewritten_title, rewritten_content, author_persona, ai_score, ai_tags, ai_summary } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE articles
    SET rewritten_title = ?,
        rewritten_content = ?,
        author_persona = ?,
        ai_score = ?,
        ai_tags = ?,
        ai_summary = ?
    WHERE id = ?
  `).run(
    rewritten_title,
    rewritten_content,
    author_persona,
    ai_score,
    JSON.stringify(ai_tags || []),
    ai_summary,
    req.params.id
  );
  db.close();
  res.json({ ok: true });
});

// 获取所有标签
router.get('/tags', (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare('SELECT ai_tags FROM articles WHERE ai_tags IS NOT NULL')
    .all() as { ai_tags: string }[];
  db.close();

  const tagCount: Record<string, number> = {};
  for (const row of rows) {
    try {
      const tags: string[] = JSON.parse(row.ai_tags);
      for (const tag of tags) {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      }
    } catch {}
  }

  const sorted = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

  res.json(sorted);
});

// 搜索
router.get('/search', (req, res) => {
  const q = req.query.q as string;
  if (!q) { res.json([]); return; }
  const db = getDb();
  const articles = db.prepare(`
    SELECT a.*, f.title as feed_title
    FROM articles a
    LEFT JOIN feeds f ON a.feed_id = f.id
    WHERE a.rewritten_title LIKE ? OR a.title LIKE ? OR a.ai_tags LIKE ? OR a.ai_summary LIKE ?
    ORDER BY a.ai_score DESC, a.published_at DESC
    LIMIT 20
  `).all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  db.close();
  res.json(articles);
});

// 获取所有收藏
router.get('/favorites', (_req, res) => {
  const db = getDb();
  const articles = db.prepare(`
    SELECT a.*, f.title as feed_title
    FROM articles a
    LEFT JOIN feeds f ON a.feed_id = f.id
    WHERE a.is_favorited = 1
    ORDER BY a.favorited_at DESC
  `).all();
  db.close();
  res.json(articles);
});

// 切换收藏状态
router.post('/:id/favorite', (req, res) => {
  const db = getDb();
  const article = db.prepare('SELECT is_favorited FROM articles WHERE id = ?').get(req.params.id) as { is_favorited: number } | undefined;
  if (!article) { db.close(); res.status(404).json({ error: '文章不存在' }); return; }

  const newState = article.is_favorited ? 0 : 1;
  db.prepare('UPDATE articles SET is_favorited = ?, favorited_at = ? WHERE id = ?')
    .run(newState, newState ? new Date().toISOString() : null, req.params.id);
  db.close();
  res.json({ ok: true, is_favorited: newState });
});

// 标记已读
router.post('/:id/read', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE articles SET is_read = 1 WHERE id = ?').run(req.params.id);
  db.close();
  res.json({ ok: true });
});

export default router;
