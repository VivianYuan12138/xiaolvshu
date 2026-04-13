/**
 * 只跑评分，不抓取不改写
 * 用法:
 *   npx tsx scripts/score-only.ts          # 评分所有未评分文章
 *   npx tsx scripts/score-only.ts -n 10    # 只评10篇
 */
import 'dotenv/config';
import { initDb } from '../src/db/schema.js';
import { scoreUnratedArticles } from '../src/services/ai.js';

initDb();

const args = process.argv.slice(2);
const batchSize = args.includes('-n') ? parseInt(args[args.indexOf('-n') + 1]) || 30 : 30;

async function main() {
  console.log('\n========== 只跑 AI 评分 ==========');
  let round = 1;
  let total = 0;
  while (true) {
    const results = await scoreUnratedArticles(batchSize);
    if (results.length === 0) break;
    total += results.length;
    console.log(`  第${round}轮完成，累计 ${total} 篇`);
    round++;
  }
  console.log(`\n✅ 评分完成，共 ${total} 篇。用 stats.ts 查看分布\n`);
}

main().catch(console.error);
