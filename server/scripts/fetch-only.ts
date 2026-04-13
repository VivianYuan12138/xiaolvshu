/**
 * 只抓取 RSS，不评分不改写
 * 用法: npx tsx scripts/fetch-only.ts
 */
import 'dotenv/config';
import { initDb } from '../src/db/schema.js';
import { seedFeeds } from '../src/db/seeds.js';
import { fetchAllFeeds } from '../src/services/rss.js';

initDb();
seedFeeds();

async function main() {
  console.log('\n========== 只抓取 RSS ==========');
  await fetchAllFeeds();
  console.log('\n✅ 抓取完成，可以用 stats.ts 查看数据\n');
}

main().catch(console.error);
