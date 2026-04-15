import 'dotenv/config';
import { initDb } from './src/db/schema.js';
import { seedFeeds } from './src/db/seeds.js';
import { fetchAllFeeds } from './src/services/rss.js';
import { scoreUnratedArticles } from './src/services/ai.js';
import { rewriteUnprocessedArticles } from './src/services/author-agent.js';
import { discoverContent, cleanupDynamicFeeds } from './src/services/discovery.js';

initDb();
seedFeeds();

async function main() {
  // Step 0: 基于收藏发现新内容
  console.log('\n========== Step 0: 内容发现（基于收藏） ==========');
  await discoverContent();
  cleanupDynamicFeeds();

  // Step 1: Fetch all feeds
  console.log('\n========== Step 1: 抓取信息源 ==========');
  await fetchAllFeeds();

  // Step 2: Score unrated articles (multiple rounds)
  console.log('\n========== Step 2: AI 评分（过滤垃圾） ==========');
  let round = 1;
  while (true) {
    const results = await scoreUnratedArticles(30);
    if (results.length === 0) break;
    console.log(`  第${round}轮评分完成`);
    round++;
  }

  // Step 3: Rewrite only good articles (score >= 5)
  console.log('\n========== Step 3: AI 改写（仅优质内容） ==========');
  round = 1;
  while (true) {
    const results = await rewriteUnprocessedArticles(15);
    if (results.length === 0) break;
    const ok = results.filter(r => !('error' in r)).length;
    console.log(`  第${round}轮改写: ${ok}/${results.length}`);
    round++;
  }

  console.log('\n========== 完成 ==========');
  // Print stats
  const { getDb } = await import('./src/db/schema.js');
  const db = getDb();
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN ai_score IS NOT NULL THEN 1 ELSE 0 END) as scored,
      SUM(CASE WHEN ai_score >= 5 THEN 1 ELSE 0 END) as good,
      SUM(CASE WHEN rewritten_title IS NOT NULL THEN 1 ELSE 0 END) as rewritten,
      SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END) as with_image
    FROM articles
  `).get() as any;
  db.close();
  console.log(`📊 文章: ${stats.total} | 已评分: ${stats.scored} | 优质(≥5): ${stats.good} | 已改写: ${stats.rewritten} | 有图: ${stats.with_image}`);
}

main().catch(console.error);
