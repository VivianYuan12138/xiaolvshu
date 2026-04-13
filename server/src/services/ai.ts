import { chatCompletion, parseJSON, getScoreModel } from './ai-client.js';
import { getDb } from '../db/schema.js';

interface ScoreResult {
  score: number;
  tags: string[];
  summary: string;
  reason: string;
}

export async function scoreArticle(articleId: number): Promise<ScoreResult> {
  const db = getDb();
  const article = db.prepare('SELECT title, content, summary FROM articles WHERE id = ?').get(articleId) as {
    title: string;
    content: string;
    summary: string;
  } | undefined;

  if (!article) {
    db.close();
    throw new Error('Article not found');
  }

  const textToScore = article.content
    ? article.content.replace(/<[^>]+>/g, '').slice(0, 3000)
    : article.summary.slice(0, 3000);

  const text = await chatCompletion(
    [
      {
        role: 'system',
        content: `你是一个内容质量评估员。请评估文章质量并返回 JSON。

评分标准（1-10分）：
- 信息密度：是否有实质性内容，还是空洞水文？
- 原创性：是否有独特见解，还是人云亦云？
- 焦虑指数（反向）：贩卖焦虑、制造容貌/消费/生活方式焦虑 → 大幅扣分
- 标题党程度（反向）：标题夸大其词 → 扣分
- 实用性：读完是否有收获？

返回格式（仅 JSON，无其他内容）：
{"score": 7, "tags": ["技术", "AI"], "summary": "一句话总结核心内容", "reason": "简短评分理由"}`,
      },
      {
        role: 'user',
        content: `文章标题：${article.title}\n文章内容：${textToScore}`,
      },
    ],
    { model: getScoreModel(), maxTokens: 500, temperature: 0.3 }
  );

  const result = parseJSON<ScoreResult>(text);

  db.prepare(`
    UPDATE articles SET ai_score = ?, ai_tags = ?, ai_summary = ? WHERE id = ?
  `).run(result.score, JSON.stringify(result.tags), result.summary, articleId);

  db.close();
  return result;
}

export async function scoreUnratedArticles(limit = 10) {
  const db = getDb();
  const articles = db
    .prepare('SELECT id FROM articles WHERE ai_score IS NULL ORDER BY fetched_at DESC LIMIT ?')
    .all(limit) as { id: number }[];
  db.close();

  const results = [];
  for (const article of articles) {
    try {
      const result = await scoreArticle(article.id);
      results.push({ id: article.id, ...result });
    } catch (err) {
      results.push({ id: article.id, error: (err as Error).message });
    }
  }
  return results;
}
