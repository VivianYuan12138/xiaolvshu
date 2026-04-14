import { chatCompletion, parseJSON, getScoreModel } from './ai-client.js';
import { getDb } from '../db/schema.js';

interface ScoreResult {
  score: number;
  tags: string[];
  summary: string;
  reason: string;
}

// Minimum content length to bother scoring
const MIN_CONTENT_LENGTH = 100;

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

  const rawText = article.content
    ? article.content.replace(/<[^>]+>/g, '').trim()
    : article.summary.trim();

  // Content too short → auto low score, don't waste API call
  if (rawText.length < MIN_CONTENT_LENGTH) {
    const result: ScoreResult = {
      score: 2,
      tags: [],
      summary: article.title,
      reason: '内容过短，信息量不足',
    };
    db.prepare('UPDATE articles SET ai_score = ?, ai_tags = ?, ai_summary = ? WHERE id = ?')
      .run(result.score, '[]', result.summary, articleId);
    db.close();
    return result;
  }

  const textToScore = rawText.slice(0, 3000);

  const text = await chatCompletion(
    [
      {
        role: 'system',
        content: `你是内容质量评估员。严格评估文章质量，返回 JSON。

评分标准（1-10分）：
- 信息密度（权重最高）：是否有具体的数据、事实、案例？纯观点无论据扣分
- 原创性：是否有独特见解或一手信息？复制粘贴/AI水文给低分
- 实用性：读完是否能学到具体东西？
- 焦虑指数（反向）：贩卖焦虑 → 大幅扣分
- 标题党程度（反向）：标题夸大其词 → 扣分

特别注意：
- 只有标题没有实质正文 → 1-2分
- 纯营销/广告软文 → 1-3分
- 有数据有案例的深度内容 → 7-10分
- GitHub 项目介绍如果有star数、功能描述 → 5-8分

返回格式（仅JSON）：
{"score": 7, "tags": ["AI", "开源"], "summary": "一句话核心内容（要有信息量，不是复述标题）", "reason": "评分理由"}`,
      },
      {
        role: 'user',
        content: `标题：${article.title}\n正文：${textToScore}`,
      },
    ],
    { model: getScoreModel(), maxTokens: 300, temperature: 0.2 }
  );

  const result = parseJSON<ScoreResult>(text);

  db.prepare('UPDATE articles SET ai_score = ?, ai_tags = ?, ai_summary = ? WHERE id = ?')
    .run(result.score, JSON.stringify(result.tags), result.summary, articleId);

  db.close();
  return result;
}

export async function scoreUnratedArticles(limit = 20) {
  const db = getDb();
  const articles = db
    .prepare('SELECT id FROM articles WHERE ai_score IS NULL ORDER BY fetched_at DESC LIMIT ?')
    .all(limit) as { id: number }[];
  db.close();

  console.log(`📊 评分: ${articles.length} 篇待评`);
  const results = [];
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    try {
      const result = await scoreArticle(article.id);
      const icon = result.score >= 6 ? '✅' : result.score >= 4 ? '🔸' : '❌';
      console.log(`  ${icon} [${result.score}] ${result.summary?.slice(0, 50)}`);
      results.push({ id: article.id, ...result });
    } catch (err) {
      console.log(`  ❌ ${article.id}: ${(err as Error).message?.slice(0, 60)}`);
      results.push({ id: article.id, error: (err as Error).message });
    }
    // Rate limit
    if (i < articles.length - 1) await new Promise(r => setTimeout(r, 800));
  }

  const good = results.filter(r => 'score' in r && (r as any).score >= 6).length;
  console.log(`📊 结果: ${good} 篇优质 / ${results.length} 篇总计`);
  return results;
}
