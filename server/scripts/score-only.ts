/**
 * AI 评分
 * 用法:
 *   npx tsx scripts/score-only.ts          # 默认评 10 篇（debug 快速验证）
 *   npx tsx scripts/score-only.ts -n 50    # 评 50 篇
 *   npx tsx scripts/score-only.ts --all    # 评所有未评分文章
 */
import 'dotenv/config';
import { initDb } from '../src/db/schema.js';
import { scoreUnratedArticles } from '../src/services/ai.js';

initDb();

const args = process.argv.slice(2);
const all = args.includes('--all');
const limit = args.includes('-n')
  ? parseInt(args[args.indexOf('-n') + 1]) || 10
  : all ? 9999 : 10;

async function main() {
  const start = Date.now();
  console.log(`\n========== AI 评分 ${all ? '(全量)' : `(${limit}篇)`} ==========`);
  const results = await scoreUnratedArticles(limit);
  const sec = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ 完成，${results.length} 篇��耗时 ${sec}s。用 stats.ts 查看分布\n`);
}

main().catch(console.error);
