import { chatCompletion, parseJSON, getRewriteModel } from './ai-client.js';
import { getDb } from '../db/schema.js';
import {
  REWRITE_SYSTEM_PROMPT_V1,
  REWRITE_TEMPERATURE,
  REWRITE_MAX_TOKENS,
  FEW_SHOT_EXAMPLES_V1,
  MIN_SCORE_TO_REWRITE,
  MIN_CONTENT_TO_REWRITE,
  MAX_CONTENT_LENGTH,
  type RewriteResult,
} from '../prompts/index.js';

export type { RewriteResult };

export async function rewriteArticle(articleId: number): Promise<RewriteResult | null> {
  const db = getDb();
  const article = db.prepare(
    'SELECT title, content, summary, link, ai_score FROM articles WHERE id = ?'
  ).get(articleId) as { title: string; content: string; summary: string; link: string; ai_score: number | null } | undefined;

  if (!article) {
    db.close();
    throw new Error('Article not found');
  }

  // Skip low quality articles
  if (article.ai_score !== null && article.ai_score < MIN_SCORE_TO_REWRITE) {
    db.close();
    return null;
  }

  const rawText = article.content
    ? article.content.replace(/<[^>]+>/g, '').trim().slice(0, MAX_CONTENT_LENGTH)
    : article.summary.trim().slice(0, MAX_CONTENT_LENGTH);

  // Skip if too little content to rewrite meaningfully
  if (rawText.length < MIN_CONTENT_TO_REWRITE) {
    db.close();
    return null;
  }

  const text = await chatCompletion(
    [
      { role: 'system', content: REWRITE_SYSTEM_PROMPT_V1 },
      ...FEW_SHOT_EXAMPLES_V1,
      {
        role: 'user',
        content: `原文标题：${article.title}\n原文内容：${rawText}`,
      },
    ],
    { model: getRewriteModel(), maxTokens: REWRITE_MAX_TOKENS, temperature: REWRITE_TEMPERATURE }
  );

  const result = parseJSON<RewriteResult>(text);

  db.prepare(`
    UPDATE articles
    SET ai_tags = ?,
        ai_summary = ?,
        rewritten_title = ?,
        rewritten_content = ?,
        author_persona = ?
    WHERE id = ?
  `).run(
    JSON.stringify(result.tags),
    result.summary,
    result.emoji_title || result.title,
    result.content,
    result.author_persona,
    articleId
  );

  db.close();
  return result;
}

export async function rewriteUnprocessedArticles(limit = 20) {
  const db = getDb();
  // Only rewrite scored articles above threshold
  const articles = db
    .prepare(`
      SELECT id, title FROM articles
      WHERE rewritten_title IS NULL
        AND ai_score >= ?
      ORDER BY ai_score DESC, fetched_at DESC
      LIMIT ?
    `)
    .all(MIN_SCORE_TO_REWRITE, limit) as { id: number; title: string }[];
  db.close();

  if (articles.length === 0) {
    console.log('📝 没有待改写的文章（需先评分且≥5分）');
    return [];
  }

  console.log(`📝 改写: ${articles.length} 篇（评分≥${MIN_SCORE_TO_REWRITE}）`);
  const results = [];
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    try {
      const result = await rewriteArticle(article.id);
      if (result) {
        console.log(`  ✅ ${result.emoji_title || result.title}`);
        results.push({ id: article.id, ...result });
      } else {
        console.log(`  ⏭️ 跳过: ${article.title.slice(0, 40)}`);
      }
    } catch (err) {
      console.log(`  ❌ ${article.id}: ${(err as Error).message?.slice(0, 60)}`);
      results.push({ id: article.id, error: (err as Error).message });
    }
    // Rate limit
    if (i < articles.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  return results;
}
