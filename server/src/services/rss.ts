import Parser from 'rss-parser';
import { getDb } from '../db/schema.js';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
});

export async function fetchFeed(feedUrl: string) {
  const encoded = encodeURI(feedUrl);

  // Reddit blocks rss-parser's default request; use fetch + parser
  if (encoded.includes('reddit.com')) {
    const resp = await fetch(encoded, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) throw new Error(`Status code ${resp.status}`);
    const xml = await resp.text();
    return parser.parseString(xml);
  }

  return parser.parseURL(encoded);
}

export async function fetchAndStoreArticles(feedId: number, feedUrl: string) {
  const feed = await fetchFeed(feedUrl);
  const db = getDb();

  const insert = db.prepare(`
    INSERT OR IGNORE INTO articles (feed_id, title, link, content, summary, image_url, author, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: typeof feed.items) => {
    let count = 0;
    for (const item of items) {
      const image = extractImage(item.content || item['content:encoded'] || '');
      const result = insert.run(
        feedId,
        item.title || 'Untitled',
        item.link || '',
        item['content:encoded'] || item.content || '',
        item.contentSnippet || '',
        image,
        item.creator || item.author || '',
        item.isoDate || item.pubDate || null
      );
      if (result.changes > 0) count++;
    }
    return count;
  });

  const newCount = insertMany(feed.items);

  // Update feed metadata
  db.prepare(`
    UPDATE feeds SET last_fetched_at = datetime('now'), error_count = 0 WHERE id = ?
  `).run(feedId);

  db.close();
  return { total: feed.items.length, new: newCount, feedTitle: feed.title };
}

function extractImage(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/);
  return match ? match[1] : null;
}

// Parallel fetch with concurrency limit
export async function fetchAllFeeds(concurrency = 5) {
  const db = getDb();
  const feeds = db.prepare('SELECT id, url, title FROM feeds WHERE enabled = 1').all() as { id: number; url: string; title: string }[];
  db.close();

  console.log(`📡 开始并行抓取 ${feeds.length} 个源 (并发: ${concurrency})`);

  const results: any[] = [];
  const queue = [...feeds];

  async function worker() {
    while (queue.length > 0) {
      const feed = queue.shift()!;
      try {
        console.log(`  ⏳ ${feed.title}`);
        const result = await fetchAndStoreArticles(feed.id, feed.url);
        console.log(`  ✅ ${feed.title}: +${result.new} 篇`);
        results.push({ feedId: feed.id, title: feed.title, ...result });
      } catch (err) {
        const errMsg = (err as Error).message;
        console.log(`  ❌ ${feed.title}: ${errMsg.slice(0, 80)}`);

        const db2 = getDb();
        db2.prepare('UPDATE feeds SET error_count = error_count + 1 WHERE id = ?').run(feed.id);
        db2.close();

        results.push({ feedId: feed.id, title: feed.title, error: errMsg });
      }
    }
  }

  // Launch workers in parallel
  const workers = Array.from({ length: Math.min(concurrency, feeds.length) }, () => worker());
  await Promise.all(workers);

  const success = results.filter(r => !r.error).length;
  console.log(`📊 完成: ${success}/${feeds.length} 个源成功`);

  return results;
}
