import { getDb } from './schema.js';

interface SeedFeed {
  title: string;
  url: string;
  platform: string;
  category: string;
}

// RSSHub instance that actually works for Twitter
const RSSHUB = 'https://rsshub.pseudoyu.com';

const SEED_FEEDS: SeedFeed[] = [
  // ===== Reddit (native RSS, needs browser User-Agent) =====
  { title: 'Reddit - Technology', url: 'https://www.reddit.com/r/technology/top/.rss?t=day', platform: 'reddit', category: 'tech' },
  { title: 'Reddit - Programming', url: 'https://www.reddit.com/r/programming/top/.rss?t=day', platform: 'reddit', category: 'tech' },
  { title: 'Reddit - Machine Learning', url: 'https://www.reddit.com/r/MachineLearning/top/.rss?t=day', platform: 'reddit', category: 'ai' },
  { title: 'Reddit - Startups', url: 'https://www.reddit.com/r/startups/top/.rss?t=day', platform: 'reddit', category: 'business' },
  { title: 'Reddit - Science', url: 'https://www.reddit.com/r/science/top/.rss?t=day', platform: 'reddit', category: 'science' },

  // ===== Twitter/X (via RSSHub pseudoyu instance) =====
  { title: 'X - Elon Musk', url: `${RSSHUB}/twitter/user/elonmusk`, platform: 'twitter', category: 'tech' },
  { title: 'X - OpenAI', url: `${RSSHUB}/twitter/user/OpenAI`, platform: 'twitter', category: 'ai' },
  { title: 'X - Andrej Karpathy', url: `${RSSHUB}/twitter/user/karpathy`, platform: 'twitter', category: 'ai' },
  { title: 'X - 宝玉xp', url: `${RSSHUB}/twitter/user/dotey`, platform: 'twitter', category: 'ai' },

  // ===== 小红书 & 微信 =====
  // Public RSSHub instances have blocked these platforms.
  // To enable, self-host RSSHub with cookies configured:
  //   docker run -d -p 1200:1200 diygod/rsshub
  // Then set RSSHUB_SELF_HOSTED=http://localhost:1200 in .env
  // Uncomment below after self-hosting:
  // { title: '小红书 - AI探索', url: '{SELF_RSSHUB}/xiaohongshu/user/xxx/notes', platform: 'xiaohongshu', category: 'ai' },
  // { title: '微信 - 量子位', url: '{SELF_RSSHUB}/wechat/mp/xxx', platform: 'wechat', category: 'ai' },

  // ===== Hacker News (reliable backup) =====
  { title: 'Hacker News - Best', url: 'https://hnrss.org/best', platform: 'hackernews', category: 'tech' },

  // ===== Tech blogs (high quality, always work) =====
  { title: '阮一峰的网络日志', url: 'https://www.ruanyifeng.com/blog/atom.xml', platform: 'blog', category: 'tech' },
  { title: 'Paul Graham Essays', url: 'http://www.aaronsw.com/2002/feeds/pgessays.rss', platform: 'blog', category: 'business' },
];

export function seedFeeds() {
  const db = getDb();

  const insert = db.prepare(`
    INSERT OR IGNORE INTO feeds (title, url, type, platform, category)
    VALUES (?, ?, 'rss', ?, ?)
  `);

  const insertAll = db.transaction((feeds: SeedFeed[]) => {
    let count = 0;
    for (const feed of feeds) {
      const result = insert.run(feed.title, feed.url, feed.platform, feed.category);
      if (result.changes > 0) count++;
    }
    return count;
  });

  const added = insertAll(SEED_FEEDS);
  db.close();

  console.log(`🌱 种子数据: 新增 ${added} 个信息源（共 ${SEED_FEEDS.length} 个）`);
  return { added, total: SEED_FEEDS.length };
}
