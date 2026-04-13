import Parser from 'rss-parser';
import { getDb } from '../db/schema.js';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'XiaoLvShu/0.1',
  },
});

export async function fetchFeed(feedUrl: string) {
  const feed = await parser.parseURL(feedUrl);
  return feed;
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
  db.close();
  return { total: feed.items.length, new: newCount, feedTitle: feed.title };
}

function extractImage(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/);
  return match ? match[1] : null;
}

export async function fetchAllFeeds() {
  const db = getDb();
  const feeds = db.prepare('SELECT id, url FROM feeds').all() as { id: number; url: string }[];
  db.close();

  const results = [];
  for (const feed of feeds) {
    try {
      const result = await fetchAndStoreArticles(feed.id, feed.url);
      results.push({ feedId: feed.id, ...result });
    } catch (err) {
      results.push({ feedId: feed.id, error: (err as Error).message });
    }
  }
  return results;
}
