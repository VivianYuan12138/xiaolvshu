import { getDb } from './schema.js';

interface SeedFeed {
  title: string;
  url: string;
  platform: string;
  category: string;
}

const RSSHUB = 'https://rsshub.pseudoyu.com';

const SEED_FEEDS: SeedFeed[] = [
  // ===== 高质量 Newsletter RSS（已经是编辑精选过的，内容完整） =====
  { title: 'TLDR AI', url: 'https://bullrich.dev/tldr-rss/ai.rss', platform: 'newsletter', category: 'ai' },
  { title: 'The Rundown AI', url: 'https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml', platform: 'newsletter', category: 'ai' },
  { title: 'TLDR Tech', url: 'https://bullrich.dev/tldr-rss/tech.rss', platform: 'newsletter', category: 'tech' },

  // ===== GitHub Trending（开源动态，信息密度高） =====
  { title: 'GitHub Trending - Python', url: 'https://mshibanami.github.io/GitHubTrendingRSS/daily/python.xml', platform: 'github', category: 'tech' },
  { title: 'GitHub Trending - All', url: 'https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml', platform: 'github', category: 'tech' },
  { title: 'GitHub Trending - TypeScript', url: 'https://mshibanami.github.io/GitHubTrendingRSS/daily/typescript.xml', platform: 'github', category: 'tech' },

  // ===== Product Hunt（新产品发现） =====
  { title: 'Product Hunt', url: 'https://www.producthunt.com/feed', platform: 'producthunt', category: 'product' },

  // ===== Hacker News（技术社区讨论） =====
  { title: 'Hacker News - Best', url: 'https://hnrss.org/best?count=30', platform: 'hackernews', category: 'tech' },
  { title: 'Hacker News - Show HN', url: 'https://hnrss.org/show?count=20', platform: 'hackernews', category: 'product' },

  // ===== Reddit（话题深度讨论） =====
  { title: 'Reddit - Technology', url: 'https://www.reddit.com/r/technology/top/.rss?t=day', platform: 'reddit', category: 'tech' },
  { title: 'Reddit - Machine Learning', url: 'https://www.reddit.com/r/MachineLearning/top/.rss?t=day', platform: 'reddit', category: 'ai' },
  { title: 'Reddit - LocalLLaMA', url: 'https://www.reddit.com/r/LocalLLaMA/top/.rss?t=day', platform: 'reddit', category: 'ai' },

  // ===== Twitter/X（一手信息） =====
  { title: 'X - OpenAI', url: `${RSSHUB}/twitter/user/OpenAI`, platform: 'twitter', category: 'ai' },
  { title: 'X - Andrej Karpathy', url: `${RSSHUB}/twitter/user/karpathy`, platform: 'twitter', category: 'ai' },
  { title: 'X - 宝玉xp', url: `${RSSHUB}/twitter/user/dotey`, platform: 'twitter', category: 'ai' },

  // ===== 中文科技媒体 =====
  { title: '36氪 - 最新', url: `${RSSHUB}/36kr/news/latest`, platform: 'media', category: 'business' },
  { title: '少数派', url: 'https://sspai.com/feed', platform: 'media', category: 'tech' },
  { title: '阮一峰的网络日志', url: 'https://www.ruanyifeng.com/blog/atom.xml', platform: 'blog', category: 'tech' },

  // ===== 小红书 & 微信（需自建 RSSHub） =====
  // { title: '小红书 - AI', url: '{SELF_RSSHUB}/xiaohongshu/user/xxx/notes', platform: 'xiaohongshu', category: 'ai' },
  // { title: '微信 - 量子位', url: '{SELF_RSSHUB}/wechat/mp/xxx', platform: 'wechat', category: 'ai' },
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
