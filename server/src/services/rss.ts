import Parser from 'rss-parser';
import { getDb } from '../db/schema.js';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure'],
    ],
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

// Extract image from multiple sources
function extractImage(item: any): string | null {
  // 1. media:content or media:thumbnail
  const media = item.mediaContent?.$ || item.mediaThumbnail?.$;
  if (media?.url) return media.url;

  // 2. enclosure (image type)
  if (item.enclosure?.url && item.enclosure?.type?.startsWith('image/')) {
    return item.enclosure.url;
  }

  // 3. First <img> in content
  const html = item['content:encoded'] || item.content || '';
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/);
  if (imgMatch) return imgMatch[1];

  // 4. OG image from description/content
  const ogMatch = html.match(/og:image[^>]+content=["']([^"']+)["']/);
  if (ogMatch) return ogMatch[1];

  return null;
}

// Try to fetch OG image from article URL
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; XiaoLvShu/0.3)' },
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    // Only read first 10KB for performance
    const head = html.slice(0, 10000);
    const ogMatch = head.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || head.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return ogMatch ? ogMatch[1] : null;
  } catch {
    return null;
  }
}

export async function fetchAndStoreArticles(feedId: number, feedUrl: string, fetchImages = true) {
  const feed = await fetchFeed(feedUrl);
  const db = getDb();

  const insert = db.prepare(`
    INSERT OR IGNORE INTO articles (feed_id, title, link, content, summary, image_url, author, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let newCount = 0;
  const newArticles: { link: string; id: number }[] = [];

  const insertMany = db.transaction((items: typeof feed.items) => {
    for (const item of items) {
      const image = extractImage(item);
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
      if (result.changes > 0) {
        newCount++;
        if (!image && item.link) {
          newArticles.push({ link: item.link, id: result.lastInsertRowid as number });
        }
      }
    }
  });

  insertMany(feed.items);

  // Update feed metadata
  db.prepare(`
    UPDATE feeds SET last_fetched_at = datetime('now'), error_count = 0 WHERE id = ?
  `).run(feedId);

  db.close();

  // Fetch OG images for articles without images (in background, non-blocking)
  if (fetchImages && newArticles.length > 0) {
    fetchOgImagesForArticles(newArticles.slice(0, 10)).catch(() => {});
  }

  return { total: feed.items.length, new: newCount, feedTitle: feed.title };
}

async function fetchOgImagesForArticles(articles: { link: string; id: number }[]) {
  for (const article of articles) {
    const image = await fetchOgImage(article.link);
    if (image) {
      const db = getDb();
      db.prepare('UPDATE articles SET image_url = ? WHERE id = ? AND image_url IS NULL').run(image, article.id);
      db.close();
    }
  }
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

  const workers = Array.from({ length: Math.min(concurrency, feeds.length) }, () => worker());
  await Promise.all(workers);

  const success = results.filter(r => !r.error).length;
  console.log(`📊 完成: ${success}/${feeds.length} 个源成功`);

  return results;
}
