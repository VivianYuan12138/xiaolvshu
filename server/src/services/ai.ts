import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../db/schema.js';

const client = new Anthropic();

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

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `你是一个内容质量评估员。请评估以下文章的质量，返回 JSON 格式。

评分标准（1-10分）：
- 信息密度：是否有实质性内容，还是空洞水文？
- 原创性：是否有独特见解，还是人云亦云？
- 焦虑指数（反向）：是否贩卖焦虑、制造容貌/消费/生活方式焦虑？如果是，大幅扣分。
- 标题党程度（反向）：标题是否夸大其词？如果是，扣分。
- 实用性：读完是否有收获？

请返回如下 JSON（不要返回其他内容）：
{
  "score": 7,
  "tags": ["技术", "AI"],
  "summary": "一句话总结这篇文章的核心内容",
  "reason": "简短说明评分理由"
}

文章标题：${article.title}
文章内容：${textToScore}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    db.close();
    throw new Error('AI response is not valid JSON');
  }

  const result: ScoreResult = JSON.parse(jsonMatch[0]);

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
