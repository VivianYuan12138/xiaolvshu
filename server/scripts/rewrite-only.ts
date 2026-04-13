/**
 * 只跑改写，不抓取不评分（需要先评过分）
 * 用法:
 *   npx tsx scripts/rewrite-only.ts          # 改写所有待改写文章
 *   npx tsx scripts/rewrite-only.ts -n 5     # 只改5篇（试试效果）
 */
import 'dotenv/config';
import { initDb } from '../src/db/schema.js';
import { rewriteUnprocessedArticles } from '../src/services/author-agent.js';

initDb();

const args = process.argv.slice(2);
const batchSize = args.includes('-n') ? parseInt(args[args.indexOf('-n') + 1]) || 15 : 15;

async function main() {
  console.log('\n========== 只跑 AI 改写 ==========');
  let round = 1;
  let total = 0;
  while (true) {
    const results = await rewriteUnprocessedArticles(batchSize);
    if (results.length === 0) break;
    const ok = results.filter(r => !('error' in r)).length;
    total += ok;
    console.log(`  第${round}轮: ${ok}/${results.length}，累计 ${total} 篇`);
    round++;
  }
  console.log(`\n✅ 改写完成，共 ${total} 篇。用 show-articles.ts 查看质量\n`);
}

main().catch(console.error);
