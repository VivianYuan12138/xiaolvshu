import { chatCompletion, parseJSON, getScoreModel } from './ai-client.js';
import { getDb } from '../db/schema.js';
import {
  SCORING_TEMPERATURE,
  SCORING_MAX_TOKENS,
  MIN_CONTENT_LENGTH,
  buildScoringPrompt,
  type ScoreResult,
  type UserPreferences,
} from '../prompts/index.js';

export type { ScoreResult };

function getUserPreferences(db: ReturnType<typeof getDb>): UserPreferences | undefined {
  const favs = db.prepare(`
    SELECT title, rewritten_title, ai_tags FROM articles
    WHERE is_favorited = 1
    ORDER BY favorited_at DESC LIMIT 20
  `).all() as { title: string; rewritten_title: string | null; ai_tags: string | null }[];

  if (favs.length === 0) return undefined;

  const tagCount: Record<string, number> = {};
  for (const f of favs) {
    try {
      const tags: string[] = f.ai_tags ? JSON.parse(f.ai_tags) : [];
      for (const t of tags) tagCount[t] = (tagCount[t] || 0) + 1;
    } catch {}
  }
  const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  const recentTitles = favs.slice(0, 5).map(f => f.rewritten_title || f.title);

  return { topTags, recentTitles };
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
    db.prepare('UPDATE articles SET ai_score = ?, ai_relevance = ?, ai_tags = ?, ai_summary = ? WHERE id = ?')
      .run(result.score, null, '[]', result.summary, articleId);
    db.close();
    return result;
  }

  const textToScore = rawText.slice(0, 3000);

  // 注入用户偏好到评分 prompt
  const preferences = getUserPreferences(db);
  const systemPrompt = buildScoringPrompt(preferences);

  const text = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `标题：${article.title}\n正文：${textToScore}` },
    ],
    { model: getScoreModel(), maxTokens: SCORING_MAX_TOKENS, temperature: SCORING_TEMPERATURE }
  );

  const parsed = parseJSON<ScoreResult & { relevance?: number }>(text);
  const relevance = parsed.relevance ?? null;

  db.prepare('UPDATE articles SET ai_score = ?, ai_relevance = ?, ai_tags = ?, ai_summary = ? WHERE id = ?')
    .run(parsed.score, relevance, JSON.stringify(parsed.tags), parsed.summary, articleId);

  db.close();
  return { score: parsed.score, tags: parsed.tags, summary: parsed.summary, reason: parsed.reason };
}

/**
 * 并发评分未评分文章
 * @param limit 总数上限
 * @param concurrency 并发数（默认 5）
 */
export async function scoreUnratedArticles(limit = 20, concurrency = 5) {
  const db = getDb();
  const articles = db
    .prepare('SELECT id FROM articles WHERE ai_score IS NULL ORDER BY fetched_at DESC LIMIT ?')
    .all(limit) as { id: number }[];
  db.close();

  if (articles.length === 0) return [];

  console.log(`📊 评分: ${articles.length} 篇待评 (并发: ${concurrency})`);
  const results: any[] = [];
  const queue = [...articles];

  async function worker() {
    while (queue.length > 0) {
      const article = queue.shift()!;
      try {
        const result = await scoreArticle(article.id);
        const icon = result.score >= 6 ? '✅' : result.score >= 4 ? '🔸' : '❌';
        console.log(`  ${icon} [${result.score}] ${result.summary?.slice(0, 50)}`);
        results.push({ id: article.id, ...result });
      } catch (err) {
        console.log(`  ❌ ${article.id}: ${(err as Error).message?.slice(0, 60)}`);
        results.push({ id: article.id, error: (err as Error).message });
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => worker());
  await Promise.all(workers);

  const good = results.filter(r => 'score' in r && r.score >= 6).length;
  console.log(`📊 结果: ${good} 篇优质 / ${results.length} 篇总计`);
  return results;
}
