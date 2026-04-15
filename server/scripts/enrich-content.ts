/**
 * 补充内容贫瘠的文章正文
 * 用法: npx tsx scripts/enrich-content.ts
 */
import 'dotenv/config';
import { initDb, getDb } from '../src/db/schema.js';
import {
  extractContent,
  extractArticleUrl,
  extractRedditExternalUrl,
  isContentThin,
} from '../src/services/content-extractor.js';

initDb();

async function main() {
  const db = getDb();
  const allArticles = db.prepare(`
    SELECT a.id, a.title, a.content, a.link FROM articles a
    WHERE a.link IS NOT NULL AND a.link != ''
    ORDER BY a.fetched_at DESC
  `).all() as { id: number; title: string; content: string; link: string }[];
  db.close();

  const articles = allArticles.filter(a => isContentThin(a.content, 200));

  console.log(`📄 需要补充正文: ${articles.length} 篇 (并发: 5)`);
  if (articles.length === 0) return;

  let ok = 0;
  const queue = [...articles];

  async function worker() {
    while (queue.length > 0) {
      const a = queue.shift()!;
      try {
        // 1. Try extracting URL from RSS content (HN format)
        let targetUrl = extractArticleUrl(a.content || '');

        // 2. For Reddit links, use JSON API to get external URL
        if (!targetUrl && a.link.includes('reddit.com')) {
          targetUrl = await extractRedditExternalUrl(a.link);
        }

        // 3. Fallback to article link
        if (!targetUrl) targetUrl = a.link;

        // Skip if target is still reddit/twitter/producthunt (no extractable content)
        if (targetUrl.includes('reddit.com') || targetUrl.includes('producthunt.com')) {
          console.log(`  ⏭️  ${a.title.slice(0, 50)}`);
          continue;
        }

        const result = await extractContent(targetUrl);
        if (result && result.textContent.length > 100) {
          const db2 = getDb();
          db2.prepare('UPDATE articles SET content = ?, summary = ? WHERE id = ?')
            .run(result.content, result.excerpt, a.id);
          db2.close();
          ok++;
          console.log(`  ✅ ${a.title.slice(0, 50)} (+${result.textContent.length}字)`);
        } else {
          console.log(`  ⏭️  ${a.title.slice(0, 50)} (无法提取)`);
        }
      } catch (err) {
        console.log(`  ❌ ${a.title.slice(0, 50)}: ${(err as Error).message?.slice(0, 60)}`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(5, queue.length) }, () => worker());
  await Promise.all(workers);
  console.log(`\n📄 完成: ${ok}/${articles.length} 篇成功补充正文`);
}

main().catch(console.error);
