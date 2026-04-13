import { chatCompletion, parseJSON, getScoreModel } from './ai-client.js';
import { getDb } from '../db/schema.js';
import {
  SCORING_SYSTEM_PROMPT_V1,
  SCORING_TEMPERATURE,
  SCORING_MAX_TOKENS,
  MIN_CONTENT_LENGTH,
  type ScoreResult,
} from '../prompts/index.js';

export type { ScoreResult };

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
      { role: 'system', content: SCORING_SYSTEM_PROMPT_V1 },
      { role: 'user', content: `标题：${article.title}\n正文：${textToScore}` },
    ],
    { model: getScoreModel(), maxTokens: SCORING_MAX_TOKENS, temperature: SCORING_TEMPERATURE }
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
