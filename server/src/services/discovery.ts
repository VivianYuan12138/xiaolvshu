import { chatCompletion, parseJSON, getScoreModel } from './ai-client.js';
import { getDb } from '../db/schema.js';
import { fetchAndStoreArticles } from './rss.js';

/**
 * 从收藏文章提取搜索关键词
 */
export async function extractDiscoveryKeywords(): Promise<string[]> {
  const db = getDb();
  const favs = db.prepare(`
    SELECT title, rewritten_title, ai_tags, ai_summary FROM articles
    WHERE is_favorited = 1
    ORDER BY favorited_at DESC LIMIT 15
  `).all() as { title: string; rewritten_title: string | null; ai_tags: string | null; ai_summary: string | null }[];
  db.close();

  if (favs.length < 3) {
    console.log('🔍 收藏不足3篇，跳过内容发现');
    return [];
  }

  const context = favs.map(f => {
    const tags = f.ai_tags ? JSON.parse(f.ai_tags).join(', ') : '';
    return `- ${f.rewritten_title || f.title}${tags ? ` [${tags}]` : ''}`;
  }).join('\n');

  const text = await chatCompletion(
    [
      {
        role: 'system',
        content: `你是搜索关键词专家。根据用户收藏的文章，生成5-8个用于Google News搜索的英文关键词短语。
要求：
- 每个关键词2-4个英文单词
- 覆盖用户的主要兴趣方向
- 要具体，不要太宽泛（不要"technology"，要"AI code generation"）
- 只返回JSON数组

返回格式：{"keywords": ["keyword1", "keyword2", ...]}`,
      },
      { role: 'user', content: `用户收藏的文章：\n${context}` },
    ],
    { model: getScoreModel(), maxTokens: 200, temperature: 0.3 }
  );

  const result = parseJSON<{ keywords: string[] }>(text);
  return result.keywords || [];
}

/**
 * Google News RSS URL
 */
function buildGoogleNewsUrl(keyword: string): string {
  const encoded = encodeURIComponent(keyword);
  return `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;
}

/**
 * 基于收藏发现新内容
 */
export async function discoverContent(): Promise<{ keywords: string[]; feeds: number; articles: number }> {
  const keywords = await extractDiscoveryKeywords();
  if (keywords.length === 0) return { keywords: [], feeds: 0, articles: 0 };

  console.log(`🔍 发现关键词: ${keywords.join(', ')}`);

  let feedCount = 0;
  let articleCount = 0;

  for (const keyword of keywords) {
    const url = buildGoogleNewsUrl(keyword);
    const title = `[发现] ${keyword}`;

    // 注册动态 feed
    const db = getDb();
    let feedId: number;
    const existing = db.prepare('SELECT id FROM feeds WHERE url = ?').get(url) as { id: number } | undefined;
    if (existing) {
      feedId = existing.id;
    } else {
      const result = db.prepare(
        "INSERT INTO feeds (url, title, type, platform, category, is_dynamic) VALUES (?, ?, 'rss', 'google_news', 'discovery', 1)"
      ).run(url, title);
      feedId = result.lastInsertRowid as number;
      feedCount++;
    }
    db.close();

    // 抓取文章（fetchAndStoreArticles 内部管理自己的 db）
    try {
      const fetchResult = await fetchAndStoreArticles(feedId, url);
      articleCount += fetchResult.new;
      console.log(`  ✅ "${keyword}": +${fetchResult.new} 篇`);
    } catch (err) {
      console.log(`  ❌ "${keyword}": ${(err as Error).message?.slice(0, 60)}`);
    }
  }

  console.log(`🔍 内容发现完成: ${feedCount} 新源, ${articleCount} 新文章`);
  return { keywords, feeds: feedCount, articles: articleCount };
}

/**
 * 清理过期的动态 feed（7天以上且无收藏文章）
 */
export function cleanupDynamicFeeds() {
  const db = getDb();
  const deleted = db.prepare(`
    DELETE FROM feeds WHERE is_dynamic = 1
    AND datetime(created_at) < datetime('now', '-7 days')
    AND id NOT IN (
      SELECT DISTINCT feed_id FROM articles WHERE is_favorited = 1
    )
  `).run();
  db.close();
  if (deleted.changes > 0) {
    console.log(`🧹 清理了 ${deleted.changes} 个过期动态源`);
  }
}
